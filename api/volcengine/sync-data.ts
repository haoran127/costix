import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../_lib/auth';
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

    const { access_key_id, secret_access_key, platform_account_id, sync_balance = true, sync_usage = true } = req.body;

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

    // 计算时间范围（本月）
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];
    const nowISO = now.toISOString();

    // 1. 获取数据库中的 Keys
    const { data: dbKeys, error: dbKeysError } = await supabase
      .from('llm_api_keys')
      .select('id, name, platform_key_id, api_key_encrypted')
      .eq('platform', 'volcengine');

    if (dbKeysError) {
      return res.status(500).json({ success: false, error: `获取数据库 Keys 失败: ${dbKeysError.message}` });
    }

    if (!dbKeys || dbKeys.length === 0) {
      return res.status(200).json({
        success: true,
        message: '同步完成，暂无 Key 记录',
        balance: null,
        usage: null,
        keys_count: 0,
        synced_at: nowISO,
      });
    }

    let balance: any = null;
    let balanceError: string | null = null;
    let usage: any = null;
    let usageError: string | null = null;

    // 2. 查询余额（如果需要）
    if (sync_balance) {
      try {
        const balanceSignature = generateVolcengineSignature({
          accessKeyId: adminAccessKeyId,
          secretAccessKey: adminSecretAccessKey,
          service: 'billing',
          region: 'cn-north-1',
          host: 'billing.volcengineapi.com',
          method: 'GET',
          path: '/',
          queryParams: {
            Action: 'QueryBalanceAcct',
            Version: '2022-01-01',
          },
        });

        const balanceResponse = await fetch(balanceSignature.requestUrl, {
          method: 'GET',
          headers: {
            Authorization: balanceSignature.authorization,
            'X-Date': balanceSignature.xDate,
            Host: balanceSignature.host,
            'Content-Type': 'application/json',
          },
        });

        const balanceData = await balanceResponse.json();

        if (balanceData.ResponseMetadata && balanceData.ResponseMetadata.Error) {
          balanceError = balanceData.ResponseMetadata.Error.Message || '余额查询失败';
        } else if (balanceData.Result) {
          const result = balanceData.Result;
          balance = {
            available_balance: result.AvailableBalance ? parseFloat(result.AvailableBalance) / 100 : 0,
            cash_balance: result.CashBalance ? parseFloat(result.CashBalance) / 100 : 0,
            credit_limit: result.CreditLimit ? parseFloat(result.CreditLimit) / 100 : 0,
            frozen_balance: result.FrozenBalance ? parseFloat(result.FrozenBalance) / 100 : 0,
          };
        }
      } catch (err) {
        balanceError = (err as Error).message;
      }
    }

    // 3. 查询用量（如果需要）
    if (sync_usage) {
      try {
        const usageSignature = generateVolcengineSignature({
          accessKeyId: adminAccessKeyId,
          secretAccessKey: adminSecretAccessKey,
          service: 'ark',
          region: 'cn-beijing',
          host: 'open.volcengineapi.com',
          method: 'POST',
          path: '/',
          queryParams: {
            Action: 'GetUsage',
            Version: '2024-01-01',
          },
          requestBody: JSON.stringify({
            StartTime: `${monthStartStr}T00:00:00Z`,
            EndTime: `${monthEndStr}T23:59:59Z`,
            Aggregation: 'Total',
          }),
        });

        const usageResponse = await fetch(usageSignature.requestUrl, {
          method: 'POST',
          headers: {
            Authorization: usageSignature.authorization,
            'X-Date': usageSignature.xDate,
            Host: usageSignature.host,
            'Content-Type': 'application/json',
          },
          body: usageSignature.requestBody,
        });

        const usageData = await usageResponse.json();

        if (usageData.ResponseMetadata && usageData.ResponseMetadata.Error) {
          usageError = usageData.ResponseMetadata.Error.Message || '用量查询失败';
        } else if (usageData.Result) {
          const result = usageData.Result;
          usage = {
            total_tokens: result.TotalTokens || 0,
            prompt_tokens: result.PromptTokens || 0,
            completion_tokens: result.CompletionTokens || 0,
            request_count: result.RequestCount || 0,
          };
        }
      } catch (err) {
        usageError = (err as Error).message;
      }
    }

    // 4. 准备要更新的用量记录
    const records = dbKeys.map((key) => ({
      api_key_id: key.id,
      balance: balance ? balance.available_balance : null,
      credit_limit: balance ? balance.credit_limit : null,
      token_usage_total: usage ? usage.total_tokens : null,
      token_usage_monthly: usage ? usage.total_tokens : null,
      prompt_tokens_total: usage ? usage.prompt_tokens : null,
      completion_tokens_total: usage ? usage.completion_tokens : null,
      period_start: monthStartStr,
      synced_at: nowISO,
      sync_status: 'success',
      raw_response: JSON.stringify({ balance, usage }),
    }));

    // 5. 保存用量记录
    let savedCount = 0;
    const errors: any[] = [];

    for (const record of records) {
      try {
        const { error: upsertError } = await supabase.from('llm_api_key_usage').upsert(record, {
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

    // 6. 更新同步时间
    await supabase
      .from('llm_api_keys')
      .update({ last_synced_at: nowISO })
      .eq('platform', 'volcengine');

    return res.status(200).json({
      success: true,
      message: `同步完成！插入 ${savedCount} 条用量记录`,
      balance,
      usage,
      balance_error: balanceError || undefined,
      usage_error: usageError || undefined,
      keys_count: dbKeys.length,
      synced_at: nowISO,
      saved_count: savedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('火山引擎 sync-data 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '同步失败',
    });
  }
}

