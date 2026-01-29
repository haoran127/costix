import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../_lib/auth.js';
import { generateVolcengineSignature } from '../_lib/volcengine-signature.js';

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

      // 火山引擎的 admin_api_key_encrypted 格式为 "access_key_id:secret_access_key_base64"
      // AK 部分是明文，SK 部分是 Base64 编码的
      const adminKeyValue = account.admin_api_key_encrypted;
      const parts = adminKeyValue.split(':');
      
      if (parts.length < 2) {
        return res.status(400).json({ 
          success: false, 
          error: 'Admin Key 格式错误，应为 "AK:SK" 格式（SK 为 Base64 编码）'
        });
      }
      
      adminAccessKeyId = parts[0];
      const secretAccessKeyBase64 = parts.slice(1).join(':'); // 如果 SK 中包含冒号，重新组合
      
      // 解码 SK（Base64）
      try {
        adminSecretAccessKey = Buffer.from(secretAccessKeyBase64, 'base64').toString('utf-8');
      } catch (e) {
        return res.status(400).json({ 
          success: false, 
          error: 'SecretAccessKey Base64 解码失败: ' + (e instanceof Error ? e.message : String(e))
        });
      }
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
          // 火山引擎余额API返回的单位已经是元，不需要除以100
          const availableBalance = result.AvailableBalance ? parseFloat(result.AvailableBalance) : 0;
          balance = {
            available_balance: availableBalance,
            cash_balance: result.CashBalance ? parseFloat(result.CashBalance) : 0,
            credit_limit: result.CreditLimit ? parseFloat(result.CreditLimit) : 0,
            frozen_balance: result.FrozenBalance ? parseFloat(result.FrozenBalance) : 0,
          };
          
          // 调试：打印余额数据
          console.log('[volcengine/sync-data] 余额查询结果:', {
            AvailableBalance: result.AvailableBalance,
            parsed_available_balance: availableBalance,
            CashBalance: result.CashBalance,
            CreditLimit: result.CreditLimit,
            FrozenBalance: result.FrozenBalance,
            full_result: result
          });
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
            StartTime: Math.floor(monthStart.getTime() / 1000), // Unix 时间戳（秒）
            EndTime: Math.floor(monthEnd.getTime() / 1000), // Unix 时间戳（秒）
            Interval: 86400, // 按天聚合
          }),
          useXContentSha256: true, // 火山方舟 API 需要 X-Content-Sha256 头
        });

        const usageRequestBody = JSON.stringify({
          StartTime: Math.floor(monthStart.getTime() / 1000),
          EndTime: Math.floor(monthEnd.getTime() / 1000),
          Interval: 86400,
        });

        const usageResponse = await fetch(usageSignature.requestUrl, {
          method: 'POST',
          headers: {
            Authorization: usageSignature.authorization,
            'Content-Type': 'application/json',
            Host: usageSignature.host,
            'X-Content-Sha256': usageSignature.xContentSha256 || '',
            'X-Date': usageSignature.xDate,
          },
          body: usageRequestBody,
        });

        const usageData = await usageResponse.json();

        // 调试：打印完整的用量 API 响应
        console.log('[volcengine/sync-data] GetUsage API 响应:', JSON.stringify(usageData, null, 2));

        if (usageData.ResponseMetadata && usageData.ResponseMetadata.Error) {
          usageError = usageData.ResponseMetadata.Error.Message || '用量查询失败';
        } else if (usageData.Result) {
          const result = usageData.Result;
          
          // 火山引擎 GetUsage API 返回的数据结构可能是 UsageResults 数组
          if (result.UsageResults && Array.isArray(result.UsageResults)) {
            let promptTokens = 0;
            let completionTokens = 0;
            let imageCount = 0;
            
            for (const usageResult of result.UsageResults) {
              const name = usageResult.Name || '';
              const metricItems = usageResult.MetricItems || [];
              
              // 计算该指标的总值
              let totalValue = 0;
              for (const item of metricItems) {
                const values = item.Values || [];
                totalValue += values.reduce((sum: number, v: any) => sum + (v.Value || 0), 0);
              }
              
              if (name === 'PromptTokens') {
                promptTokens = totalValue;
              } else if (name === 'CompletionTokens') {
                completionTokens = totalValue;
              } else if (name === 'ImageCount') {
                imageCount = totalValue;
              }
            }
            
            usage = {
              total_tokens: promptTokens + completionTokens,
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              image_count: imageCount,
              request_count: 0, // 如果 API 返回了请求数，可以添加
            };
            
            // 调试：打印计算后的用量数据
            console.log('[volcengine/sync-data] 计算后的用量数据:', {
              promptTokens,
              completionTokens,
              total_tokens: usage.total_tokens,
              imageCount
            });
          } else {
            // 兼容旧的数据结构
            usage = {
              total_tokens: result.TotalTokens || 0,
              prompt_tokens: result.PromptTokens || 0,
              completion_tokens: result.CompletionTokens || 0,
              request_count: result.RequestCount || 0,
            };
          }
        }
      } catch (err) {
        usageError = (err as Error).message;
      }
    }

    // 调试：打印最终要保存的用量数据
    console.log('[volcengine/sync-data] 最终用量数据:', {
      usage,
      usageError,
      dbKeysCount: dbKeys.length,
      monthStartStr
    });

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
    
    // 调试：打印第一条记录示例
    if (records.length > 0) {
      console.log('[volcengine/sync-data] 第一条用量记录示例:', JSON.stringify(records[0], null, 2));
    }

    // 5. 保存用量记录（使用 PATCH + INSERT 策略，避免 upsert 的唯一约束问题）
    let savedCount = 0;
    const errors: any[] = [];

    for (const record of records) {
      try {
        // 先尝试更新现有记录
        const { data: existingData, error: selectError } = await supabase
          .from('llm_api_key_usage')
          .select('id')
          .eq('api_key_id', record.api_key_id)
          .eq('period_start', record.period_start)
          .maybeSingle();

        if (selectError) throw selectError;

        if (existingData) {
          // 记录存在，执行更新（PATCH）
          const { error: updateError } = await supabase
            .from('llm_api_key_usage')
            .update({
              balance: record.balance,
              credit_limit: record.credit_limit,
              token_usage_total: record.token_usage_total,
              token_usage_monthly: record.token_usage_monthly,
              prompt_tokens_total: record.prompt_tokens_total,
              completion_tokens_total: record.completion_tokens_total,
              synced_at: record.synced_at,
              sync_status: record.sync_status,
              raw_response: record.raw_response,
            })
            .eq('id', existingData.id);

          if (updateError) throw updateError;
        } else {
          // 记录不存在，执行插入（INSERT）
          const { error: insertError } = await supabase
            .from('llm_api_key_usage')
            .insert(record);

          if (insertError) throw insertError;
        }

        savedCount++;
        
        // 调试：打印保存后的数据
        if (savedCount === 1) {
          console.log('[volcengine/sync-data] 第一条记录保存成功:', {
            api_key_id: record.api_key_id,
            token_usage_monthly: record.token_usage_monthly,
            token_usage_total: record.token_usage_total,
            method: existingData ? 'UPDATE' : 'INSERT'
          });
        }
      } catch (err) {
        console.error('[volcengine/sync-data] 保存记录失败:', {
          api_key_id: record.api_key_id,
          error: (err as Error).message,
          record
        });
        errors.push({
          api_key_id: record.api_key_id,
          error: (err as Error).message,
        });
      }
    }
    
    console.log('[volcengine/sync-data] 保存完成:', {
      savedCount,
      totalRecords: records.length,
      errorsCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

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

