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
      const listUrl = `https://api.anthropic.com/v1/organizations/api_keys?limit=${limit || 100}${
        status ? `&status=${status}` : ''
      }`;

      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'x-api-key': adminKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      });

      const listData = await listResponse.json();

      if (!listResponse.ok || listData.error) {
        return res.status(listResponse.status || 400).json({
          success: false,
          error: listData.error?.message || 'API 调用失败',
        });
      }

      const keys = listData.data || [];
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

      return res.status(200).json({
        success: true,
        action: 'list_keys',
        keys: formattedKeys,
        total: formattedKeys.length,
        has_more: listData.has_more || false,
      });
    }

    // sync_usage 操作
    if (action === 'sync_usage') {
      const usageUrl = `https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at=${encodeURIComponent(
        startDate
      )}&ending_at=${encodeURIComponent(endDate)}&bucket_width=${bucket_width || '1d'}&group_by[]=api_key_id`;

      const usageResponse = await fetch(usageUrl, {
        method: 'GET',
        headers: {
          'x-api-key': adminKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      });

      const usageData = await usageResponse.json();

      if (!usageResponse.ok || usageData.error) {
        return res.status(usageResponse.status || 400).json({
          success: false,
          error: usageData.error?.message || '同步用量失败',
        });
      }

      // 处理用量数据并保存到数据库
      const buckets = usageData.data || [];
      const usageRecords: any[] = [];

      buckets.forEach((bucket: any) => {
        (bucket.results || []).forEach((result: any) => {
          if (api_key_id && result.api_key_id !== api_key_id) {
            return; // 如果指定了 api_key_id，只处理该 key
          }

          usageRecords.push({
            api_key_id: result.api_key_id,
            token_usage_total: result.input_tokens + result.output_tokens,
            token_usage_monthly: result.input_tokens + result.output_tokens,
            token_usage_daily: result.input_tokens + result.output_tokens,
            prompt_tokens_total: result.input_tokens,
            completion_tokens_total: result.output_tokens,
            synced_at: new Date().toISOString(),
            period_start: bucket.start_time ? new Date(bucket.start_time * 1000).toISOString().split('T')[0] : startDate,
          });
        });
      });

      if (save_to_db !== false && usageRecords.length > 0) {
        const { error: insertError } = await supabase.from('llm_api_key_usage').upsert(usageRecords, {
          onConflict: 'api_key_id,period_start',
        });

        if (insertError) {
          console.error('保存用量数据失败:', insertError);
        }
      }

      return res.status(200).json({
        success: true,
        action: 'sync_usage',
        message: `同步完成，处理 ${usageRecords.length} 条用量记录`,
        buckets_count: buckets.length,
        records_count: usageRecords.length,
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

