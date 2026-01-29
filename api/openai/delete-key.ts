import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest, verifyTenantAccess } from '../_lib/auth.js';

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

    const { admin_key, project_id, key_id, db_key_id, key_name } = req.body;

    // 验证必需参数
    if (!admin_key) {
      return res.status(400).json({ success: false, error: '缺少 Admin Key' });
    }
    if (!project_id) {
      return res.status(400).json({ success: false, error: '缺少 Project ID' });
    }
    if (!key_id) {
      return res.status(400).json({ success: false, error: '缺少要删除的 Key ID (platform_key_id)' });
    }

    // 调用 OpenAI API 删除 Key
    const openaiResponse = await fetch(
      `https://api.openai.com/v1/organization/projects/${project_id}/api_keys/${key_id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${admin_key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const openaiData = await openaiResponse.json();
    let openaiDeleted = true;
    let alreadyDeleted = false;

    // 检查 OpenAI API 错误
    if (!openaiResponse.ok && openaiData.error) {
      // 如果是 404，说明 Key 已经不存在，继续删除数据库记录
      if (
        openaiData.error.code === 'not_found' ||
        openaiData.error.type === 'invalid_request_error' ||
        openaiResponse.status === 404
      ) {
        openaiDeleted = false;
        alreadyDeleted = true;
      } else {
        return res.status(openaiResponse.status || 400).json({
          success: false,
          error: openaiData.error.message || 'OpenAI API 调用失败',
          code: openaiData.error.code,
        });
      }
    }

    // 如果有数据库 ID，验证权限并删除数据库记录
    if (db_key_id) {
      // 先验证用户是否有权限删除这个 key
      const { data: keyData, error: keyError } = await supabase
        .from('llm_api_keys')
        .select('tenant_id, created_by')
        .eq('id', db_key_id)
        .single();

      if (keyError || !keyData) {
        return res.status(404).json({
          success: false,
          error: '未找到要删除的 API Key',
        });
      }

      // 验证权限：必须是创建者或同租户成员
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
      const { error: deleteError } = await supabase
        .from('llm_api_keys')
        .delete()
        .eq('id', db_key_id);

      if (deleteError) {
        console.error('删除数据库记录失败:', deleteError);
        return res.status(500).json({
          success: false,
          error: `删除数据库记录失败: ${deleteError.message}`,
        });
      }

      return res.status(200).json({
        success: true,
        message: `API Key "${key_name || key_id}" 已完全删除`,
        key_id,
        db_deleted: true,
        openai_deleted: openaiDeleted,
        already_deleted: alreadyDeleted,
      });
    }

    // 没有数据库 ID，只返回 OpenAI 删除结果
    return res.status(200).json({
      success: true,
      message: `API Key "${key_name || key_id}" 已从 OpenAI 删除`,
      key_id,
      db_deleted: false,
      openai_deleted: openaiDeleted,
      already_deleted: alreadyDeleted,
    });
  } catch (error) {
    console.error('删除 OpenAI Key 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除失败',
    });
  }
}

