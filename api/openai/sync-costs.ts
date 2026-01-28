import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../_lib/auth';

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

    const { admin_key, platform_account_id } = req.body;

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

      if (account.platform !== 'openai') {
        return res.status(400).json({ success: false, error: '平台类型不匹配，期望 openai' });
      }

      adminKey = account.admin_api_key_encrypted;
    }

    if (!adminKey) {
      return res.status(400).json({ success: false, error: '缺少 Admin Key，请提供 admin_key 或 platform_account_id' });
    }

    // 计算时间范围
    const now = new Date();
    const nowTimestamp = Math.floor(now.getTime() / 1000);
    const monthStartUTC = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
    const todayStartUTC = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);

    // 1. 获取所有项目
    const projectsResponse = await fetch('https://api.openai.com/v1/organization/projects?limit=100', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminKey}`,
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
            Authorization: `Bearer ${adminKey}`,
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
    const { data: dbKeys, error: dbKeysError } = await supabase
      .from('llm_api_keys')
      .select('id, name, project_id')
      .eq('platform', 'openai');

    if (dbKeysError) {
      return res.status(500).json({ success: false, error: `获取数据库 Keys 失败: ${dbKeysError.message}` });
    }

    // 4. 获取费用数据（分页）
    const allBuckets: any[] = [];
    let page: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 20;

    while (hasMore && pageCount < maxPages) {
      let requestUrl = `https://api.openai.com/v1/organization/costs?start_time=${monthStartUTC}&end_time=${nowTimestamp}&bucket_width=1d&limit=180&group_by=project_id`;
      if (page) {
        requestUrl += `&page=${encodeURIComponent(page)}`;
      }

      const costsResponse = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });

      const costsData = await costsResponse.json();

      if (!costsResponse.ok || costsData.error) {
        return res.status(costsResponse.status || 400).json({
          success: false,
          error: costsData.error?.message || '获取费用数据失败',
        });
      }

      const buckets = costsData.data || [];
      allBuckets.push(...buckets);

      hasMore = costsData.has_more === true;
      page = costsData.next_page || null;
      pageCount++;
    }

    // 5. 处理费用数据并匹配
    const todayUTCEnd = todayStartUTC + 86400;
    const costsByProject: Record<string, { today_cost: number; month_cost: number; total_cost: number; details: Record<string, number> }> = {};
    let totalCost = 0.0;
    let todayCost = 0.0;
    let monthCost = 0.0;

    allBuckets.forEach((bucket) => {
      const bucketStart = bucket.start_time;
      const isToday = bucketStart >= todayStartUTC && bucketStart < todayUTCEnd;

      (bucket.results || []).forEach((result: any) => {
        const rawAmount = result.amount?.value !== undefined ? result.amount.value : result.amount || 0;
        const amountDollars = parseFloat(rawAmount) || 0;
        const projectId = result.project_id || 'unknown';
        const lineItem = result.line_item || 'unknown';

        if (!costsByProject[projectId]) {
          costsByProject[projectId] = {
            today_cost: 0.0,
            month_cost: 0.0,
            total_cost: 0.0,
            details: {},
          };
        }

        totalCost += amountDollars;
        monthCost += amountDollars;
        costsByProject[projectId].month_cost += amountDollars;
        costsByProject[projectId].total_cost += amountDollars;

        if (!costsByProject[projectId].details[lineItem]) {
          costsByProject[projectId].details[lineItem] = 0;
        }
        costsByProject[projectId].details[lineItem] += amountDollars;

        if (isToday) {
          todayCost += amountDollars;
          costsByProject[projectId].today_cost += amountDollars;
        }
      });
    });

    // 6. 建立映射并匹配
    const keysByProjectId: Record<string, typeof allOpenAIKeys> = {};
    allOpenAIKeys.forEach((k) => {
      if (!keysByProjectId[k.project_id]) {
        keysByProjectId[k.project_id] = [];
      }
      keysByProjectId[k.project_id].push(k);
    });

    const dbKeyByName: Record<string, { id: string; name: string }> = {};
    (dbKeys || []).forEach((k) => {
      dbKeyByName[k.name] = k;
    });

    const costRecords: any[] = [];
    const matchedKeys: any[] = [];
    const nowISO = new Date().toISOString();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().split('T')[0];

    Object.entries(costsByProject).forEach(([projectId, costs]) => {
      const projectKeys = keysByProjectId[projectId] || [];
      if (projectKeys.length === 0) return;

      const perKeyCost = {
        today_cost: costs.today_cost / projectKeys.length,
        month_cost: costs.month_cost / projectKeys.length,
        total_cost: costs.total_cost / projectKeys.length,
      };

      projectKeys.forEach((openaiKey) => {
        const dbKey = dbKeyByName[openaiKey.name];
        if (!dbKey) return;

        matchedKeys.push({
          project_id: projectId,
          project_name: openaiKey.project_name,
          name: openaiKey.name,
          db_id: dbKey.id,
          month_cost: Number(perKeyCost.month_cost).toFixed(4),
          today_cost: Number(perKeyCost.today_cost).toFixed(4),
          keys_in_project: projectKeys.length,
        });

        costRecords.push({
          api_key_id: dbKey.id,
          total_usage: parseFloat(Number(perKeyCost.total_cost).toFixed(4)),
          monthly_usage: parseFloat(Number(perKeyCost.month_cost).toFixed(4)),
          daily_usage: parseFloat(Number(perKeyCost.today_cost).toFixed(4)),
          synced_at: nowISO,
          sync_status: 'success',
          period_start: periodStart,
          raw_response: { project_id: projectId, costs_details: costs.details },
        });
      });
    });

    // 7. 保存费用数据到数据库
    let savedCount = 0;
    const errors: any[] = [];

    for (const record of costRecords) {
      try {
        // 先尝试更新现有记录
        const { data: existing } = await supabase
          .from('llm_api_key_usage')
          .select('id')
          .eq('api_key_id', record.api_key_id)
          .eq('period_start', record.period_start)
          .single();

        if (existing) {
          await supabase
            .from('llm_api_key_usage')
            .update({
              total_usage: record.total_usage,
              monthly_usage: record.monthly_usage,
              daily_usage: record.daily_usage,
              sync_status: record.sync_status,
              synced_at: record.synced_at,
              raw_response: record.raw_response,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('llm_api_key_usage').insert(record);
        }

        savedCount++;
      } catch (err) {
        errors.push({ api_key_id: record.api_key_id, error: (err as Error).message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `费用同步完成！更新 ${matchedKeys.length} 个 Key 的费用数据`,
      summary: {
        total_cost_usd: Number(totalCost).toFixed(4),
        month_cost_usd: Number(monthCost).toFixed(4),
        today_cost_usd: Number(todayCost).toFixed(4),
        total_buckets: allBuckets.length,
        pages_fetched: pageCount,
        projects_with_costs: Object.keys(costsByProject).length,
      },
      matched_keys: matchedKeys,
      synced_at: nowISO,
      saved_count: savedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('同步 OpenAI 费用失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '同步失败',
    });
  }
}

