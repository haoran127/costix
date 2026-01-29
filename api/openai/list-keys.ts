import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../_lib/auth.js';

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

    const { admin_key, project_id, platform_account_id } = req.body;

    let adminKey = admin_key;

    // 如果没有提供 admin_key，从数据库获取
    if (!adminKey && platform_account_id) {
      const { data: account, error: accountError } = await supabase
        .from('llm_platform_accounts')
        .select('admin_api_key_encrypted, project_id, status, platform')
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

    // 如果没有提供 project_id，先获取所有 projects
    let projects: Array<{ id: string; name: string }> = [];
    
    if (!project_id) {
      // 获取所有 projects
      const projectsResponse = await fetch(
        'https://api.openai.com/v1/organization/projects?limit=100&include_archived=false',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const projectsData = await projectsResponse.json();
      if (!projectsResponse.ok || projectsData.error) {
        return res.status(projectsResponse.status || 400).json({
          success: false,
          error: projectsData.error?.message || '获取项目列表失败',
          code: projectsData.error?.code,
        });
      }

      projects = (projectsData.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
      }));
    } else {
      // 如果提供了 project_id，只查询指定的 project
      projects = [{ id: project_id, name: '' }];
    }

    // 遍历所有 projects，获取每个 project 的 keys
    const allKeys: Array<{
      id: string;
      name: string;
      redacted_value: string;
      created_at: string | null;
      owner: any;
      platform: string;
      project_id: string;
      project_name: string;
    }> = [];

    for (const project of projects) {
      try {
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
            allKeys.push({
              id: key.id,
              name: key.name,
              redacted_value: key.redacted_value,
              created_at: key.created_at ? new Date(key.created_at * 1000).toISOString() : null,
              owner: key.owner,
              platform: 'openai',
              project_id: project.id,
              project_name: project.name,
            });
          });
        }
      } catch (err) {
        console.error(`获取 Project ${project.id} 的 Keys 失败:`, err);
        // 继续处理其他 projects
      }
    }

    // 保存 keys 到数据库（如果提供了 platform_account_id）
    let savedCount = 0;
    let keysToSave: any[] = [];
    let keysToUpdate: any[] = [];
    let existingKeys: any[] = [];
    
    if (platform_account_id && allKeys.length > 0) {
      console.log(`[list-keys] 开始保存 keys，platform_account_id: ${platform_account_id}, keys数量: ${allKeys.length}`);
      console.log(`[list-keys] 调用来源: ${req.headers['user-agent'] || 'unknown'}, 时间戳: ${new Date().toISOString()}`);
      
      // 获取数据库中已有的 keys（用于匹配）
      const { data: existingKeysData, error: existingError } = await supabase
        .from('llm_api_keys')
        .select('id, name, platform_key_id, project_id')
        .eq('platform', 'openai')
        .eq('platform_account_id', platform_account_id);

      if (existingError) {
        console.error('[list-keys] 查询现有 keys 失败:', existingError);
        return res.status(500).json({
          success: false,
          error: `查询现有 keys 失败: ${existingError.message}`,
          details: existingError,
        });
      }

      existingKeys = existingKeysData || [];
      console.log(`[list-keys] 数据库现有 keys 数量: ${existingKeys.length}`);

      const existingKeyMap = new Map<string, { id: string; name: string; project_id: string }>();
      existingKeys.forEach((k: any) => {
        if (k.platform_key_id) {
          existingKeyMap.set(k.platform_key_id, k);
        }
      });

      // 准备要保存的 keys
      for (const key of allKeys) {
        const existing = existingKeyMap.get(key.id);
        const keyPrefix = key.redacted_value?.substring(0, 12) || 'sk-';
        const keySuffix = key.redacted_value?.slice(-4) || '****';

        if (existing) {
          // 更新现有记录
          keysToUpdate.push({
            id: existing.id,
            name: key.name,
            project_id: key.project_id,
            last_synced_at: new Date().toISOString(),
          });
        } else {
          // 插入新记录（设置 tenant_id）
          keysToSave.push({
            name: key.name,
            platform: 'openai',
            platform_key_id: key.id,
            platform_account_id: platform_account_id,
            project_id: key.project_id,
            organization_id: null,
            api_key_prefix: keyPrefix,
            api_key_suffix: keySuffix,
            status: 'active',
            creation_method: 'sync',
            tenant_id: userInfo.tenantId,
            last_synced_at: new Date().toISOString(),
          });
        }
      }

      console.log(`[list-keys] 准备保存: 新增 ${keysToSave.length} 个，更新 ${keysToUpdate.length} 个`);

      // 批量插入新 keys
      if (keysToSave.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('llm_api_keys')
          .insert(keysToSave)
          .select('id');
        if (insertError) {
          console.error('保存新 Keys 失败:', insertError);
          // 返回错误信息，不要静默失败
          return res.status(500).json({
            success: false,
            error: `保存 Keys 到数据库失败: ${insertError.message}`,
            details: insertError,
            keys_to_save_count: keysToSave.length,
          });
        } else {
          savedCount += insertedData?.length || keysToSave.length;
          console.log(`成功保存 ${savedCount} 个新 Keys`);
        }
      }

      // 批量更新现有 keys
      if (keysToUpdate.length > 0) {
        for (const keyUpdate of keysToUpdate) {
          const { error: updateError } = await supabase
            .from('llm_api_keys')
            .update({
              name: keyUpdate.name,
              project_id: keyUpdate.project_id,
              last_synced_at: keyUpdate.last_synced_at,
            })
            .eq('id', keyUpdate.id);
          if (updateError) {
            console.error(`更新 Key ${keyUpdate.id} 失败:`, updateError);
          } else {
            savedCount++;
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      keys: allKeys,
      total: allKeys.length,
      projects_count: projects.length,
      saved_count: savedCount,
      ...(platform_account_id && {
        debug: {
          platform_account_id,
          keys_found: allKeys.length,
          keys_to_save: keysToSave?.length || 0,
          keys_to_update: keysToUpdate?.length || 0,
          existing_keys_count: existingKeys?.length || 0,
        }
      }),
    });
  } catch (error) {
    console.error('列出 OpenAI Keys 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '列出 Keys 失败',
    });
  }
}

