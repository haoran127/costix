import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../_lib/auth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kstwkcdmqzvhzjhnaopw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

    // 调用 OpenAI API 列出项目
    const openaiResponse = await fetch(
      'https://api.openai.com/v1/organization/projects?limit=100&include_archived=false',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const openaiData = await openaiResponse.json();

    if (!openaiResponse.ok || openaiData.error) {
      return res.status(openaiResponse.status || 400).json({
        success: false,
        error: openaiData.error?.message || 'OpenAI API 调用失败',
        code: openaiData.error?.code,
      });
    }

    // 处理返回的 Projects 列表
    const projects = openaiData.data || [];
    const formattedProjects = projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      created_at: p.created_at ? new Date(p.created_at * 1000).toISOString() : null,
    }));

    return res.status(200).json({
      success: true,
      projects: formattedProjects,
      total: formattedProjects.length,
    });
  } catch (error) {
    console.error('列出 OpenAI Projects 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '列出 Projects 失败',
    });
  }
}

