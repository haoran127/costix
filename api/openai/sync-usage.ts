import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../_lib/auth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kstwkcdmqzvhzjhnaopw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY 未设置，数据库操作可能失败');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

    const { admin_key, platform_account_id } = req.body;

    let adminKey = admin_key;
    let finalPlatformAccountId = platform_account_id;
    let effectiveTenantId = userInfo.tenantId;

    // 如果没有提供 admin_key，从数据库获取
    if (!adminKey && platform_account_id) {
      const { data: account, error: accountError } = await supabase
        .from('llm_platform_accounts')
        .select('admin_api_key_encrypted, status, platform, tenant_id')
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
      // 如果是 Cron 调用（userInfo.tenantId 为 null），使用账号的 tenant_id
      if (!effectiveTenantId && account.tenant_id) {
        effectiveTenantId = account.tenant_id;
      }
    }

    if (!adminKey) {
      return res.status(400).json({ success: false, error: '缺少 admin_key 参数，请提供 admin_key 或 platform_account_id' });
    }

    const now = new Date();
    const nowTimestamp = Math.floor(now.getTime() / 1000);
    // 只查询最近 7 天（避免分页问题），足够获取今日和近期用量
    const weekAgoUTC = nowTimestamp - 7 * 24 * 60 * 60;
    // 同时保存月初时间用于记录
    const monthStartUTC = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);

    // 1. 获取所有项目
    const projectsResponse = await fetch('https://api.openai.com/v1/organization/projects?limit=100', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
      },
    });

    const projectsData = await projectsResponse.json() as { data?: any[]; error?: { message?: string } };
    if (!projectsResponse.ok || projectsData.error) {
      return res.status(projectsResponse.status || 400).json({
        success: false,
        error: projectsData.error?.message || '获取项目列表失败',
      });
    }

    const projects = projectsData.data || [];

    // 2. 获取所有项目的 Keys
    const allOpenAIKeys: Array<{ openai_key_id: string; name: string; project_id: string; project_name: string }> = [];

    for (const project of projects) {
      const keysResponse = await fetch(
        `https://api.openai.com/v1/organization/projects/${project.id}/api_keys?limit=100`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const keysData = await keysResponse.json() as { data?: any[] };
      if (keysResponse.ok && keysData.data) {
        keysData.data.forEach((key: any) => {
          allOpenAIKeys.push({
            openai_key_id: key.id,
            name: key.name,
            project_id: project.id,
            project_name: project.name,
          });
        });
      }
    }

    // 3. 获取数据库中的 Keys（使用 service_role 绕过 RLS）
    // 注意：n8n workflow 中只查询 id, name, project_id，完全通过 name 匹配
    // 如果提供了 platform_account_id，只查询该账号的 keys
    console.log(`[sync-usage] 查询数据库 Keys，platform_account_id: ${finalPlatformAccountId}`);
    let dbKeysQuery = supabase
      .from('llm_api_keys')
      .select('id, name, project_id, platform_key_id')
      .eq('platform', 'openai');
    
    if (finalPlatformAccountId) {
      dbKeysQuery = dbKeysQuery.eq('platform_account_id', finalPlatformAccountId);
    }
    
    const { data: dbKeys, error: dbError } = await dbKeysQuery;

    if (dbError) {
      console.error('[sync-usage] 获取数据库 Keys 失败:', dbError);
      return res.status(500).json({
        success: false,
        error: `获取数据库 Keys 失败: ${dbError.message}`,
        details: dbError,
      });
    }

    console.log(`[sync-usage] 数据库中有 ${dbKeys?.length || 0} 个 Keys`);
    if (dbKeys && dbKeys.length > 0) {
      console.log(`[sync-usage] 数据库 Keys 示例:`, dbKeys.slice(0, 3).map((k: any) => ({ id: k.id, name: k.name, project_id: k.project_id, platform_key_id: k.platform_key_id })));
    }

    // 如果数据库中没有 keys，但提供了 platform_account_id，自动同步 keys
    if ((!dbKeys || dbKeys.length === 0) && finalPlatformAccountId && allOpenAIKeys.length > 0) {
      console.log(`[sync-usage] 数据库中没有 keys，自动同步 ${allOpenAIKeys.length} 个 keys...`);
      
      // 准备要保存的 keys
      const keysToSave: any[] = [];
      for (const key of allOpenAIKeys) {
        // 从 OpenAI API 返回的 keys 中提取 redacted_value（用于生成 prefix/suffix）
        // 注意：这里我们只有 key.id 和 key.name，没有 redacted_value
        // 所以使用 key.id 的前12个字符作为 prefix
        const keyPrefix = key.openai_key_id.substring(0, 12) || 'sk-';
        const keySuffix = '****'; // 无法获取真实 suffix，使用占位符
        
        keysToSave.push({
          name: key.name,
          platform: 'openai',
          platform_key_id: key.openai_key_id,
          platform_account_id: finalPlatformAccountId,
          project_id: key.project_id,
          organization_id: null,
          api_key_prefix: keyPrefix,
          api_key_suffix: keySuffix,
          status: 'active',
          creation_method: 'sync',
          tenant_id: effectiveTenantId,
          last_synced_at: new Date().toISOString(),
        });
      }

      // 批量插入 keys
      if (keysToSave.length > 0) {
        const { data: insertedKeys, error: insertError } = await supabase
          .from('llm_api_keys')
          .insert(keysToSave)
          .select('id, name, project_id');
        
        if (insertError) {
          console.error('[sync-usage] 自动同步 keys 失败:', insertError);
          // 不返回错误，继续处理用量同步（可能部分 keys 已存在）
        } else {
          console.log(`[sync-usage] 自动同步了 ${insertedKeys?.length || 0} 个 keys`);
          // 更新 dbKeys，使用新插入的 keys（需要重新查询以获取完整信息）
          const { data: refreshedKeys } = await supabase
            .from('llm_api_keys')
            .select('id, name, project_id, platform_key_id')
            .eq('platform', 'openai')
            .eq('platform_account_id', finalPlatformAccountId);
          
          if (refreshedKeys) {
            dbKeys.length = 0;
            dbKeys.push(...refreshedKeys);
            console.log(`[sync-usage] 重新查询后，数据库中有 ${dbKeys.length} 个 Keys`);
          }
        }
      }
    }

    // 4. 分页获取用量数据（与原 workflow 逻辑一致）
    const allBuckets: any[] = [];
    let page: string | null = null; // OpenAI API 的 page 是字符串 token，不是数字
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 20; // 防止无限循环

    while (hasMore && pageCount < maxPages) {
      let url = `https://api.openai.com/v1/organization/usage/completions?start_time=${weekAgoUTC}&end_time=${nowTimestamp}&bucket_width=1d&group_by[]=api_key_id&limit=31`;
      if (page) {
        url += `&page=${encodeURIComponent(page)}`; // 正确编码 page token
      }

      const usageResponse = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });

      const usageData = await usageResponse.json() as { data?: any[]; has_more?: boolean; next_page?: string; error?: { message?: string; code?: string } };
      
      // 检查 API 错误
      if (!usageResponse.ok || usageData.error) {
        console.error(`获取用量数据失败 (page ${pageCount}):`, usageData.error || usageResponse.statusText);
        // 如果是第一页失败，返回错误；否则继续处理已获取的数据
        if (pageCount === 0) {
          return res.status(usageResponse.status || 500).json({
            success: false,
            error: usageData.error?.message || '获取用量数据失败',
            code: usageData.error?.code,
          });
        }
        break;
      }

      const buckets = usageData.data || [];
      allBuckets.push(...buckets);

      hasMore = usageData.has_more === true;
      page = usageData.next_page || null; // next_page 是字符串 token
      pageCount++;
    }

    // 5. 处理用量数据并匹配
    const todayUTCStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
    const todayUTCEnd = todayUTCStart + 86400;

    const usageByKey: Record<
      string,
      {
        today_tokens: number;
        today_input: number;
        today_output: number;
        month_tokens: number;
        month_input: number;
        month_output: number;
      }
    > = {};
    let todayTokens = 0;
    let monthTokens = 0;

    allBuckets.forEach((bucket) => {
      // 确保 bucket.start_time 是数字类型
      const bucketStart = typeof bucket.start_time === 'number' ? bucket.start_time : Number(bucket.start_time);
      const isToday = bucketStart >= todayUTCStart && bucketStart < todayUTCEnd;

      (bucket.results || []).forEach((result: any) => {
        const inputTokens = result.input_tokens || 0;
        const outputTokens = result.output_tokens || 0;
        const totalTokens = inputTokens + outputTokens;
        const apiKeyId = result.api_key_id || 'unknown';

        if (!usageByKey[apiKeyId]) {
          usageByKey[apiKeyId] = {
            today_tokens: 0,
            today_input: 0,
            today_output: 0,
            month_tokens: 0,
            month_input: 0,
            month_output: 0,
          };
        }

        if (isToday) {
          todayTokens += totalTokens;
          usageByKey[apiKeyId].today_tokens += totalTokens;
          usageByKey[apiKeyId].today_input += inputTokens;
          usageByKey[apiKeyId].today_output += outputTokens;
        }

        monthTokens += totalTokens;
        usageByKey[apiKeyId].month_tokens += totalTokens;
        usageByKey[apiKeyId].month_input += inputTokens;
        usageByKey[apiKeyId].month_output += outputTokens;
      });
    });

    // 6. 建立映射（完全按照 n8n workflow 的逻辑）
    // OpenAI Key ID -> Key Name
    const openaiKeyIdToName: Record<string, string> = {};
    allOpenAIKeys.forEach((k) => {
      openaiKeyIdToName[k.openai_key_id] = k.name;
    });

    // Key Name -> DB Key（完全通过 name 匹配，与 n8n workflow 一致）
    const dbKeyByName: Record<string, { id: string; name: string; project_id: string }> = {};
    (dbKeys || []).forEach((k: any) => {
      dbKeyByName[k.name] = k;
    });

    // 7. 匹配用量到数据库 Keys（与 n8n workflow 完全一致）
    const usageRecords: any[] = [];
    const matchedKeys: any[] = [];
    const unmatchedKeys: Array<{ api_key_id: string; name?: string }> = [];

    Object.entries(usageByKey).forEach(([apiKeyId, usage]) => {
      const keyName = openaiKeyIdToName[apiKeyId];
      if (!keyName) {
        unmatchedKeys.push({
          api_key_id: apiKeyId,
          name: undefined,
        });
        return;
      }

      const dbKey = dbKeyByName[keyName];
      if (!dbKey) {
        // 记录未匹配的 key（用于调试）
        unmatchedKeys.push({
          api_key_id: apiKeyId,
          name: keyName,
        });
        return;
      }

      matchedKeys.push({
        openai_key_id: apiKeyId,
        name: openaiKeyIdToName[apiKeyId] || 'Unknown',
        db_id: dbKey.id,
        month_tokens: usage.month_tokens,
        today_tokens: usage.today_tokens,
      });

      usageRecords.push({
        api_key_id: dbKey.id,
        token_usage_total: usage.month_tokens,
        token_usage_monthly: usage.month_tokens,
        token_usage_daily: usage.today_tokens,
        prompt_tokens_total: usage.month_input,
        completion_tokens_total: usage.month_output,
        synced_at: new Date().toISOString(),
        period_start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
          .toISOString()
          .split('T')[0],
      });
    });

    // 8. 保存用量数据（使用 PATCH + INSERT 策略，与原 workflow 一致）
    let savedCount = 0;
    const saveErrors: Array<{ api_key_id: string; error: string }> = [];
    
    if (usageRecords.length > 0) {
      for (const record of usageRecords) {
        try {
          // 先检查记录是否存在
          const checkUrl = `${SUPABASE_URL}/rest/v1/llm_api_key_usage?api_key_id=eq.${record.api_key_id}&period_start=eq.${record.period_start}&select=id`;
          const checkResponse = await fetch(checkUrl, {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
          });

          if (!checkResponse.ok) {
            throw new Error(`检查记录失败: ${checkResponse.status} ${checkResponse.statusText}`);
          }

          const checkData = await checkResponse.json() as any[];
          const recordExists = Array.isArray(checkData) && checkData.length > 0;

          if (recordExists) {
            // 记录存在，使用 PATCH 更新
            const patchUrl = `${SUPABASE_URL}/rest/v1/llm_api_key_usage?api_key_id=eq.${record.api_key_id}&period_start=eq.${record.period_start}`;
            const patchData = {
              token_usage_total: record.token_usage_total,
              token_usage_monthly: record.token_usage_monthly,
              token_usage_daily: record.token_usage_daily,
              prompt_tokens_total: record.prompt_tokens_total,
              completion_tokens_total: record.completion_tokens_total,
              synced_at: record.synced_at,
            };

            const patchResponse = await fetch(patchUrl, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify(patchData),
            });

            if (!patchResponse.ok) {
              const patchErrorText = await patchResponse.text();
              throw new Error(`更新记录失败: ${patchResponse.status} ${patchErrorText}`);
            }
          } else {
            // 记录不存在，需要插入完整记录
            const { error: insertError } = await supabase.from('llm_api_key_usage').insert(record);
            if (insertError) {
              console.error(`插入用量记录失败 (api_key_id: ${record.api_key_id}, period_start: ${record.period_start}):`, insertError);
              throw insertError;
            }
          }

          savedCount++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`保存用量记录失败 (api_key_id: ${record.api_key_id}):`, errorMsg);
          saveErrors.push({
            api_key_id: record.api_key_id,
            error: errorMsg,
          });
        }
      }

      if (saveErrors.length > 0) {
        console.error('部分用量数据保存失败:', saveErrors);
      }
    }

    // 调试信息：显示匹配情况
    const debugInfo = {
      openai_keys_count: allOpenAIKeys.length,
      db_keys_count: (dbKeys || []).length,
      usage_keys_count: Object.keys(usageByKey).length,
      matched_count: matchedKeys.length,
      unmatched_count: unmatchedKeys.length,
      // 显示前几个 OpenAI keys 的 name（用于调试）
      sample_openai_keys: allOpenAIKeys.slice(0, 5).map(k => ({ id: k.openai_key_id, name: k.name })),
      // 显示前几个数据库 keys 的 name（用于调试）
      sample_db_keys: (dbKeys || []).slice(0, 5).map((k: any) => ({ id: k.id, name: k.name })),
      // 显示未匹配的 keys（用于调试）
      unmatched_sample: unmatchedKeys.slice(0, 5),
    };

    return res.status(200).json({
      success: true,
      message: `同步完成！更新 ${matchedKeys.length} 个 Key 的用量`,
      summary: {
        today_tokens: todayTokens,
        month_tokens: monthTokens,
        total_buckets: allBuckets.length,
        pages_fetched: pageCount,
        usage_keys_count: Object.keys(usageByKey).length,
        matched_keys_count: matchedKeys.length,
        unmatched_keys_count: unmatchedKeys.length,
        saved_count: savedCount,
        ...(saveErrors.length > 0 && { errors: saveErrors }),
      },
      matched_keys: matchedKeys,
      debug: debugInfo,
      ...(unmatchedKeys.length > 0 && { 
        unmatched_keys: unmatchedKeys.slice(0, 10),
        hint: unmatchedKeys.length > 0 
          ? `有 ${unmatchedKeys.length} 个 keys 未匹配。请先同步 keys 列表（调用 /api/openai/list-keys），确保数据库中有对应的 keys。`
          : undefined
      }),
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('同步 OpenAI 用量失败:', error);
    const errorMessage = error instanceof Error ? error.message : '同步失败';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // 记录详细的错误信息
    if (error instanceof Error) {
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: errorStack,
        details: error instanceof Error ? {
          name: error.name,
          message: error.message,
        } : String(error),
      }),
    });
  }
}

