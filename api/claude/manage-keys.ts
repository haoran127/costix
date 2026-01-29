import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest, verifyTenantAccess } from '../_lib/auth.js';

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
      admin_key,
      platform_account_id,
      api_key,
      name,
      business,
      description,
      api_key_id,
      db_key_id,
      owner_name,
      owner_email,
      owner_phone,
    } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: '缺少 action 参数（import/delete/update/verify）' });
    }

    // 如果 action 是 create，不支持
    if (action === 'create') {
      return res.status(400).json({
        success: false,
        error: 'Claude Admin API 不支持创建 API Key。请在 Claude Console (https://console.anthropic.com) 手动创建后，使用 import 操作导入。',
      });
    }

    let adminKey = admin_key;

    // 如果没有提供 admin_key，从数据库获取
    if (!adminKey && platform_account_id) {
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

      if (account.platform !== 'anthropic') {
        return res.status(400).json({ success: false, error: '平台类型不匹配' });
      }

      adminKey = account.admin_api_key_encrypted;
    }

    // import 操作
    if (action === 'import') {
      if (!api_key || !api_key.startsWith('sk-ant-api')) {
        return res.status(400).json({ success: false, error: '导入需要提供有效的 api_key（以 sk-ant-api 开头）' });
      }

      // 验证 API Key
      const verifyResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': api_key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      const verifyData = await verifyResponse.json();
      if (verifyResponse.status !== 200 && verifyData.error) {
        const errorType = verifyData.error.type || '';
        // rate_limit 说明 key 是有效的
        if (errorType !== 'rate_limit_error' && errorType !== 'overloaded_error') {
          return res.status(400).json({
            success: false,
            error: `API Key 无效: ${verifyData.error.message || '验证失败'}`,
          });
        }
      }

      // Key 有效，保存到数据库（明确设置 created_by 和 tenant_id）
      const keyPrefix = api_key.substring(0, 12);
      const keySuffix = api_key.slice(-4);
      const keyName = name || `imported-${keySuffix}`;

      const { data: dbData, error: dbError } = await supabase
        .from('llm_api_keys')
        .insert({
          name: keyName,
          platform: 'anthropic',
          api_key_encrypted: api_key,
          api_key_prefix: keyPrefix,
          api_key_suffix: keySuffix,
          status: 'active',
          business: business || null,
          description: description || null,
          platform_account_id: platform_account_id || null,
          owner_name: owner_name || null,
          owner_email: owner_email || null,
          owner_phone: owner_phone || null,
          creation_method: 'import',
          created_by: userInfo.userId, // 设置创建者
          tenant_id: userInfo.tenantId, // 设置租户 ID
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

      return res.status(200).json({
        success: true,
        action: 'import',
        message: 'API Key 导入成功',
        id: dbData.id,
        key: {
          name: keyName,
          api_key_prefix: keyPrefix,
          api_key_suffix: keySuffix,
        },
      });
    }

    // 其他操作需要 admin_key
    if (!adminKey || !adminKey.startsWith('sk-ant-admin')) {
      return res.status(400).json({ success: false, error: 'Admin Key 格式不正确' });
    }

    // delete 操作
    if (action === 'delete') {
      if (!api_key_id) {
        return res.status(400).json({ success: false, error: '需要提供 api_key_id' });
      }

      // 如果有数据库 ID，先验证权限
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
        }
      }

      const deleteResponse = await fetch(`https://api.anthropic.com/v1/organizations/api_keys/${api_key_id}`, {
        method: 'POST',
        headers: {
          'x-api-key': adminKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'inactive' }),
      });

      const deleteData = await deleteResponse.json();

      if (deleteResponse.status !== 200 && deleteData.error) {
        if (deleteData.error.type === 'not_found_error') {
          // Key 已不存在，继续删除数据库记录
        } else {
          return res.status(deleteResponse.status || 400).json({
            success: false,
            error: deleteData.error.message || '禁用失败',
          });
        }
      }

      // 删除数据库记录
      if (db_key_id) {
        await supabase.from('llm_api_keys').delete().eq('id', db_key_id);
      }

      return res.status(200).json({
        success: true,
        action: 'delete',
        message: 'API Key 已禁用',
        api_key_id,
      });
    }

    // update 操作
    if (action === 'update') {
      if (!api_key_id) {
        return res.status(400).json({ success: false, error: '需要提供 api_key_id' });
      }

      const updateBody: any = {};
      if (name) updateBody.name = name;
      if (business !== undefined) updateBody.business = business;
      if (description !== undefined) updateBody.description = description;

      if (db_key_id) {
        const { error: updateError } = await supabase
          .from('llm_api_keys')
          .update({
            ...updateBody,
            updated_at: new Date().toISOString(),
          })
          .eq('id', db_key_id);

        if (updateError) {
          return res.status(500).json({
            success: false,
            error: `更新数据库失败: ${updateError.message}`,
          });
        }
      }

      return res.status(200).json({
        success: true,
        action: 'update',
        message: 'API Key 已更新',
        api_key_id,
      });
    }

    // verify 操作
    if (action === 'verify') {
      if (!api_key) {
        return res.status(400).json({ success: false, error: '验证需要提供 api_key' });
      }

      const verifyResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': api_key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      const verifyData = await verifyResponse.json();
      if (verifyResponse.status === 200) {
        return res.status(200).json({
          success: true,
          action: 'verify',
          message: 'API Key 有效',
        });
      } else {
        const errorType = verifyData.error?.type || '';
        if (errorType === 'rate_limit_error' || errorType === 'overloaded_error') {
          return res.status(200).json({
            success: true,
            action: 'verify',
            message: 'API Key 有效（遇到限流）',
          });
        }
        return res.status(400).json({
          success: false,
          error: `API Key 无效: ${verifyData.error?.message || '验证失败'}`,
        });
      }
    }

    return res.status(400).json({ success: false, error: `不支持的操作: ${action}` });
  } catch (error) {
    console.error('Claude manage-keys 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '操作失败',
    });
  }
}

