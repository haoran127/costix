import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// 同步间隔配置（毫秒）
const SYNC_INTERVALS = {
  default: 60 * 60 * 1000,  // 默认 1 小时
};

// 每次最多处理的账户数
const MAX_ACCOUNTS_PER_RUN = 3;

// 账户之间的间隔（毫秒）
const DELAY_BETWEEN_ACCOUNTS = 10000; // 10 秒

// 延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 同步 OpenAI 账户
async function syncOpenAIAccount(account: any) {
  const adminKey = account.admin_api_key_encrypted;
  if (!adminKey) return { success: false, error: 'No admin key' };

  try {
    // 获取该账户下的所有 keys
    const response = await fetch('https://api.openai.com/v1/organization/api_keys', {
      headers: {
        'Authorization': `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json() as { data?: any[] };
    const keys = data.data || [];

    // 更新数据库中的 keys
    for (const key of keys) {
      await supabase?.from('llm_api_keys').upsert({
        platform_key_id: key.id,
        platform: 'openai',
        name: key.name || `OpenAI Key ${key.id.slice(-4)}`,
        status: key.is_active ? 'active' : 'inactive',
        platform_account_id: account.id,
        tenant_id: account.tenant_id,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'platform_key_id',
      });
    }

    return { success: true, keys_count: keys.length };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// 同步 OpenRouter 账户
async function syncOpenRouterAccount(account: any) {
  const adminKey = account.admin_api_key_encrypted;
  if (!adminKey) return { success: false, error: 'No admin key' };

  try {
    // 获取 keys
    const response = await fetch('https://openrouter.ai/api/v1/keys', {
      headers: {
        'Authorization': `Bearer ${adminKey}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json() as { data?: any[] };
    const keys = data.data || [];

    for (const key of keys) {
      await supabase?.from('llm_api_keys').upsert({
        platform_key_id: key.hash || key.id,
        platform: 'openrouter',
        name: key.name || `OpenRouter Key`,
        status: key.disabled ? 'inactive' : 'active',
        platform_account_id: account.id,
        tenant_id: account.tenant_id,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'platform_key_id',
      });
    }

    // 获取余额
    const creditsRes = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { 'Authorization': `Bearer ${adminKey}` },
    });
    
    if (creditsRes.ok) {
      const credits = await creditsRes.json() as { data?: { total_credits?: number; total_usage?: number } };
      await supabase?.from('llm_platform_accounts').update({
        total_balance: credits.data?.total_credits || 0,
        updated_at: new Date().toISOString(),
      }).eq('id', account.id);
    }

    return { success: true, keys_count: keys.length };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// 同步 Claude 账户
async function syncClaudeAccount(account: any) {
  const adminKey = account.admin_api_key_encrypted;
  if (!adminKey) return { success: false, error: 'No admin key' };

  try {
    const response = await fetch('https://api.anthropic.com/v1/api_keys', {
      headers: {
        'x-api-key': adminKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json() as { data?: any[] };
    const keys = data.data || [];

    for (const key of keys) {
      await supabase?.from('llm_api_keys').upsert({
        platform_key_id: key.id,
        platform: 'anthropic',
        name: key.name || `Claude Key`,
        status: key.status === 'active' ? 'active' : 'inactive',
        platform_account_id: account.id,
        tenant_id: account.tenant_id,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'platform_key_id',
      });
    }

    return { success: true, keys_count: keys.length };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// 同步单个账户
async function syncAccount(account: any) {
  console.log(`[sync] Syncing ${account.platform} account: ${account.name}`);
  
  let result;
  switch (account.platform) {
    case 'openai':
      result = await syncOpenAIAccount(account);
      break;
    case 'openrouter':
      result = await syncOpenRouterAccount(account);
      break;
    case 'anthropic':
      result = await syncClaudeAccount(account);
      break;
    default:
      result = { success: false, error: `Unsupported platform: ${account.platform}` };
  }

  // 更新账户的同步状态
  await supabase?.from('llm_platform_accounts').update({
    last_verified_at: new Date().toISOString(),
    error_message: result.success ? null : result.error,
    updated_at: new Date().toISOString(),
  }).eq('id', account.id);

  console.log(`[sync] ${account.platform} account ${account.name}: ${result.success ? 'OK' : result.error}`);
  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 验证 Cron 密钥（防止恶意调用）
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // 也允许 Vercel Cron 的调用（没有 auth header 但来自 Vercel）
    const isVercelCron = req.headers['x-vercel-cron'] === '1';
    if (!isVercelCron) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - SYNC_INTERVALS.default);

    // 查询需要同步的账户
    const { data: accounts, error } = await supabase
      .from('llm_platform_accounts')
      .select('*')
      .eq('status', 'active')
      .or(`last_verified_at.is.null,last_verified_at.lt.${oneHourAgo.toISOString()}`)
      .order('last_verified_at', { ascending: true, nullsFirst: true })
      .limit(MAX_ACCOUNTS_PER_RUN);

    if (error) {
      console.error('[sync] Failed to fetch accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }

    if (!accounts || accounts.length === 0) {
      console.log('[sync] No accounts need syncing');
      return res.json({ message: 'No accounts need syncing', synced: 0 });
    }

    console.log(`[sync] Found ${accounts.length} accounts to sync`);

    const results = [];
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const result = await syncAccount(account);
      results.push({
        account_id: account.id,
        platform: account.platform,
        name: account.name,
        ...result,
      });

      // 账户之间间隔，防止 API 限流
      if (i < accounts.length - 1) {
        await sleep(DELAY_BETWEEN_ACCOUNTS);
      }
    }

    return res.json({
      message: 'Sync completed',
      synced: accounts.length,
      results,
    });
  } catch (err) {
    console.error('[sync] Error:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
}

