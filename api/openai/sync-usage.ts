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
    const { admin_key } = req.body;

    if (!admin_key) {
      return res.status(400).json({ success: false, error: '缺少 admin_key 参数' });
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
        Authorization: `Bearer ${admin_key}`,
        'Content-Type': 'application/json',
      },
    });

    const projectsData = await projectsResponse.json();
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
            Authorization: `Bearer ${admin_key}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const keysData = await keysResponse.json();
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

    // 3. 获取数据库中的 Keys
    const { data: dbKeys, error: dbError } = await supabase
      .from('llm_api_keys')
      .select('id, name, project_id')
      .eq('platform', 'openai');

    if (dbError) {
      return res.status(500).json({
        success: false,
        error: `获取数据库 Keys 失败: ${dbError.message}`,
      });
    }

    // 4. 分页获取用量数据
    const allBuckets: any[] = [];
    let page: number | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 20; // 防止无限循环

    while (hasMore && pageCount < maxPages) {
      let url = `https://api.openai.com/v1/organization/usage/completions?start_time=${weekAgoUTC}&end_time=${nowTimestamp}&bucket_width=1d&group_by[]=api_key_id&limit=31`;
      if (page) {
        url += `&page=${page}`;
      }

      const usageResponse = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${admin_key}`,
          'Content-Type': 'application/json',
        },
      });

      const usageData = await usageResponse.json();
      if (!usageResponse.ok || usageData.error) {
        break;
      }

      const buckets = usageData.data || [];
      allBuckets.push(...buckets);

      hasMore = usageData.has_more === true;
      page = usageData.next_page || null;
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
      const bucketStart = bucket.start_time;
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

    // 6. 建立映射
    const openaiKeyIdToName: Record<string, string> = {};
    allOpenAIKeys.forEach((k) => {
      openaiKeyIdToName[k.openai_key_id] = k.name;
    });

    const dbKeyByName: Record<string, { id: string; name: string; project_id: string }> = {};
    (dbKeys || []).forEach((k) => {
      dbKeyByName[k.name] = k;
    });

    // 7. 匹配用量到数据库 Keys
    const usageRecords: any[] = [];
    const matchedKeys: any[] = [];

    Object.entries(usageByKey).forEach(([apiKeyId, usage]) => {
      const keyName = openaiKeyIdToName[apiKeyId];
      if (!keyName) return;

      const dbKey = dbKeyByName[keyName];
      if (!dbKey) return;

      matchedKeys.push({
        openai_key_id: apiKeyId,
        name: keyName,
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

    // 8. 保存用量数据
    if (usageRecords.length > 0) {
      const { error: insertError } = await supabase.from('llm_api_key_usage').upsert(usageRecords, {
        onConflict: 'api_key_id,period_start',
      });

      if (insertError) {
        console.error('保存用量数据失败:', insertError);
        return res.status(500).json({
          success: false,
          error: `保存用量数据失败: ${insertError.message}`,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `同步完成！更新 ${matchedKeys.length} 个 Key 的用量`,
      summary: {
        today_tokens: todayTokens,
        month_tokens: monthTokens,
        total_buckets: allBuckets.length,
        pages_fetched: pageCount,
        usage_keys_count: Object.keys(usageByKey).length,
      },
      matched_keys: matchedKeys,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('同步 OpenAI 用量失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '同步失败',
    });
  }
}

