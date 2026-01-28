/**
 * Serverless Functions 认证工具
 * 从请求中提取用户信息并验证权限
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kstwkcdmqzvhzjhnaopw.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * 从请求中提取用户信息
 */
export async function getUserFromRequest(req: VercelRequest): Promise<{
  userId: string;
  tenantId: string | null;
  email: string | null;
} | null> {
  try {
    // 从 Authorization header 获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // 使用 anon key 创建客户端来验证 token
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const {
      data: { user },
      error: userError,
    } = await supabaseAnon.auth.getUser(token);

    if (userError || !user) {
      console.error('获取用户信息失败:', userError);
      return null;
    }

    // 使用 service_role 获取用户的 tenant_id
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('获取用户 profile 失败:', profileError);
      // 即使获取 profile 失败，也返回用户 ID（tenant_id 可能为 null）
      return {
        userId: user.id,
        tenantId: null,
        email: user.email || null,
      };
    }

    return {
      userId: user.id,
      tenantId: profile?.tenant_id || null,
      email: profile?.email || user.email || null,
    };
  } catch (error) {
    console.error('解析用户信息失败:', error);
    return null;
  }
}

/**
 * 验证用户是否有权限访问指定的 tenant_id
 */
export async function verifyTenantAccess(
  userId: string,
  tenantId: string | null
): Promise<boolean> {
  if (!tenantId) {
    return false;
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return false;
    }

    return profile.tenant_id === tenantId;
  } catch (error) {
    console.error('验证租户权限失败:', error);
    return false;
  }
}

