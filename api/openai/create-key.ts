import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../_lib/auth';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kstwkcdmqzvhzjhnaopw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 验证用户身份并获取租户信息
    const userInfo = await getUserFromRequest(req);
    if (!userInfo) {
      return res.status(401).json({ success: false, error: '未授权：请提供有效的认证 token' });
    }

    const {
      admin_key,
      organization_id,
      project_id,
      name,
      business,
      owner_name,
      owner_email,
      owner_phone,
      expires_at,
      platform_account_id,
    } = req.body;

    // 如果没有提供 admin_key，从数据库获取
    let adminKey = admin_key;
    let projectId = project_id;
    
    if (!adminKey && platform_account_id) {
      const { data: account, error: accountError } = await supabase
        .from('llm_platform_accounts')
        .select('admin_api_key_encrypted, project_id, organization_id, status, platform')
        .eq('id', platform_account_id)
        .single();

      if (accountError || !account) {
        return res.status(400).json({ success: false, error: '未找到平台账号或该账号没有配置 Admin Key' });
      }

      if (account.status !== 'active') {
        return res.status(400).json({ success: false, error: `平台账号状态异常: ${account.status}` });
      }

      if (account.platform !== 'openai') {
        return res.status(400).json({ success: false, error: '平台类型不匹配，期望 openai' });
      }

      adminKey = account.admin_api_key_encrypted;
      // 如果请求中没有提供 project_id，使用账号配置的 project_id
      if (!projectId && account.project_id) {
        projectId = account.project_id;
      }
    }

    // 获取最终的 organization_id（优先使用请求中的，否则使用账号配置的）
    let finalOrganizationId = organization_id;
    if (!finalOrganizationId && platform_account_id) {
      const { data: account } = await supabase
        .from('llm_platform_accounts')
        .select('organization_id')
        .eq('id', platform_account_id)
        .single();
      if (account?.organization_id) {
        finalOrganizationId = account.organization_id;
      }
    }

    // 验证必需参数
    if (!adminKey) {
      return res.status(400).json({ success: false, error: '缺少 Admin Key，请提供 admin_key 或 platform_account_id' });
    }
    if (!projectId) {
      return res.status(400).json({ success: false, error: '缺少 Project ID' });
    }
    if (!name) {
      return res.status(400).json({ success: false, error: '请填写 Key 名称' });
    }

    // 调用 OpenAI API 创建 Service Account
    const openaiResponse = await fetch(
      `https://api.openai.com/v1/organization/projects/${projectId}/service_accounts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      }
    );

    const openaiData = await openaiResponse.json();

    // 检查 OpenAI API 错误
    if (!openaiResponse.ok || openaiData.error) {
      let errorMsg = openaiData.error?.message || 'OpenAI API 调用失败';
      const errorCode = openaiData.error?.code || openaiData.error?.type;
      const errMessage = (openaiData.error?.message || '').toLowerCase();

      // 提供更友好的错误提示
      if (errMessage.includes('missing scopes') || errMessage.includes('api.management.write')) {
        errorMsg = 'Admin Key 权限不足：缺少 api.management.write 权限。请到 OpenAI 后台创建一个有完整管理权限的 API Key';
      } else if (errMessage.includes('insufficient permissions')) {
        errorMsg = 'Admin Key 权限不足，请确保使用有完整权限的 API Key';
      } else if (errorCode === 'insufficient_quota') {
        errorMsg = '账户额度不足';
      } else if (errorCode === 'invalid_api_key') {
        errorMsg = 'Admin Key 无效或已过期';
      } else if (errorCode === 'permission_denied' || errorCode === 'access_denied') {
        errorMsg = '权限不足，请确保 Admin Key 有创建 Service Account 的权限';
      } else if (errorCode === 'organization_not_found') {
        errorMsg = '组织不存在';
      } else if (errorCode === 'project_not_found') {
        errorMsg = '项目不存在，请检查 Project ID';
      } else if (openaiResponse.status === 404) {
        errorMsg = '项目不存在或无权访问';
      } else if (openaiResponse.status === 401) {
        errorMsg = 'Admin Key 认证失败';
      } else if (openaiResponse.status === 403) {
        errorMsg = '权限不足，需要 Organization Owner 或 Project Owner 权限';
      }

      return res.status(openaiResponse.status || 400).json({
        success: false,
        error: errorMsg,
        code: errorCode,
      });
    }

    // 检查返回的 API Key
    const apiKey = openaiData.api_key;
    if (!apiKey || !apiKey.value) {
      return res.status(500).json({
        success: false,
        error: '创建失败，未返回 API Key 信息',
      });
    }

    const fullKey = apiKey.value;
    const keyPrefix = fullKey.substring(0, 12);
    const keySuffix = fullKey.slice(-4);

    // 保存到数据库（明确设置 created_by 和 tenant_id）
    const { data: dbData, error: dbError } = await supabase
      .from('llm_api_keys')
      .insert({
        name,
        platform: 'openai',
        platform_key_id: apiKey.name || openaiData.id,
        platform_account_id: platform_account_id || null,
        project_id: projectId,
        organization_id: finalOrganizationId || null,
        api_key_encrypted: fullKey,
        api_key_prefix: keyPrefix,
        api_key_suffix: keySuffix,
        status: 'active',
        business: business || null,
        owner_name: owner_name || null,
        owner_email: owner_email || null,
        owner_phone: owner_phone || null,
        expires_at: expires_at || null,
        creation_method: 'api',
        created_by: userInfo.userId, // 设置创建者
        tenant_id: userInfo.tenantId, // 设置租户 ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('保存到数据库失败:', dbError);
      return res.status(500).json({
        success: false,
        error: `保存到数据库失败: ${dbError.message}`,
      });
    }

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: `API Key "${name}" 创建成功`,
      id: dbData.id,
      name,
      api_key: fullKey,
      masked_key: `${keyPrefix}****${keySuffix}`,
      platform: 'openai',
      project_id,
      business,
      created_at: openaiData.created_at
        ? new Date(openaiData.created_at * 1000).toISOString()
        : new Date().toISOString(),
      warning: '请妥善保存此 API Key，它只会显示一次！',
    });
  } catch (error) {
    console.error('创建 OpenAI Key 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建失败',
    });
  }
}

