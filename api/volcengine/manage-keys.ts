import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest, verifyTenantAccess } from '../_lib/auth.js';
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

    const {
      action,
      access_key_id,
      secret_access_key,
      platform_account_id,
      user_name,
      target_access_key_id,
      key_name,
      business,
      owner_name,
      owner_email,
      owner_phone,
      db_key_id,
    } = req.body;

    // 验证必需参数
    if (!action) {
      return res.status(400).json({ success: false, error: '缺少 action 参数（create/delete/list/sync）' });
    }

    const validActions = ['create', 'delete', 'list', 'sync'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, error: 'action 必须是 create/delete/list/sync 之一' });
    }

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

    // 根据 action 验证额外参数
    if (action === 'create' && !user_name) {
      return res.status(400).json({ success: false, error: '创建 Key 需要提供 user_name (IAM 用户名)' });
    }

    if (action === 'delete' && !target_access_key_id) {
      return res.status(400).json({ success: false, error: '删除 Key 需要提供 target_access_key_id' });
    }

    // sync 操作 - 同步 Keys 列表并保存到数据库（使用火山方舟 API）
    if (action === 'sync') {
      // 1. 调用火山方舟 ListApiKeys API
      const projectName = req.body.project_name || 'default';
      const requestBody = JSON.stringify({ ProjectName: projectName });

      const listKeysSignature = generateVolcengineSignature({
        accessKeyId: adminAccessKeyId,
        secretAccessKey: adminSecretAccessKey,
        service: 'ark',
        region: 'cn-beijing',
        host: 'ark.cn-beijing.volcengineapi.com',
        method: 'POST',
        path: '/',
        queryParams: {
          Action: 'ListApiKeys',
          Version: '2024-01-01',
        },
        requestBody,
        useXContentSha256: true, // 火山方舟 API 需要 X-Content-Sha256 头
      });

      const keysResponse = await fetch(listKeysSignature.requestUrl, {
        method: 'POST',
        headers: {
          Authorization: listKeysSignature.authorization,
          'Content-Type': 'application/json',
          Host: listKeysSignature.host,
          'X-Content-Sha256': listKeysSignature.xContentSha256 || '',
          'X-Date': listKeysSignature.xDate,
        },
        body: requestBody,
      });

      const keysData = await keysResponse.json();

      // 调试：打印完整的 API 响应
      console.log('[volcengine/sync] ListApiKeys API 响应:', JSON.stringify(keysData, null, 2));

      if (keysData.ResponseMetadata && keysData.ResponseMetadata.Error) {
        const err = keysData.ResponseMetadata.Error;
        console.error('[volcengine/sync] 获取 Keys 列表失败:', err);
        return res.status(400).json({
          success: false,
          error: err.Message || '获取 Keys 列表失败',
          code: err.Code,
        });
      }

      const result = keysData.Result || {};
      const items = result.Items || [];
      
      console.log('[volcengine/sync] API 返回的 Keys 数量:', items.length);
      if (items.length > 0) {
        console.log('[volcengine/sync] 第一个 Key 的完整数据:', JSON.stringify(items[0], null, 2));
      }

      // 2. 转换数据格式（从火山方舟格式转换为数据库格式）
      const accessKeys = items.map((key: any) => ({
        Id: key.Id,
        Name: key.Name,
        ApiKey: key.PrimaryKey || key.ApiKey || key.Key || '',
        Status: key.Status,
        ProjectName: key.ProjectName,
        CreateTime: key.CreateTime,
        UpdateTime: key.UpdateTime,
        LastAccessTime: key.LastAccessTime,
        UserId: key.UserId,
        Tags: key.Tags,
      }));

      // 调试：打印 API 返回的原始数据
      console.log('[volcengine/sync] API 返回的 Keys 数量:', accessKeys.length);
      if (accessKeys.length > 0) {
        console.log('[volcengine/sync] 第一个 Key 的完整数据:', JSON.stringify(accessKeys[0], null, 2));
      }

      if (accessKeys.length === 0) {
        return res.status(200).json({
          success: true,
          action: 'sync',
          keys_count: 0,
          keys: [],
          created_count: 0,
          updated_count: 0,
          synced_at: new Date().toISOString(),
        });
      }

      // 2. 查询数据库中的 Keys 映射（只查询当前租户的 keys）
      let dbKeysQuery = supabase
        .from('llm_api_keys')
        .select('id, platform_key_id, name')
        .eq('platform', 'volcengine');

      // 只有当 tenant_id 不为 null 时才添加过滤条件
      if (userInfo.tenantId) {
        dbKeysQuery = dbKeysQuery.eq('tenant_id', userInfo.tenantId);
      } else {
        // 如果 tenant_id 为 null，只查询 tenant_id 为 null 的记录
        dbKeysQuery = dbKeysQuery.is('tenant_id', null);
      }

      if (platform_account_id) {
        dbKeysQuery = dbKeysQuery.eq('platform_account_id', platform_account_id);
      }

      const { data: dbKeys, error: dbError } = await dbKeysQuery;

      if (dbError) {
        console.error('[volcengine/sync] 查询数据库 Keys 失败:', dbError);
        return res.status(500).json({
          success: false,
          error: `查询数据库 Keys 失败: ${dbError.message}`,
        });
      }

      // 3. 创建 platform_key_id -> db_id 映射
      const keyIdMap = new Map<string, { id: string; name: string }>();
      (dbKeys || []).forEach((k: any) => {
        if (k.platform_key_id) {
          keyIdMap.set(k.platform_key_id, { id: k.id, name: k.name });
        }
      });

      // 4. 分离新 Keys 和已有 Keys
      const nowISO = new Date().toISOString();
      const keysToCreate: any[] = [];
      const keysToUpdate: any[] = [];

      accessKeys.forEach((k: any) => {
        // 火山方舟 API 返回的字段：Id, Name, Key (脱敏的 API Key), Status, ProjectName, CreateTime, UpdateTime, LastAccessTime, UserId, Tags
        const platformKeyId = String(k.Id); // platform_key_id 使用 Id（数字ID转为字符串）
        const existing = keyIdMap.get(platformKeyId);

        // 调试：打印每个 Key 的完整数据
        console.log('[volcengine/sync] Key 数据:', JSON.stringify(k, null, 2));

        // Key 名称使用 Name 字段（如 "api-key-agentserverv1"）
        // 如果数据库已有记录，保留原有名称；否则使用 Name
        const keyName = existing?.name || k.Name || `火山引擎 Key ${k.Id}`;
        
        // API Key 值（脱敏后的，如 "cb81****************************5441"）
        // 注意：映射后的字段名是 ApiKey（大写），不是 Key
        const apiKeyValue = k.ApiKey || '';
        // 从脱敏的 Key 中提取前缀和后缀（格式通常是 "cb81****************************5441"）
        const apiKeyPrefix = apiKeyValue.substring(0, 8) || '';
        const apiKeySuffix = apiKeyValue.slice(-4) || '';

        console.log('[volcengine/sync] Key 名称:', keyName, 'Id:', k.Id, 'ApiKey:', apiKeyValue);

        // 解析时间字段
        let createdAt: string | null = null;
        let lastUsedAt: string | null = null;
        
        if (k.CreateTime) {
          try {
            createdAt = new Date(k.CreateTime).toISOString();
          } catch (e) {
            console.error('[volcengine/sync] CreateTime 解析失败:', k.CreateTime);
          }
        }
        
        if (k.LastAccessTime) {
          try {
            lastUsedAt = new Date(k.LastAccessTime).toISOString();
          } catch (e) {
            console.error('[volcengine/sync] LastAccessTime 解析失败:', k.LastAccessTime);
          }
        }

        const keyData = {
          platform: 'volcengine',
          platform_key_id: platformKeyId,
          name: keyName,
          api_key_encrypted: apiKeyValue || `[synced:${k.Id}]`, // 保存脱敏的 API Key 或标记
          api_key_prefix: apiKeyPrefix,
          api_key_suffix: apiKeySuffix,
          status: k.Status === 'Active' ? 'active' : 'inactive',
          platform_account_id: platform_account_id || null,
          last_synced_at: nowISO,
          last_used_at: lastUsedAt, // 使用 LastAccessTime
          creation_method: 'sync',
          tenant_id: userInfo.tenantId || null,
          // 注意：created_at 由数据库自动设置，不需要手动设置
        };

        if (existing) {
          // 已有 Key，更新
          keysToUpdate.push({
            id: existing.id,
            ...keyData,
          });
        } else {
          // 新 Key，创建（火山方舟 API 返回脱敏的 API Key）
          keysToCreate.push({
            ...keyData,
          });
        }
      });

      // 5. 创建新 Keys
      let createdCount = 0;
      if (keysToCreate.length > 0) {
        const { data: insertedKeys, error: insertError } = await supabase
          .from('llm_api_keys')
          .insert(keysToCreate)
          .select('id, platform_key_id');

        if (insertError) {
          console.error('[volcengine/sync] 创建新 Keys 失败:', insertError);
          return res.status(500).json({
            success: false,
            error: `创建新 Keys 失败: ${insertError.message}`,
          });
        }

        createdCount = insertedKeys?.length || 0;
      }

      // 6. 更新已有 Keys
      let updatedCount = 0;
      if (keysToUpdate.length > 0) {
        for (const keyUpdate of keysToUpdate) {
          const { error: updateError } = await supabase
            .from('llm_api_keys')
            .update({
              name: keyUpdate.name,
              status: keyUpdate.status,
              last_synced_at: keyUpdate.last_synced_at,
            })
            .eq('id', keyUpdate.id);

          if (updateError) {
            console.error(`[volcengine/sync] 更新 Key ${keyUpdate.id} 失败:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }

      return res.status(200).json({
        success: true,
        action: 'sync',
        message: `同步完成！新增 ${createdCount} 个，更新 ${updatedCount} 个 Keys`,
        keys_count: accessKeys.length,
        created_count: createdCount,
        updated_count: updatedCount,
        synced_at: nowISO,
      });
    }

    // API 参数映射（create/delete/list）
    const actionMap: Record<string, string> = {
      create: 'CreateAccessKey',
      delete: 'DeleteAccessKey',
      list: 'ListAccessKeys',
    };

    const apiAction = actionMap[action];
    
    if (!apiAction) {
      return res.status(400).json({ success: false, error: `未知的 action: ${action}` });
    }
    
    const service = 'iam';
    const region = 'cn-north-1';
    const host = 'iam.volcengineapi.com';
    const method = 'GET';

    // 构建查询参数
    const queryParams: Record<string, string> = {
      Action: apiAction,
      Version: '2018-01-01',
    };

    // 根据 action 添加额外参数
    if (action === 'create' && user_name) {
      queryParams.UserName = user_name;
    }
    if (action === 'delete' && target_access_key_id) {
      queryParams.AccessKeyId = target_access_key_id;
      if (user_name) {
        queryParams.UserName = user_name;
      }
    }
    if (action === 'list' && user_name) {
      queryParams.UserName = user_name;
    }

    // 生成签名
    const signature = generateVolcengineSignature({
      accessKeyId: adminAccessKeyId,
      secretAccessKey: adminSecretAccessKey,
      service,
      region,
      host,
      method,
      path: '/',
      queryParams,
    });

    // 调用火山引擎 API
    const apiResponse = await fetch(signature.requestUrl, {
      method,
      headers: {
        Authorization: signature.authorization,
        'X-Date': signature.xDate,
        Host: signature.host,
        'Content-Type': 'application/json',
      },
    });

    const apiData = await apiResponse.json();

    // 检查 API 错误
    if (apiData.ResponseMetadata && apiData.ResponseMetadata.Error) {
      const err = apiData.ResponseMetadata.Error;
      let errorMsg = err.Message || '火山引擎 API 调用失败';

      // 友好错误提示
      if (err.Code === 'InvalidAccessKeyId') {
        errorMsg = 'AccessKeyId 无效或不存在';
      } else if (err.Code === 'SignatureDoesNotMatch') {
        errorMsg = '签名验证失败，请检查 SecretAccessKey 是否正确';
      } else if (err.Code === 'NoSuchEntity') {
        errorMsg = '用户或 AccessKey 不存在';
      } else if (err.Code === 'LimitExceeded') {
        errorMsg = 'AccessKey 数量已达上限';
      } else if (err.Code === 'AccessDenied') {
        errorMsg = '权限不足，请检查 Admin Key 权限';
      }

      return res.status(400).json({
        success: false,
        error: errorMsg,
        code: err.Code,
      });
    }

    // 处理成功响应
    if (action === 'create') {
      const result = apiData.Result || {};
      const accessKey = result.AccessKey || {};

      if (!accessKey.AccessKeyId) {
        return res.status(500).json({ success: false, error: '创建失败，未返回 AccessKey 信息' });
      }

      const fullAK = accessKey.AccessKeyId;
      const fullSK = accessKey.SecretAccessKey || '';
      const keyPrefix = fullAK.substring(0, 8);
      const keySuffix = fullAK.slice(-4);

      // 保存到数据库
      const { data: dbData, error: dbError } = await supabase
        .from('llm_api_keys')
        .insert({
          name: key_name || user_name,
          platform: 'volcengine',
          platform_key_id: fullAK,
          platform_account_id: platform_account_id || null,
          api_key_encrypted: `${fullAK}:${fullSK}`,
          api_key_prefix: keyPrefix,
          api_key_suffix: keySuffix,
          status: accessKey.Status === 'Active' ? 'active' : 'disabled',
          business: business || null,
          owner_name: owner_name || null,
          owner_email: owner_email || null,
          owner_phone: owner_phone || null,
          creation_method: 'api',
          created_by: userInfo.userId,
          tenant_id: userInfo.tenantId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        return res.status(500).json({
          success: false,
          error: `保存到数据库失败: ${dbError.message}`,
        });
      }

      // 如果有责任人，创建绑定关系
      if (userInfo.userId && dbData?.id) {
        await supabase.from('llm_api_key_owners').insert({
          api_key_id: dbData.id,
          user_id: userInfo.userId,
          is_primary: true,
          role: 'owner',
        });
      }

      return res.status(200).json({
        success: true,
        message: `AccessKey "${key_name || user_name}" 创建成功`,
        id: dbData.id,
        name: key_name || user_name,
        access_key_id: fullAK,
        secret_access_key: fullSK,
        masked_key: `${keyPrefix}****${keySuffix}`,
        platform: 'volcengine',
        user_name,
        business,
        created_at: accessKey.CreateDate || new Date().toISOString(),
        warning: '请妥善保存 SecretAccessKey，它只会显示一次！',
      });
    }

    if (action === 'delete') {
      // 如果有数据库 ID，验证权限并删除数据库记录
      if (db_key_id) {
        const { data: keyData, error: keyError } = await supabase
          .from('llm_api_keys')
          .select('tenant_id, created_by')
          .eq('id', db_key_id)
          .single();

        if (!keyError && keyData) {
          const hasPermission =
            keyData.created_by === userInfo.userId ||
            (keyData.tenant_id && (await verifyTenantAccess(userInfo.userId, keyData.tenant_id)));

          if (!hasPermission) {
            return res.status(403).json({
              success: false,
              error: '无权删除此 API Key',
            });
          }

          // 删除责任人关联
          await supabase.from('llm_api_key_owners').delete().eq('api_key_id', db_key_id);

          // 删除用量记录
          await supabase.from('llm_api_key_usage').delete().eq('api_key_id', db_key_id);

          // 删除 Key 记录
          await supabase.from('llm_api_keys').delete().eq('id', db_key_id);
        }
      }

      return res.status(200).json({
        success: true,
        message: `AccessKey "${target_access_key_id}" 已完全删除`,
        target_access_key_id,
        db_deleted: !!db_key_id,
        volcengine_deleted: true,
      });
    }

    if (action === 'list') {
      const result = apiData.Result || {};
      const accessKeys = result.AccessKeyMetadata || [];

      const formattedKeys = accessKeys.map((key: any) => ({
        access_key_id: key.AccessKeyId,
        status: key.Status,
        user_name: key.UserName,
        create_date: key.CreateDate,
        update_date: key.UpdateDate,
      }));

      return res.status(200).json({
        success: true,
        action: 'list',
        keys: formattedKeys,
        total: formattedKeys.length,
      });
    }

    return res.status(400).json({ success: false, error: '未知操作' });
  } catch (error) {
    console.error('火山引擎 manage-keys 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '操作失败',
    });
  }
}

