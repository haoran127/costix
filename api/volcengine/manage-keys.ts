import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest, verifyTenantAccess } from '../_lib/auth';
import { generateVolcengineSignature } from '../_lib/volcengine-signature';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kstwkcdmqzvhzjhnaopw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 验证用户身份
    const userInfo = await getUserFromRequest(req);
    if (!userInfo) {
      return res.status(401).json({ success: false, error: '未授权：请提供有效的认证 token' });
    }

    const {
      action,
      access_key_id,
      secret_access_key,
      platform_account_id,
      user_name,
      target_access_key_id,
      key_name,
      business,
      owner_name,
      owner_email,
      owner_phone,
      db_key_id,
    } = req.body;

    // 验证必需参数
    if (!action) {
      return res.status(400).json({ success: false, error: '缺少 action 参数（create/delete/list）' });
    }

    const validActions = ['create', 'delete', 'list'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, error: 'action 必须是 create/delete/list 之一' });
    }

    let adminAccessKeyId = access_key_id;
    let adminSecretAccessKey = secret_access_key;

    // 如果没有提供 admin key，从数据库获取
    if ((!adminAccessKeyId || !adminSecretAccessKey) && platform_account_id) {
      const { data: account, error: accountError } = await supabase
        .from('llm_platform_accounts')
        .select('admin_api_key_encrypted, status, platform')
        .eq('id', platform_account_id)
        .single();

      if (accountError || !account) {
        return res.status(400).json({ success: false, error: '未找到平台账号或该账号没有配置 Admin Key' });
      }

      if (account.status !== 'active') {
        return res.status(400).json({ success: false, error: `平台账号状态异常: ${account.status}` });
      }

      if (account.platform !== 'volcengine') {
        return res.status(400).json({ success: false, error: '平台类型不匹配，期望 volcengine' });
      }

      // 火山引擎的 admin_api_key_encrypted 格式为 "access_key_id:secret_access_key"
      const parts = account.admin_api_key_encrypted.split(':');
      if (parts.length !== 2) {
        return res.status(400).json({ success: false, error: 'Admin Key 格式错误，应为 "AK:SK" 格式' });
      }

      adminAccessKeyId = parts[0];
      adminSecretAccessKey = parts[1];
    }

    if (!adminAccessKeyId || !adminSecretAccessKey) {
      return res.status(400).json({ success: false, error: '缺少 Admin Key（access_key_id 和 secret_access_key）' });
    }

    // 根据 action 验证额外参数
    if (action === 'create' && !user_name) {
      return res.status(400).json({ success: false, error: '创建 Key 需要提供 user_name (IAM 用户名)' });
    }

    if (action === 'delete' && !target_access_key_id) {
      return res.status(400).json({ success: false, error: '删除 Key 需要提供 target_access_key_id' });
    }

    // API 参数映射
    const actionMap: Record<string, string> = {
      create: 'CreateAccessKey',
      delete: 'DeleteAccessKey',
      list: 'ListAccessKeys',
    };

    const apiAction = actionMap[action];
    const service = 'iam';
    const region = 'cn-north-1';
    const host = 'iam.volcengineapi.com';
    const method = 'GET';

    // 构建查询参数
    const queryParams: Record<string, string> = {
      Action: apiAction,
      Version: '2018-01-01',
    };

    // 根据 action 添加额外参数
    if (action === 'create' && user_name) {
      queryParams.UserName = user_name;
    }
    if (action === 'delete' && target_access_key_id) {
      queryParams.AccessKeyId = target_access_key_id;
      if (user_name) {
        queryParams.UserName = user_name;
      }
    }
    if (action === 'list' && user_name) {
      queryParams.UserName = user_name;
    }

    // 生成签名
    const signature = generateVolcengineSignature({
      accessKeyId: adminAccessKeyId,
      secretAccessKey: adminSecretAccessKey,
      service,
      region,
      host,
      method,
      path: '/',
      queryParams,
    });

    // 调用火山引擎 API
    const apiResponse = await fetch(signature.requestUrl, {
      method,
      headers: {
        Authorization: signature.authorization,
        'X-Date': signature.xDate,
        Host: signature.host,
        'Content-Type': 'application/json',
      },
    });

    const apiData = await apiResponse.json();

    // 检查 API 错误
    if (apiData.ResponseMetadata && apiData.ResponseMetadata.Error) {
      const err = apiData.ResponseMetadata.Error;
      let errorMsg = err.Message || '火山引擎 API 调用失败';

      // 友好错误提示
      if (err.Code === 'InvalidAccessKeyId') {
        errorMsg = 'AccessKeyId 无效或不存在';
      } else if (err.Code === 'SignatureDoesNotMatch') {
        errorMsg = '签名验证失败，请检查 SecretAccessKey 是否正确';
      } else if (err.Code === 'NoSuchEntity') {
        errorMsg = '用户或 AccessKey 不存在';
      } else if (err.Code === 'LimitExceeded') {
        errorMsg = 'AccessKey 数量已达上限';
      } else if (err.Code === 'AccessDenied') {
        errorMsg = '权限不足，请检查 Admin Key 权限';
      }

      return res.status(400).json({
        success: false,
        error: errorMsg,
        code: err.Code,
      });
    }

    // 处理成功响应
    if (action === 'create') {
      const result = apiData.Result || {};
      const accessKey = result.AccessKey || {};

      if (!accessKey.AccessKeyId) {
        return res.status(500).json({ success: false, error: '创建失败，未返回 AccessKey 信息' });
      }

      const fullAK = accessKey.AccessKeyId;
      const fullSK = accessKey.SecretAccessKey || '';
      const keyPrefix = fullAK.substring(0, 8);
      const keySuffix = fullAK.slice(-4);

      // 保存到数据库
      const { data: dbData, error: dbError } = await supabase
        .from('llm_api_keys')
        .insert({
          name: key_name || user_name,
          platform: 'volcengine',
          platform_key_id: fullAK,
          platform_account_id: platform_account_id || null,
          api_key_encrypted: `${fullAK}:${fullSK}`,
          api_key_prefix: keyPrefix,
          api_key_suffix: keySuffix,
          status: accessKey.Status === 'Active' ? 'active' : 'disabled',
          business: business || null,
          owner_name: owner_name || null,
          owner_email: owner_email || null,
          owner_phone: owner_phone || null,
          creation_method: 'api',
          created_by: userInfo.userId,
          tenant_id: userInfo.tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        return res.status(500).json({
          success: false,
          error: `保存到数据库失败: ${dbError.message}`,
        });
      }

      // 如果有责任人，创建绑定关系
      if (userInfo.userId && dbData?.id) {
        await supabase.from('llm_api_key_owners').insert({
          api_key_id: dbData.id,
          user_id: userInfo.userId,
          is_primary: true,
          role: 'owner',
        });
      }

      return res.status(200).json({
        success: true,
        message: `AccessKey "${key_name || user_name}" 创建成功`,
        id: dbData.id,
        name: key_name || user_name,
        access_key_id: fullAK,
        secret_access_key: fullSK,
        masked_key: `${keyPrefix}****${keySuffix}`,
        platform: 'volcengine',
        user_name,
        business,
        created_at: accessKey.CreateDate || new Date().toISOString(),
        warning: '请妥善保存 SecretAccessKey，它只会显示一次！',
      });
    }

    if (action === 'delete') {
      // 如果有数据库 ID，验证权限并删除数据库记录
      if (db_key_id) {
        const { data: keyData, error: keyError } = await supabase
          .from('llm_api_keys')
          .select('tenant_id, created_by')
          .eq('id', db_key_id)
          .single();

        if (!keyError && keyData) {
          const hasPermission =
            keyData.created_by === userInfo.userId ||
            (keyData.tenant_id && (await verifyTenantAccess(userInfo.userId, keyData.tenant_id)));

          if (!hasPermission) {
            return res.status(403).json({
              success: false,
              error: '无权删除此 API Key',
            });
          }

          // 删除责任人关联
          await supabase.from('llm_api_key_owners').delete().eq('api_key_id', db_key_id);

          // 删除用量记录
          await supabase.from('llm_api_key_usage').delete().eq('api_key_id', db_key_id);

          // 删除 Key 记录
          await supabase.from('llm_api_keys').delete().eq('id', db_key_id);
        }
      }

      return res.status(200).json({
        success: true,
        message: `AccessKey "${target_access_key_id}" 已完全删除`,
        target_access_key_id,
        db_deleted: !!db_key_id,
        volcengine_deleted: true,
      });
    }

    if (action === 'list') {
      const result = apiData.Result || {};
      const accessKeys = result.AccessKeyMetadata || [];

      const formattedKeys = accessKeys.map((key: any) => ({
        access_key_id: key.AccessKeyId,
        status: key.Status,
        user_name: key.UserName,
        create_date: key.CreateDate,
        update_date: key.UpdateDate,
      }));

      return res.status(200).json({
        success: true,
        action: 'list',
        keys: formattedKeys,
        total: formattedKeys.length,
      });
    }

    return res.status(400).json({ success: false, error: '未知操作' });
  } catch (error) {
    console.error('火山引擎 manage-keys 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '操作失败',
    });
  }
}

