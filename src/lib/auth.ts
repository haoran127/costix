/**
 * KeyPilot SaaS 认证模块
 * 基于 Supabase Auth，支持多种登录方式
 */

import { createClient, User, Session, AuthError } from '@supabase/supabase-js';

// Supabase 客户端配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase 环境变量未配置');
}

// 创建 Supabase 客户端（用于认证）
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==================== 类型定义 ====================

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  tenantId?: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
  inviteCode?: string;  // 邀请码（可选）
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: Session;
  error?: string;
}

// ==================== 邮箱密码认证 ====================

/**
 * 邮箱密码注册
 */
export async function signUpWithEmail(data: SignUpData): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase 未配置' };
  }

  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name || data.email.split('@')[0],
          invite_code: data.inviteCode,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { success: false, error: getErrorMessage(error) };
    }

    if (!authData.user) {
      return { success: false, error: '注册失败，请稍后重试' };
    }

    // 检查是否需要邮箱验证
    if (!authData.session) {
      return { 
        success: true, 
        user: mapUser(authData.user),
        error: '注册成功！请查收验证邮件完成注册。'
      };
    }

    return {
      success: true,
      user: mapUser(authData.user),
      session: authData.session,
    };
  } catch (err) {
    console.error('注册失败:', err);
    return { success: false, error: '注册失败，请稍后重试' };
  }
}

/**
 * 邮箱密码登录
 */
export async function signInWithEmail(data: SignInData): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase 未配置' };
  }

  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return { success: false, error: getErrorMessage(error) };
    }

    if (!authData.user || !authData.session) {
      return { success: false, error: '登录失败' };
    }

    return {
      success: true,
      user: mapUser(authData.user),
      session: authData.session,
    };
  } catch (err) {
    console.error('登录失败:', err);
    return { success: false, error: '登录失败，请稍后重试' };
  }
}

// ==================== 魔法链接登录 ====================

/**
 * 发送魔法链接（无密码登录）
 */
export async function signInWithMagicLink(email: string): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase 未配置' };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { 
      success: true, 
      error: '登录链接已发送到您的邮箱，请查收。'
    };
  } catch (err) {
    console.error('发送魔法链接失败:', err);
    return { success: false, error: '发送失败，请稍后重试' };
  }
}

// ==================== OAuth 社交登录 ====================

/**
 * Google 登录
 */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) {
    console.error('Supabase 未配置');
    return;
  }

  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

/**
 * GitHub 登录
 */
export async function signInWithGitHub(): Promise<void> {
  if (!supabase) {
    console.error('Supabase 未配置');
    return;
  }

  await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

// ==================== 密码管理 ====================

/**
 * 发送重置密码邮件
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase 未配置' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { 
      success: true, 
      error: '重置密码邮件已发送，请查收。'
    };
  } catch (err) {
    console.error('发送重置密码邮件失败:', err);
    return { success: false, error: '发送失败，请稍后重试' };
  }
}

/**
 * 更新密码
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase 未配置' };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true };
  } catch (err) {
    console.error('更新密码失败:', err);
    return { success: false, error: '更新失败，请稍后重试' };
  }
}

// ==================== 会话管理 ====================

/**
 * 获取当前会话
 */
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * 获取当前用户
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user ? mapUser(user) : null;
}

/**
 * 监听认证状态变化
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null, session: Session | null) => void
) {
  if (!supabase) return { unsubscribe: () => {} };

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      const user = session?.user ? mapUser(session.user) : null;
      callback(user, session);
    }
  );

  return { unsubscribe: () => subscription.unsubscribe() };
}

/**
 * 退出登录
 */
export async function signOut(): Promise<void> {
  if (!supabase) return;

  await supabase.auth.signOut();
}

// ==================== 辅助函数 ====================

/**
 * 映射 Supabase User 到 AuthUser
 */
function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0],
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    tenantId: user.user_metadata?.tenant_id,
    role: user.user_metadata?.role,
  };
}

/**
 * 错误信息映射
 */
function getErrorMessage(error: AuthError): string {
  const messages: Record<string, string> = {
    'Invalid login credentials': '邮箱或密码错误',
    'Email not confirmed': '请先验证邮箱',
    'User already registered': '该邮箱已注册',
    'Password should be at least 6 characters': '密码至少需要6个字符',
    'Unable to validate email address: invalid format': '邮箱格式不正确',
    'Email rate limit exceeded': '请求过于频繁，请稍后再试',
    'For security purposes, you can only request this once every 60 seconds': '请等待60秒后再试',
  };

  return messages[error.message] || error.message || '操作失败，请稍后重试';
}

// ==================== 兼容旧的 Mind 认证（可选保留）====================

// 如果需要保留 Mind 登录兼容，可以在这里导出
// export * from './mind-auth';

