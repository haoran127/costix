import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../_lib/auth.js';

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
      workspace_id,
      api_key_id,
      status,
      limit,
      starting_at,
      ending_at,
      range,
      bucket_width,
      save_to_db,
    } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: '缺少 action 参数' });
    }

    let adminKey = admin_key;

    // 如果没有提供 admin_key，从数据库获取
    if (!adminKey && platform_account_id) {
      const { data: account, error: accountError } = await supabase
        .from('llm_platform_accounts')
        .select('admin_api_key_encrypted, status')
        .eq('id', platform_account_id)
        .single();

      if (accountError || !account || !account.admin_api_key_encrypted) {
        return res.status(400).json({ success: false, error: '未找到平台账号或没有配置 Admin Key' });
      }

      if (account.status !== 'active') {
        return res.status(400).json({ success: false, error: '平台账号状态异常' });
      }

      adminKey = account.admin_api_key_encrypted;
    }

    if (!adminKey || !adminKey.startsWith('sk-ant-admin')) {
      return res.status(400).json({ success: false, error: 'Admin Key 格式不正确' });
    }

    // 计算时间范围
    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    let startDate: string;
    let endDate: string;

    if (starting_at && ending_at) {
      startDate = starting_at;
      endDate = ending_at;
    } else if (range === 'today') {
      startDate = nowUTC.toISOString().split('T')[0];
      const tomorrow = new Date(nowUTC.getTime() + 24 * 60 * 60 * 1000);
      endDate = tomorrow.toISOString().split('T')[0];
    } else {
      // 当月
      const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const tomorrow = new Date(nowUTC.getTime() + 24 * 60 * 60 * 1000);
      startDate = firstDay.toISOString().split('T')[0];
      endDate = tomorrow.toISOString().split('T')[0];
    }

    // list_keys 操作
    if (action === 'list_keys') {
      console.log('[claude/list-keys] 开始获取 Claude Keys，platform_account_id:', platform_account_id);
      const listUrl = `https://api.anthropic.com/v1/organizations/api_keys?limit=${limit || 100}${
        status ? `&status=${status}` : ''
      }`;

      console.log('[claude/list-keys] 请求 URL:', listUrl);
      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'x-api-key': adminKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      });

      const listData = await listResponse.json();
      console.log('[claude/list-keys] API 响应状态:', listResponse.status, 'has_error:', !!listData.error, 'keys_count:', listData.data?.length || 0);

      if (!listResponse.ok || listData.error) {
        console.error('[claude/list-keys] API 调用失败:', listData.error);
        return res.status(listResponse.status || 400).json({
          success: false,
          error: listData.error?.message || 'API 调用失败',
          details: listData.error,
        });
      }

      const keys = listData.data || [];
      console.log('[claude/list-keys] 获取到', keys.length, '个 keys');
      const formattedKeys = keys.map((key: any) => ({
        id: key.id,
        name: key.name,
        status: key.status,
        created_at: key.created_at,
        workspace_id: key.workspace_id || null,
        partial_key_hint: key.partial_key_hint || null,
        platform: 'anthropic',
        platform_account_id: platform_account_id || null,
      }));

      // 如果提供了 platform_account_id 且 save_to_db !== false，保存 keys 到数据库
      let savedCount = 0;
      if (platform_account_id && save_to_db !== false && formattedKeys.length > 0) {
        console.log(`[list-keys] 准备保存 ${formattedKeys.length} 个 Claude Keys 到数据库...`);
        
        // 先查询现有 keys（使用 platform_key_id 作为唯一标识）
        const { data: existingKeys } = await supabase
          .from('llm_api_keys')
          .select('id, platform_key_id, name')
          .eq('platform', 'anthropic')
          .eq('platform_account_id', platform_account_id);

        const existingKeyMap = new Map<string, { id: string; name: string }>();
        (existingKeys || []).forEach((k: any) => {
          if (k.platform_key_id) {
            existingKeyMap.set(k.platform_key_id, { id: k.id, name: k.name });
          }
        });

        // 准备要保存和更新的 keys
        const keysToSave: any[] = [];
        const keysToUpdate: any[] = [];

        for (const key of formattedKeys) {
          const keyPrefix = key.partial_key_hint ? key.partial_key_hint.substring(0, 15) : 'sk-ant-';
          const keySuffix = key.partial_key_hint ? key.partial_key_hint.slice(-8) : null;

          const keyRecord = {
            platform_key_id: key.id,
            platform: 'anthropic',
            name: key.name || 'Claude API Key',
            api_key_encrypted: '[synced_from_api]', // 占位值，表示从 API 同步的
            api_key_prefix: keyPrefix,
            api_key_suffix: keySuffix,
            status: key.status === 'active' ? 'active' : 'inactive',
            platform_account_id: platform_account_id,
            workspace_id: key.workspace_id || null, // Claude 的 workspace_id，用于费用匹配
            creation_method: 'api',
            last_synced_at: new Date().toISOString(),
            tenant_id: userInfo.tenantId,
          };

          const existing = existingKeyMap.get(key.id);
          if (existing) {
            // 更新现有 key
            keysToUpdate.push({
              id: existing.id,
              ...keyRecord,
            });
          } else {
            // 插入新 key
            keysToSave.push(keyRecord);
          }
        }

        // 批量插入新 keys
        if (keysToSave.length > 0) {
          const { data: insertedData, error: insertError } = await supabase
            .from('llm_api_keys')
            .insert(keysToSave)
            .select('id');
          if (insertError) {
            console.error('[list-keys] 保存新 Keys 失败:', insertError);
            return res.status(500).json({
              success: false,
              error: `保存 Keys 到数据库失败: ${insertError.message}`,
              details: insertError,
              keys_to_save_count: keysToSave.length,
            });
          } else {
            savedCount += insertedData?.length || keysToSave.length;
            console.log(`[list-keys] 成功保存 ${savedCount} 个新 Keys`);
          }
        }

        // 批量更新现有 keys
        if (keysToUpdate.length > 0) {
          for (const keyUpdate of keysToUpdate) {
            const { error: updateError } = await supabase
              .from('llm_api_keys')
              .update({
                name: keyUpdate.name,
                status: keyUpdate.status,
                workspace_id: keyUpdate.workspace_id || null, // 更新 workspace_id
                last_synced_at: keyUpdate.last_synced_at,
              })
              .eq('id', keyUpdate.id);
            if (updateError) {
              console.error(`[list-keys] 更新 Key ${keyUpdate.id} 失败:`, updateError);
            } else {
              savedCount++;
            }
          }
        }
      }

      const debugInfo = platform_account_id && savedCount > 0 ? {
        platform_account_id,
        keys_found: formattedKeys.length,
        saved_count: savedCount,
      } : undefined;

      return res.status(200).json({
        success: true,
        action: 'list_keys',
        keys: formattedKeys,
        total: formattedKeys.length,
        has_more: listData.has_more || false,
        saved_count: savedCount,
        ...(debugInfo && { debug: debugInfo }),
      });
    }

    // sync_usage 操作
    if (action === 'sync_usage') {
      console.log('[claude/sync-usage] 开始同步用量，platform_account_id:', platform_account_id, 'range:', range);
      console.log('[claude/sync-usage] 时间范围:', { startDate, endDate, bucket_width: bucket_width || '1d' });
      
      const usageUrl = `https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at=${encodeURIComponent(
        startDate
      )}&ending_at=${encodeURIComponent(endDate)}&bucket_width=${bucket_width || '1d'}&group_by[]=api_key_id`;

      console.log('[claude/sync-usage] 请求 URL:', usageUrl);
      const usageResponse = await fetch(usageUrl, {
        method: 'GET',
        headers: {
          'x-api-key': adminKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      });

      const usageData = await usageResponse.json();
      console.log('[claude/sync-usage] API 响应状态:', usageResponse.status, 'has_error:', !!usageData.error, 'buckets_count:', usageData.data?.length || 0);

      if (!usageResponse.ok || usageData.error) {
        console.error('[claude/sync-usage] API 调用失败:', usageData.error);
        return res.status(usageResponse.status || 400).json({
          success: false,
          error: usageData.error?.message || '同步用量失败',
          details: usageData.error,
        });
      }

      // 处理用量数据
      const buckets = usageData.data || [];
      console.log(`[claude/sync-usage] 收到 ${buckets.length} 个 buckets`);
      
      if (buckets.length > 0) {
        console.log(`[claude/sync-usage] 第一个 bucket 示例:`, {
          starting_at: buckets[0].starting_at,
          ending_at: buckets[0].ending_at,
          results_count: buckets[0].results?.length || 0,
          first_result: buckets[0].results?.[0] ? {
            api_key_id: buckets[0].results[0].api_key_id,
            uncached_input_tokens: buckets[0].results[0].uncached_input_tokens,
            output_tokens: buckets[0].results[0].output_tokens,
            cache_read_input_tokens: buckets[0].results[0].cache_read_input_tokens,
            cache_creation: buckets[0].results[0].cache_creation,
          } : null,
        });
      }
      
      // 1. 先获取数据库中的 Keys（使用 platform_key_id 作为唯一标识）
      let dbKeysQuery = supabase
        .from('llm_api_keys')
        .select('id, platform_key_id, name')
        .eq('platform', 'anthropic');
      
      if (platform_account_id) {
        dbKeysQuery = dbKeysQuery.eq('platform_account_id', platform_account_id);
      }
      
      const { data: dbKeys, error: dbError } = await dbKeysQuery;

      if (dbError) {
        console.error('[claude/sync-usage] 获取数据库 Keys 失败:', dbError);
        return res.status(500).json({
          success: false,
          error: `获取数据库 Keys 失败: ${dbError.message}`,
          details: dbError,
        });
      }

      console.log(`[claude/sync-usage] 数据库中有 ${dbKeys?.length || 0} 个 Claude Keys`);

      // 2. 建立 platform_key_id -> db id 的映射
      const platformKeyIdToDbId: Record<string, string> = {};
      (dbKeys || []).forEach((k: any) => {
        if (k.platform_key_id) {
          platformKeyIdToDbId[k.platform_key_id] = k.id;
        }
      });

      // 3. 如果数据库中没有 keys，但提供了 platform_account_id，自动同步 keys
      if (Object.keys(platformKeyIdToDbId).length === 0 && platform_account_id) {
        console.log(`[sync-usage] 数据库中没有 keys，自动同步 Claude Keys...`);
        
        // 先获取 keys 列表
        const listUrl = `https://api.anthropic.com/v1/organizations/api_keys?limit=100`;
        const listResponse = await fetch(listUrl, {
          method: 'GET',
          headers: {
            'x-api-key': adminKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        });

        const listData = await listResponse.json();
        if (listResponse.ok && listData.data) {
          const keysToSave: any[] = [];
          for (const key of listData.data) {
            const keyPrefix = key.partial_key_hint ? key.partial_key_hint.substring(0, 15) : 'sk-ant-';
            const keySuffix = key.partial_key_hint ? key.partial_key_hint.slice(-8) : null;

            keysToSave.push({
              platform_key_id: key.id,
              platform: 'anthropic',
              name: key.name || 'Claude API Key',
              api_key_encrypted: '[synced_from_api]',
              api_key_prefix: keyPrefix,
              api_key_suffix: keySuffix,
              status: key.status === 'active' ? 'active' : 'inactive',
              platform_account_id: platform_account_id,
              creation_method: 'api',
              last_synced_at: new Date().toISOString(),
              tenant_id: userInfo.tenantId,
              // 注意：workspace_id 不在数据库表结构中，已移除
            });
          }

          if (keysToSave.length > 0) {
            const { data: insertedKeys, error: insertError } = await supabase
              .from('llm_api_keys')
              .insert(keysToSave)
              .select('id, platform_key_id');
            
            if (!insertError && insertedKeys) {
              console.log(`[sync-usage] 自动同步了 ${insertedKeys.length} 个 keys`);
              insertedKeys.forEach((k: any) => {
                if (k.platform_key_id) {
                  platformKeyIdToDbId[k.platform_key_id] = k.id;
                }
              });
            }
          }
        }
      }

      // 4. 处理用量数据并匹配到数据库 Keys
      const usageByKey: Record<string, {
        input_tokens: number;
        output_tokens: number;
        cache_read: number;
        cache_creation: number;
        total_tokens: number;
      }> = {};

      if (!buckets || buckets.length === 0) {
        console.log('[sync-usage] 没有用量数据');
        return res.status(200).json({
          success: true,
          action: 'sync_usage',
          message: '同步完成，但没有用量数据',
          summary: {
            buckets_count: 0,
            usage_keys_count: 0,
            matched_keys_count: 0,
            unmatched_keys_count: 0,
            saved_count: 0,
          },
          synced_at: new Date().toISOString(),
        });
      }

      buckets.forEach((bucket: any) => {
        const results = bucket.results || [];
        if (!Array.isArray(results) || results.length === 0) {
          return;
        }

        results.forEach((result: any) => {
          if (api_key_id && result.api_key_id !== api_key_id) {
            return; // 如果指定了 api_key_id，只处理该 key
          }

          const platformKeyId = result.api_key_id;
          if (!platformKeyId) {
            console.warn('[sync-usage] 用量记录缺少 api_key_id:', result);
            return;
          }

          if (!usageByKey[platformKeyId]) {
            usageByKey[platformKeyId] = {
              input_tokens: 0,
              output_tokens: 0,
              cache_read: 0,
              cache_creation: 0,
              total_tokens: 0,
            };
          }

          // Claude API 返回 uncached_input_tokens 而不是 input_tokens
          const input = result.uncached_input_tokens || result.input_tokens || 0;
          const output = result.output_tokens || 0;
          const cacheRead = result.cache_read_input_tokens || 0;
          let cacheCreation = 0;
          if (result.cache_creation) {
            cacheCreation = (result.cache_creation.ephemeral_1h_input_tokens || 0) + 
                           (result.cache_creation.ephemeral_5m_input_tokens || 0);
          }

          usageByKey[platformKeyId].input_tokens += input;
          usageByKey[platformKeyId].output_tokens += output;
          usageByKey[platformKeyId].cache_read += cacheRead;
          usageByKey[platformKeyId].cache_creation += cacheCreation;
          usageByKey[platformKeyId].total_tokens += input + output + cacheRead + cacheCreation;
        });
      });

      console.log(`[sync-usage] 处理了 ${buckets.length} 个 buckets，${Object.keys(usageByKey).length} 个 keys 有用量`);

      // 5. 计算今日用量（从 buckets 中提取）
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const todayStr = todayUTC.toISOString().split('T')[0];
      const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;

      const todayUsageByKey: Record<string, number> = {};
      buckets.forEach((bucket: any) => {
        // Claude API 返回 starting_at 字段（ISO 8601 格式）
        const bucketDate = bucket.starting_at ? bucket.starting_at.split('T')[0] : '';
        if (bucketDate === todayStr) {
          const results = bucket.results || [];
          if (!Array.isArray(results)) {
            return;
          }

          results.forEach((result: any) => {
            const platformKeyId = result.api_key_id;
            if (!platformKeyId) return;

            // Claude API 返回 uncached_input_tokens 而不是 input_tokens
            const input = result.uncached_input_tokens || result.input_tokens || 0;
            const output = result.output_tokens || 0;
            const cacheRead = result.cache_read_input_tokens || 0;
            let cacheCreation = 0;
            if (result.cache_creation) {
              cacheCreation = (result.cache_creation.ephemeral_1h_input_tokens || 0) + 
                             (result.cache_creation.ephemeral_5m_input_tokens || 0);
            }

            if (!todayUsageByKey[platformKeyId]) {
              todayUsageByKey[platformKeyId] = 0;
            }
            todayUsageByKey[platformKeyId] += input + output + cacheRead + cacheCreation;
          });
        }
      });

      // 6. 匹配用量到数据库 Keys 并准备记录
      const usageRecords: any[] = [];
      const matchedKeys: any[] = [];
      const unmatchedKeys: Array<{ api_key_id: string }> = [];

      Object.entries(usageByKey).forEach(([platformKeyId, usage]) => {
        const dbKeyId = platformKeyIdToDbId[platformKeyId];
        if (!dbKeyId) {
          unmatchedKeys.push({ api_key_id: platformKeyId });
          return;
        }

        matchedKeys.push({
          platform_key_id: platformKeyId,
          db_id: dbKeyId,
          total_tokens: usage.total_tokens,
        });

        // 使用月初作为 period_start（与 n8n workflow 一致）
        const record: any = {
          api_key_id: dbKeyId,
          period_start: monthStart,
          synced_at: new Date().toISOString(),
          sync_status: 'success',
        };

        // 根据 range 参数决定更新哪些字段
        if (range === 'today') {
          // 今日用量模式 - 只更新 token_usage_daily
          record.token_usage_daily = todayUsageByKey[platformKeyId] || 0;
          console.log(`[claude/sync-usage] 今日模式 - Key ${platformKeyId} (db_id: ${dbKeyId}): token_usage_daily = ${record.token_usage_daily}`);
        } else {
          // 月度用量模式 - 更新所有字段（与 n8n workflow 一致）
          // 注意：n8n workflow 中使用 usage.total, usage.input, usage.output
          record.token_usage_monthly = usage.total_tokens;
          record.token_usage_total = usage.total_tokens;
          record.prompt_tokens_total = usage.input_tokens;
          record.completion_tokens_total = usage.output_tokens;
          record.token_usage_daily = todayUsageByKey[platformKeyId] || 0;
          console.log(`[claude/sync-usage] 月度模式 - Key ${platformKeyId} (db_id: ${dbKeyId}):`, {
            token_usage_monthly: record.token_usage_monthly,
            token_usage_total: record.token_usage_total,
            prompt_tokens_total: record.prompt_tokens_total,
            completion_tokens_total: record.completion_tokens_total,
            token_usage_daily: record.token_usage_daily,
            period_start: record.period_start,
            usage_object: usage, // 完整的 usage 对象用于调试
            today_usage: todayUsageByKey[platformKeyId] || 0,
          });
        }

        usageRecords.push(record);
      });

      // 7. 保存用量数据到数据库
      let savedCount = 0;
      const saveErrors: Array<{ api_key_id: string; error: string }> = [];
      
      if (save_to_db !== false && usageRecords.length > 0) {
        console.log(`[claude/sync-usage] 准备保存 ${usageRecords.length} 条用量记录到数据库`);
        console.log(`[claude/sync-usage] 第一条记录示例:`, JSON.stringify(usageRecords[0], null, 2));
        
        // 使用 PATCH + INSERT 策略（与 OpenAI sync-usage 一致，更可靠）
        for (const record of usageRecords) {
          try {
            // 1. 先检查记录是否存在
            const { data: checkData, error: checkError } = await supabase
              .from('llm_api_key_usage')
              .select('id')
              .eq('api_key_id', record.api_key_id)
              .eq('period_start', record.period_start)
              .limit(1);

            if (checkError) {
              throw checkError;
            }

            const recordExists = Array.isArray(checkData) && checkData.length > 0;

            if (recordExists) {
              // 2. 记录存在，使用 UPDATE 更新
              const { data: updateData, error: updateError } = await supabase
                .from('llm_api_key_usage')
                .update({
                  token_usage_monthly: record.token_usage_monthly,
                  token_usage_total: record.token_usage_total,
                  token_usage_daily: record.token_usage_daily,
                  prompt_tokens_total: record.prompt_tokens_total,
                  completion_tokens_total: record.completion_tokens_total,
                  synced_at: record.synced_at,
                  sync_status: record.sync_status,
                })
                .eq('api_key_id', record.api_key_id)
                .eq('period_start', record.period_start)
                .select('id, api_key_id, period_start, token_usage_monthly, token_usage_daily, prompt_tokens_total, completion_tokens_total');

              if (updateError) {
                throw updateError;
              }

              savedCount++;
              if (updateData && updateData.length > 0) {
                console.log(`[claude/sync-usage] 成功更新记录:`, {
                  id: updateData[0].id,
                  api_key_id: updateData[0].api_key_id,
                  period_start: updateData[0].period_start,
                  token_usage_monthly: updateData[0].token_usage_monthly,
                  token_usage_daily: updateData[0].token_usage_daily,
                  prompt_tokens_total: updateData[0].prompt_tokens_total,
                  completion_tokens_total: updateData[0].completion_tokens_total,
                });
              }
            } else {
              // 3. 记录不存在，使用 INSERT 插入
              const { data: insertData, error: insertError } = await supabase
                .from('llm_api_key_usage')
                .insert(record)
                .select('id, api_key_id, period_start, token_usage_monthly, token_usage_daily, prompt_tokens_total, completion_tokens_total');

              if (insertError) {
                throw insertError;
              }

              savedCount++;
              if (insertData && insertData.length > 0) {
                console.log(`[claude/sync-usage] 成功插入记录:`, {
                  id: insertData[0].id,
                  api_key_id: insertData[0].api_key_id,
                  period_start: insertData[0].period_start,
                  token_usage_monthly: insertData[0].token_usage_monthly,
                  token_usage_daily: insertData[0].token_usage_daily,
                  prompt_tokens_total: insertData[0].prompt_tokens_total,
                  completion_tokens_total: insertData[0].completion_tokens_total,
                });
              }
            }
          } catch (err) {
            console.error(`[claude/sync-usage] 保存用量记录失败 (api_key_id: ${record.api_key_id}, period_start: ${record.period_start}):`, err);
            saveErrors.push({
              api_key_id: record.api_key_id,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }
        
        console.log(`[claude/sync-usage] 成功保存 ${savedCount} 条用量记录，失败 ${saveErrors.length} 条`);
      } else if (usageRecords.length === 0) {
        console.log('[claude/sync-usage] 没有需要保存的用量记录');
      }

      return res.status(200).json({
        success: true,
        action: 'sync_usage',
        message: `同步完成！更新 ${matchedKeys.length} 个 Key 的用量`,
        summary: {
          buckets_count: buckets.length,
          usage_keys_count: Object.keys(usageByKey).length,
          matched_keys_count: matchedKeys.length,
          unmatched_keys_count: unmatchedKeys.length,
          saved_count: savedCount,
          ...(saveErrors.length > 0 && { save_errors_count: saveErrors.length }),
        },
        matched_keys: matchedKeys,
        unmatched_keys: unmatchedKeys,
        ...(saveErrors.length > 0 && { save_errors: saveErrors }),
        debug: {
          db_keys_count: dbKeys?.length || 0,
          usage_keys_count: Object.keys(usageByKey).length,
          matched_count: matchedKeys.length,
          unmatched_count: unmatchedKeys.length,
          buckets_processed: buckets.length,
        },
        hint: unmatchedKeys.length > 0 ? `有 ${unmatchedKeys.length} 个 keys 未匹配。请先同步 keys 列表（调用 action=list_keys）。` : undefined,
        synced_at: new Date().toISOString(),
      });
    }

    return res.status(400).json({ success: false, error: `不支持的操作: ${action}` });
  } catch (error) {
    console.error('Claude sync-data 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '操作失败',
    });
  }
}

