/**
 * Cron Job: 自动同步所有平台的用量数据
 * 
 * 由 Vercel Cron 每天自动调用
 * 也可以手动调用（需要 CRON_SECRET）
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 平台同步配置
const PLATFORM_SYNC_CONFIG: Record<string, {
  listKeysEndpoint?: string;
  syncUsageEndpoint?: string;
  syncCostsEndpoint?: string;
}> = {
  openai: {
    listKeysEndpoint: '/api/openai/list-keys',
    syncUsageEndpoint: '/api/openai/sync-usage',
    syncCostsEndpoint: '/api/openai/sync-costs',
  },
  anthropic: {
    syncCostsEndpoint: '/api/claude/sync-costs',
    syncUsageEndpoint: '/api/claude/sync-data',
  },
  openrouter: {
    // OpenRouter 目前不支持自动同步
  },
  volcengine: {
    syncUsageEndpoint: '/api/volcengine/sync-data',
  },
};

interface SyncResult {
  platform: string;
  accountId: string;
  accountName: string;
  success: boolean;
  message: string;
  details?: any;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许 GET 或 POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 验证 Cron Secret（Vercel Cron 会自动添加 Authorization header）
  const authHeader = req.headers.authorization;
  const cronSecret = authHeader?.replace('Bearer ', '');
  
  // 如果设置了 CRON_SECRET，则验证
  if (CRON_SECRET && cronSecret !== CRON_SECRET) {
    // 也检查 x-vercel-cron-secret header（Vercel Cron 使用）
    const vercelCronSecret = req.headers['x-vercel-cron-secret'];
    if (vercelCronSecret !== CRON_SECRET) {
      console.log('Cron 认证失败');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }

  const startTime = Date.now();
  const results: SyncResult[] = [];
  
  try {
    console.log('[Cron] 开始同步所有平台数据...');

    // 1. 获取所有活跃的平台账号
    const { data: accounts, error: accountsError } = await supabase
      .from('llm_platform_accounts')
      .select('id, name, platform, admin_api_key_encrypted, tenant_id')
      .eq('status', 'active');

    if (accountsError) {
      console.error('[Cron] 获取平台账号失败:', accountsError);
      return res.status(500).json({
        success: false,
        error: '获取平台账号失败',
        details: accountsError.message,
      });
    }

    if (!accounts || accounts.length === 0) {
      return res.status(200).json({
        success: true,
        message: '没有活跃的平台账号需要同步',
        results: [],
      });
    }

    console.log(`[Cron] 找到 ${accounts.length} 个活跃平台账号`);

    // 2. 遍历每个账号进行同步
    for (const account of accounts) {
      const config = PLATFORM_SYNC_CONFIG[account.platform];
      if (!config) {
        results.push({
          platform: account.platform,
          accountId: account.id,
          accountName: account.name,
          success: false,
          message: `平台 ${account.platform} 暂不支持自动同步`,
        });
        continue;
      }

      // 同步用量数据
      if (config.syncUsageEndpoint) {
        try {
          const syncResult = await syncPlatformUsage(
            account.platform,
            account.id,
            account.admin_api_key_encrypted,
            config.syncUsageEndpoint
          );
          
          results.push({
            platform: account.platform,
            accountId: account.id,
            accountName: account.name,
            success: syncResult.success,
            message: syncResult.message,
            details: syncResult.details,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          results.push({
            platform: account.platform,
            accountId: account.id,
            accountName: account.name,
            success: false,
            message: `同步失败: ${errorMsg}`,
          });
        }
      }

      // 同步费用数据（如果支持）
      if (config.syncCostsEndpoint) {
        try {
          const costResult = await syncPlatformCosts(
            account.platform,
            account.id,
            account.admin_api_key_encrypted,
            config.syncCostsEndpoint
          );
          
          // 费用同步结果单独记录
          if (!costResult.success) {
            console.log(`[Cron] ${account.platform} 费用同步: ${costResult.message}`);
          }
        } catch (error) {
          console.log(`[Cron] ${account.platform} 费用同步失败:`, error);
        }
      }
    }

    // 3. 检查告警
    try {
      await checkAlerts();
    } catch (error) {
      console.error('[Cron] 检查告警失败:', error);
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[Cron] 同步完成，耗时 ${duration}ms，成功 ${successCount}，失败 ${failCount}`);

    return res.status(200).json({
      success: true,
      message: `同步完成：${successCount} 成功，${failCount} 失败`,
      duration_ms: duration,
      total_accounts: accounts.length,
      success_count: successCount,
      fail_count: failCount,
      results,
      synced_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Cron] 同步失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      results,
      synced_at: new Date().toISOString(),
    });
  }
}

/**
 * 同步平台用量数据
 */
async function syncPlatformUsage(
  platform: string,
  accountId: string,
  adminKey: string,
  endpoint: string
): Promise<{ success: boolean; message: string; details?: any }> {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 根据不同平台构建请求体
  let body: any = {
    platform_account_id: accountId,
  };

  // 某些平台可能需要直接传 admin_key
  if (platform === 'anthropic' || platform === 'volcengine') {
    body.admin_key = adminKey;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 使用 service role key 作为内部调用的认证
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'x-cron-internal': 'true', // 标记为内部调用
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || `HTTP ${response.status}`,
        details: data,
      };
    }

    return {
      success: true,
      message: data.message || '同步成功',
      details: data.summary,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `请求失败: ${errorMsg}`,
    };
  }
}

/**
 * 同步平台费用数据
 */
async function syncPlatformCosts(
  platform: string,
  accountId: string,
  adminKey: string,
  endpoint: string
): Promise<{ success: boolean; message: string }> {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'x-cron-internal': 'true',
      },
      body: JSON.stringify({
        platform_account_id: accountId,
        admin_key: adminKey,
      }),
    });

    const data = await response.json();
    return {
      success: response.ok,
      message: data.message || data.error || 'Unknown',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 检查并生成告警
 */
async function checkAlerts(): Promise<void> {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    await fetch(`${baseUrl}/api/alerts/check-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'x-cron-internal': 'true',
      },
    });
  } catch (error) {
    console.error('[Cron] 检查告警请求失败:', error);
  }
}

