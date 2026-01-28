import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kstwkcdmqzvhzjhnaopw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      action,
      admin_key,
      platform_account_id,
      name,
      limit,
      limit_reset,
      expires_at,
      key_hash,
      disabled,
      db_key_id,
      business,
      description,
      owner_name,
      owner_email,
      owner_phone,
    } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: '缺少 action 参数（list/create/delete/update/sync/credits）',
      });
    }

    const validActions = ['list', 'create', 'delete', 'update', 'sync', 'credits'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `无效的 action，支持: ${validActions.join(', ')}`,
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

      if (accountError || !account || !account.admin_api_key_encrypted) {
        return res.status(400).json({ success: false, error: '未找到平台账号或该账号没有配置 Admin Key' });
      }

      if (account.status !== 'active') {
        return res.status(400).json({ success: false, error: `平台账号状态异常: ${account.status}` });
      }

      if (account.platform !== 'openrouter') {
        return res.status(400).json({
          success: false,
          error: `平台类型不匹配，期望 openrouter，实际 ${account.platform}`,
        });
      }

      adminKey = account.admin_api_key_encrypted;
    }

    if (!adminKey || !adminKey.startsWith('sk-or-')) {
      return res.status(400).json({ success: false, error: 'Admin Key 格式不正确，需要以 sk-or- 开头' });
    }

    // list 操作
    if (action === 'list') {
      const listResponse = await fetch('https://openrouter.ai/api/v1/keys', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });

      const listData = await listResponse.json();

      if (!listResponse.ok || listData.error) {
        return res.status(listResponse.status || 400).json({
          success: false,
          error: listData.error?.message || '获取列表失败',
        });
      }

      const keys = listData.data || [];
      return res.status(200).json({
        success: true,
        action: 'list',
        count: keys.length,
        keys: keys.map((k: any) => ({
          hash: k.hash,
          name: k.name,
          label: k.label,
          disabled: k.disabled,
          limit: k.limit,
          limit_remaining: k.limit_remaining,
          limit_reset: k.limit_reset,
          usage: k.usage,
          usage_daily: k.usage_daily,
          usage_weekly: k.usage_weekly,
          usage_monthly: k.usage_monthly,
          created_at: k.created_at,
          updated_at: k.updated_at,
          expires_at: k.expires_at,
        })),
      });
    }

    // create 操作
    if (action === 'create') {
      if (!name) {
        return res.status(400).json({ success: false, error: '创建 Key 需要提供 name' });
      }

      const createBody: any = { name };
      if (limit !== undefined) createBody.limit = limit;
      if (limit_reset !== undefined) createBody.limit_reset = limit_reset;
      if (expires_at !== undefined) createBody.expires_at = expires_at;

      const createResponse = await fetch('https://openrouter.ai/api/v1/keys', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBody),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok || createData.error) {
        return res.status(createResponse.status || 400).json({
          success: false,
          error: createData.error?.message || '创建失败',
        });
      }

      const keyData = createData.data || createData.body || createData;
      const fullKey = keyData.key || keyData.data?.key || createData.key || '';

      if (!fullKey) {
        return res.status(500).json({
          success: false,
          error: '创建成功但未返回完整 Key',
        });
      }

      const keyPrefix = fullKey.substring(0, 12);
      const keySuffix = fullKey.slice(-4);

      // 保存到数据库（明确设置 created_by 和 tenant_id）
      const { data: dbData, error: dbError } = await supabase
        .from('llm_api_keys')
        .insert({
          name,
          platform: 'openrouter',
          api_key_encrypted: fullKey,
          api_key_prefix: keyPrefix,
          api_key_suffix: keySuffix,
          platform_key_id: keyData.hash,
          status: 'active',
          business: business || null,
          description: description || null,
          platform_account_id: platform_account_id || null,
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
        return res.status(500).json({
          success: false,
          error: `保存到数据库失败: ${dbError.message}`,
        });
      }

      return res.status(200).json({
        success: true,
        action: 'create',
        message: 'API Key 创建成功',
        id: dbData.id,
        key: {
          hash: keyData.hash,
          name,
          label: keyData.label,
          full_key: fullKey,
          api_key_prefix: keyPrefix,
          api_key_suffix: keySuffix,
        },
      });
    }

    // delete 操作
    if (action === 'delete') {
      if (!key_hash) {
        return res.status(400).json({ success: false, error: '删除需要提供 key_hash' });
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

      const deleteResponse = await fetch(`https://openrouter.ai/api/v1/keys/${key_hash}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });

      const deleteData = await deleteResponse.json();

      if (!deleteResponse.ok && deleteData.error) {
        if (deleteData.error.code === 404 || deleteData.error.message?.includes('not found')) {
          // Key 已不存在，继续删除数据库记录
        } else {
          return res.status(deleteResponse.status || 400).json({
            success: false,
            error: deleteData.error.message || '删除失败',
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
        message: 'API Key 已删除',
        key_hash,
      });
    }

    // update 操作
    if (action === 'update') {
      if (!key_hash) {
        return res.status(400).json({ success: false, error: '更新需要提供 key_hash' });
      }

      const updateBody: any = {};
      if (name !== undefined) updateBody.name = name;
      if (disabled !== undefined) updateBody.disabled = disabled;
      if (limit !== undefined) updateBody.limit = limit;
      if (limit_reset !== undefined) updateBody.limit_reset = limit_reset;
      if (expires_at !== undefined) updateBody.expires_at = expires_at;

      const updateResponse = await fetch(`https://openrouter.ai/api/v1/keys/${key_hash}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateBody),
      });

      const updateData = await updateResponse.json();

      if (!updateResponse.ok || updateData.error) {
        return res.status(updateResponse.status || 400).json({
          success: false,
          error: updateData.error?.message || '更新失败',
        });
      }

      // 更新数据库记录
      if (db_key_id) {
        const dbUpdate: any = {
          updated_at: new Date().toISOString(),
        };
        if (name !== undefined) dbUpdate.name = name;
        if (business !== undefined) dbUpdate.business = business;
        if (description !== undefined) dbUpdate.description = description;

        await supabase.from('llm_api_keys').update(dbUpdate).eq('id', db_key_id);
      }

      return res.status(200).json({
        success: true,
        action: 'update',
        message: 'API Key 已更新',
        key_hash,
      });
    }

    return res.status(400).json({ success: false, error: `不支持的操作: ${action}` });
  } catch (error) {
    console.error('OpenRouter manage-keys 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '操作失败',
    });
  }
}

