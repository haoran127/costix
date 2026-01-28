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

      if (account.platform !== 'anthropic') {
        return res.status(400).json({ success: false, error: '平台类型不匹配，期望 anthropic' });
      }

      adminKey = account.admin_api_key_encrypted;
    }

    if (!adminKey || !adminKey.startsWith('sk-ant-admin')) {
      return res.status(400).json({ success: false, error: '缺少 Admin Key 或格式不正确（应以 sk-ant-admin 开头）' });
    }

    // 计算时间范围
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // 1. 获取数据库中的 Keys
    const { data: dbKeys, error: dbKeysError } = await supabase
      .from('llm_api_keys')
      .select('id, name, platform_key_id, workspace_id')
      .eq('platform', 'anthropic');

    if (dbKeysError) {
      return res.status(500).json({ success: false, error: `获取数据库 Keys 失败: ${dbKeysError.message}` });
    }

    // 2. 获取费用数据（分页）
    const allData: any[] = [];
    let page: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 20;

    while (hasMore && pageCount < maxPages) {
      let requestUrl = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${encodeURIComponent(monthStart.toISOString())}&ending_at=${encodeURIComponent(now.toISOString())}&bucket_width=1d&group_by[]=workspace_id`;
      if (page) {
        requestUrl += `&page=${encodeURIComponent(page)}`;
      }

      const costsResponse = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'x-api-key': adminKey,
          'anthropic-version': '2023-06-01',
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

      const data = costsData.data || [];
      allData.push(...data);

      hasMore = costsData.has_more === true;
      page = costsData.next_page || null;
      pageCount++;
    }

    // 3. 处理费用数据
    const todayStartTime = todayStart.getTime();
    const todayEnd = todayStartTime + 86400000;
    const costsByWorkspace: Record<string, { today_cost: number; month_cost: number; total_cost: number }> = {};
    let totalCost = 0.0;
    let todayCost = 0.0;
    let monthCost = 0.0;

    allData.forEach((bucket) => {
      const bucketStart = new Date(bucket.start_time).getTime();
      const isToday = bucketStart >= todayStartTime && bucketStart < todayEnd;

      (bucket.results || []).forEach((result: any) => {
        const costCents = parseFloat(result.amount || 0);
        const costDollars = costCents / 100;
        const workspaceId = result.workspace_id || 'default';

        if (!costsByWorkspace[workspaceId]) {
          costsByWorkspace[workspaceId] = { today_cost: 0.0, month_cost: 0.0, total_cost: 0.0 };
        }

        totalCost += costDollars;
        monthCost += costDollars;
        costsByWorkspace[workspaceId].month_cost += costDollars;
        costsByWorkspace[workspaceId].total_cost += costDollars;

        if (isToday) {
          todayCost += costDollars;
          costsByWorkspace[workspaceId].today_cost += costDollars;
        }
      });
    });

    // 4. 建立映射并匹配
    const keysByWorkspace: Record<string, typeof dbKeys> = {};
    const keysWithoutWorkspace: typeof dbKeys = [];
    const processedKeyIds = new Set<string>();

    (dbKeys || []).forEach((k) => {
      if (k.workspace_id) {
        if (!keysByWorkspace[k.workspace_id]) {
          keysByWorkspace[k.workspace_id] = [];
        }
        keysByWorkspace[k.workspace_id].push(k);
      } else {
        keysWithoutWorkspace.push(k);
      }
    });

    const costRecords: any[] = [];
    const matchedKeys: any[] = [];
    const unmatchedWorkspaces: any[] = [];
    const zeroFeeKeys: any[] = [];
    let unmatchedCost = 0.0;
    const nowISO = new Date().toISOString();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().split('T')[0];

    // 处理有费用的 workspaces
    Object.entries(costsByWorkspace).forEach(([workspaceId, costs]) => {
      const wsKeys = keysByWorkspace[workspaceId] || [];

      if (wsKeys.length === 0) {
        unmatchedWorkspaces.push({ workspace_id: workspaceId, cost: costs.month_cost });
        unmatchedCost += costs.month_cost;
        return;
      }

      const perKeyCost = {
        today_cost: costs.today_cost / wsKeys.length,
        month_cost: costs.month_cost / wsKeys.length,
        total_cost: costs.total_cost / wsKeys.length,
      };

      wsKeys.forEach((dbKey) => {
        processedKeyIds.add(dbKey.id);
        matchedKeys.push({
          workspace_id: workspaceId,
          name: dbKey.name,
          db_id: dbKey.id,
          month_cost: Number(perKeyCost.month_cost).toFixed(4),
          today_cost: Number(perKeyCost.today_cost).toFixed(4),
          keys_in_workspace: wsKeys.length,
        });

        costRecords.push({
          api_key_id: dbKey.id,
          total_usage: parseFloat(Number(perKeyCost.total_cost).toFixed(4)),
          monthly_usage: parseFloat(Number(perKeyCost.month_cost).toFixed(4)),
          daily_usage: parseFloat(Number(perKeyCost.today_cost).toFixed(4)),
          synced_at: nowISO,
          sync_status: 'success',
          period_start: periodStart,
          raw_response: { workspace_id: workspaceId },
        });
      });
    });

    // 处理有 workspace_id 但本月无费用的 keys（设为 0）
    Object.entries(keysByWorkspace).forEach(([workspaceId, wsKeys]) => {
      wsKeys.forEach((dbKey) => {
        if (!processedKeyIds.has(dbKey.id)) {
          processedKeyIds.add(dbKey.id);
          zeroFeeKeys.push({ name: dbKey.name, workspace_id: workspaceId });

          matchedKeys.push({
            workspace_id: workspaceId,
            name: dbKey.name,
            db_id: dbKey.id,
            month_cost: '0.0000',
            today_cost: '0.0000',
            keys_in_workspace: 1,
          });

          costRecords.push({
            api_key_id: dbKey.id,
            total_usage: 0,
            monthly_usage: 0,
            daily_usage: 0,
            synced_at: nowISO,
            sync_status: 'success',
            period_start: periodStart,
            raw_response: { note: 'workspace 本月无费用' },
          });
        }
      });
    });

    // 处理无 workspace_id 的 keys
    keysWithoutWorkspace.forEach((dbKey) => {
      if (!processedKeyIds.has(dbKey.id)) {
        processedKeyIds.add(dbKey.id);

        matchedKeys.push({
          workspace_id: 'no_workspace',
          name: dbKey.name,
          db_id: dbKey.id,
          month_cost: '0.0000',
          today_cost: '0.0000',
          keys_in_workspace: 1,
        });

        costRecords.push({
          api_key_id: dbKey.id,
          total_usage: 0,
          monthly_usage: 0,
          daily_usage: 0,
          synced_at: nowISO,
          sync_status: 'success',
          period_start: periodStart,
          raw_response: { note: 'key 无 workspace_id' },
        });
      }
    });

    // 5. 保存费用数据到数据库（使用 UPSERT）
    let savedCount = 0;
    const errors: any[] = [];

    for (const record of costRecords) {
      try {
        // 使用 UPSERT（需要数据库有唯一约束）
        const { error: upsertError } = await supabase
          .from('llm_api_key_usage')
          .upsert(record, {
            onConflict: 'api_key_id,period_start',
          });

        if (upsertError) throw upsertError;
        savedCount++;
      } catch (err) {
        errors.push({
          api_key_id: record.api_key_id,
          error: (err as Error).message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `费用同步完成！更新 ${matchedKeys.length} 个 Key 的费用数据`,
      summary: {
        total_cost_usd: Number(totalCost).toFixed(4),
        month_cost_usd: Number(monthCost).toFixed(4),
        today_cost_usd: Number(todayCost).toFixed(4),
        total_buckets: allData.length,
        workspaces_count: Object.keys(costsByWorkspace).length,
        unmatched_cost_usd: Number(unmatchedCost).toFixed(4),
        zero_fee_keys_count: zeroFeeKeys.length,
      },
      matched_keys: matchedKeys,
      synced_at: nowISO,
      saved_count: savedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('同步 Claude 费用失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '同步失败',
    });
  }
}

