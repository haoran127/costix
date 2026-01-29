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

  // 用户认证（sync 和 credits 操作需要认证）
  const userInfo = await getUserFromRequest(req);
  if (!userInfo) {
    return res.status(401).json({ success: false, error: '未授权，请先登录' });
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

    // sync 操作 - 同步 Keys 列表和用量数据
    if (action === 'sync') {
      // 1. 获取 Keys 列表
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
          error: listData.error?.message || '获取 Keys 列表失败',
        });
      }

      const keys = listData.data || [];
      if (keys.length === 0) {
        return res.status(200).json({
          success: true,
          action: 'sync',
          keys_count: 0,
          keys: [],
          synced_at: new Date().toISOString(),
        });
      }

      // 2. 查询数据库中的 Keys 映射
      let dbKeysQuery = supabase
        .from('llm_api_keys')
        .select('id, platform_key_id, name')
        .eq('platform', 'openrouter');

      if (platform_account_id) {
        dbKeysQuery = dbKeysQuery.eq('platform_account_id', platform_account_id);
      }

      const { data: dbKeys, error: dbError } = await dbKeysQuery;

      if (dbError) {
        console.error('[openrouter/sync] 查询数据库 Keys 失败:', dbError);
        return res.status(500).json({
          success: false,
          error: `查询数据库 Keys 失败: ${dbError.message}`,
        });
      }

      // 3. 创建 platform_key_id -> db_id 映射
      const keyIdMap = new Map<string, { id: string; name: string }>();
      (dbKeys || []).forEach((k: any) => {
        if (k.platform_key_id) {
          keyIdMap.set(k.platform_key_id, { id: k.id, name: k.name });
        }
      });

      // 4. 解析 label 格式: sk-or-v1-1d8...cde
      const parseLabel = (label: string) => {
        if (!label) return { prefix: 'sk-or-v1-', suffix: '****' };
        const parts = label.split('...');
        if (parts.length === 2) {
          return { prefix: parts[0], suffix: parts[1] };
        }
        return { prefix: label.substring(0, 12), suffix: label.slice(-4) };
      };

      // 5. 分离新 Keys 和已有 Keys
      const nowISO = new Date().toISOString();
      const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
        .toISOString()
        .split('T')[0];

      const keysToCreate: any[] = [];
      const keysToUpdate: any[] = [];
      const usageRecords: any[] = [];

      keys.forEach((k: any) => {
        const parsed = parseLabel(k.label || '');
        const existing = keyIdMap.get(k.hash);

        // 调试：记录 OpenRouter API 返回的原始数据
        console.log(`[openrouter/sync] Key ${k.hash} (${k.name}):`, {
          usage: k.usage,
          usage_daily: k.usage_daily,
          usage_weekly: k.usage_weekly,
          usage_monthly: k.usage_monthly,
          limit: k.limit,
          limit_remaining: k.limit_remaining,
        });

        const keyData = {
          platform: 'openrouter',
          platform_key_id: k.hash,
          name: k.name || 'OpenRouter Key',
          api_key_prefix: parsed.prefix,
          api_key_suffix: parsed.suffix,
          status: k.disabled ? 'inactive' : 'active',
          expires_at: k.expires_at || null,
          platform_account_id: platform_account_id || null,
          last_synced_at: nowISO,
          creation_method: 'sync',
          tenant_id: userInfo.tenantId,
        };

        if (existing) {
          // 已有 Key，更新
          keysToUpdate.push({
            id: existing.id,
            ...keyData,
          });
        } else {
          // 新 Key，创建
          keysToCreate.push({
            ...keyData,
            api_key_encrypted: k.label || '[synced]',
          });
        }

        // 生成用量记录
        // OpenRouter 按使用量付费，没有余额概念，balance 设为 null
        const dbKeyId = existing?.id;
        if (dbKeyId) {
          usageRecords.push({
            api_key_id: dbKeyId,
            period_start: monthStart,
            synced_at: nowISO,
            sync_status: 'success',
            balance: null, // OpenRouter 没有余额概念
            credit_limit: k.limit || null,
            total_usage: k.usage || 0,
            monthly_usage: k.usage_monthly || 0,
            daily_usage: k.usage_daily || 0,
            raw_response: JSON.stringify({
              usage: k.usage,
              usage_daily: k.usage_daily,
              usage_weekly: k.usage_weekly,
              usage_monthly: k.usage_monthly,
              limit: k.limit,
              limit_remaining: k.limit_remaining,
              limit_reset: k.limit_reset,
            }),
          });
        }
      });

      // 6. 创建新 Keys
      let createdCount = 0;
      if (keysToCreate.length > 0) {
        const { data: insertedKeys, error: insertError } = await supabase
          .from('llm_api_keys')
          .insert(keysToCreate)
          .select('id, platform_key_id');

        if (insertError) {
          console.error('[openrouter/sync] 创建新 Keys 失败:', insertError);
          return res.status(500).json({
            success: false,
            error: `创建新 Keys 失败: ${insertError.message}`,
          });
        }

        createdCount = insertedKeys?.length || 0;

        // 为新创建的 Keys 添加用量记录
        (insertedKeys || []).forEach((newKey: any) => {
          const originalKey = keys.find((k: any) => k.hash === newKey.platform_key_id);
          if (originalKey) {
            usageRecords.push({
              api_key_id: newKey.id,
              period_start: monthStart,
              synced_at: nowISO,
              sync_status: 'success',
              balance: null, // OpenRouter 没有余额概念
              credit_limit: originalKey.limit || null,
              total_usage: originalKey.usage || 0,
              monthly_usage: originalKey.usage_monthly || 0,
              daily_usage: originalKey.usage_daily || 0,
              raw_response: JSON.stringify({
                usage: originalKey.usage,
                usage_daily: originalKey.usage_daily,
                usage_weekly: originalKey.usage_weekly,
                usage_monthly: originalKey.usage_monthly,
                limit: originalKey.limit,
                limit_remaining: originalKey.limit_remaining,
                limit_reset: originalKey.limit_reset,
              }),
            });
          }
        });
      }

      // 7. 更新已有 Keys
      let updatedCount = 0;
      if (keysToUpdate.length > 0) {
        for (const keyUpdate of keysToUpdate) {
          const { error: updateError } = await supabase
            .from('llm_api_keys')
            .update({
              name: keyUpdate.name,
              status: keyUpdate.status,
              expires_at: keyUpdate.expires_at,
              last_synced_at: keyUpdate.last_synced_at,
            })
            .eq('id', keyUpdate.id);

          if (updateError) {
            console.error(`[openrouter/sync] 更新 Key ${keyUpdate.id} 失败:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }

      // 8. 保存用量数据（使用 PATCH + INSERT 策略）
      let savedUsageCount = 0;
      const saveErrors: any[] = [];

      if (usageRecords.length > 0) {
        console.log(`[openrouter/sync] 准备保存 ${usageRecords.length} 条用量记录`);
        for (const record of usageRecords) {
          try {
            // 调试：记录要保存的数据
            console.log(`[openrouter/sync] 保存用量记录:`, {
              api_key_id: record.api_key_id,
              period_start: record.period_start,
              total_usage: record.total_usage,
              monthly_usage: record.monthly_usage,
              daily_usage: record.daily_usage,
            });

            // 检查记录是否存在
            const { data: checkData, error: checkError } = await supabase
              .from('llm_api_key_usage')
              .select('id, total_usage, monthly_usage')
              .eq('api_key_id', record.api_key_id)
              .eq('period_start', record.period_start)
              .limit(1);

            if (checkError) {
              throw checkError;
            }

            const recordExists = Array.isArray(checkData) && checkData.length > 0;

            if (recordExists) {
              // 更新现有记录
              console.log(`[openrouter/sync] 更新现有记录，原值:`, checkData[0]);
              const { error: updateError, data: updateData } = await supabase
                .from('llm_api_key_usage')
                .update({
                  balance: record.balance,
                  credit_limit: record.credit_limit,
                  total_usage: record.total_usage,
                  monthly_usage: record.monthly_usage,
                  daily_usage: record.daily_usage,
                  synced_at: record.synced_at,
                  sync_status: record.sync_status,
                  raw_response: record.raw_response,
                })
                .eq('api_key_id', record.api_key_id)
                .eq('period_start', record.period_start)
                .select('total_usage, monthly_usage');

              if (updateError) {
                throw updateError;
              }
              console.log(`[openrouter/sync] 更新后值:`, updateData);
            } else {
              // 插入新记录
              console.log(`[openrouter/sync] 插入新记录`);
              const { error: insertError, data: insertData } = await supabase
                .from('llm_api_key_usage')
                .insert(record)
                .select('total_usage, monthly_usage');

              if (insertError) {
                throw insertError;
              }
              console.log(`[openrouter/sync] 插入后值:`, insertData);
            }

            savedUsageCount++;
          } catch (err) {
            console.error(`[openrouter/sync] 保存用量记录失败:`, err);
            saveErrors.push({
              api_key_id: record.api_key_id,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }
        console.log(`[openrouter/sync] 保存完成: ${savedUsageCount} 条成功，${saveErrors.length} 条失败`);
      } else {
        console.log(`[openrouter/sync] 没有用量记录需要保存`);
      }

      // 9. 计算统计数据
      const totalUsage = usageRecords.reduce((sum, r) => sum + (r.total_usage || 0), 0);
      const monthlyUsage = usageRecords.reduce((sum, r) => sum + (r.monthly_usage || 0), 0);
      const dailyUsage = usageRecords.reduce((sum, r) => sum + (r.daily_usage || 0), 0);
      const totalBalance = usageRecords.reduce((sum, r) => sum + (r.balance || 0), 0);

      return res.status(200).json({
        success: true,
        action: 'sync',
        message: `同步完成！新增 ${createdCount} 个，更新 ${updatedCount} 个 Keys`,
        keys_count: keys.length,
        created_count: createdCount,
        updated_count: updatedCount,
        saved_usage_count: savedUsageCount,
        synced_at: nowISO,
        stats: {
          total_usage: totalUsage,
          monthly_usage: monthlyUsage,
          daily_usage: dailyUsage,
          total_balance: totalBalance,
        },
        ...(saveErrors.length > 0 && { save_errors: saveErrors }),
      });
    }

    // credits 操作 - 获取账户余额
    if (action === 'credits') {
      const creditsResponse = await fetch('https://openrouter.ai/api/v1/credits', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });

      const creditsData = await creditsResponse.json();

      if (!creditsResponse.ok || creditsData.error) {
        return res.status(creditsResponse.status || 400).json({
          success: false,
          error: creditsData.error?.message || '查询余额失败',
        });
      }

      const data = creditsData.data || {};
      return res.status(200).json({
        success: true,
        action: 'credits',
        credits: {
          total_credits: data.total_credits || 0,
          total_usage: data.total_usage || 0,
          remaining: (data.total_credits || 0) - (data.total_usage || 0),
        },
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

