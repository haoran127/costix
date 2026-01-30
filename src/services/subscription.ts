/**
 * KeyPilot 订阅服务
 * 订阅计划、用户订阅、支付相关接口
 */

import { supabase } from '../lib/supabase';

// ==================== 类型定义 ====================

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_keys: number;
  max_team_members: number;
  max_platform_accounts: number;
  features: SubscriptionFeatures;
  sort_order: number;
  is_active: boolean;
  is_popular: boolean;
}

export interface SubscriptionFeatures {
  export: boolean;
  batch_operations: boolean;
  alerts: boolean;
  api_access: boolean;
  priority_support: boolean;
  custom_branding: boolean;
}

export interface UserSubscription {
  subscription_id: string | null;
  plan_name: string;
  plan_display_name: string;
  status: 'active' | 'trialing' | 'cancelled' | 'expired' | 'past_due';
  max_keys: number;
  max_team_members: number;
  max_platform_accounts: number;
  features: SubscriptionFeatures;
  current_period_end: string | null;
  is_trial: boolean;
}

export interface PaymentRecord {
  id: string;
  subscription_id: string | null;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  payment_provider: string | null;
  payment_method: string | null;
  description: string | null;
  invoice_url: string | null;
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string;
}

// ==================== 订阅计划 ====================

/**
 * 获取所有订阅计划
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('获取订阅计划失败:', err);
    return [];
  }
}

/**
 * 获取单个订阅计划
 */
export async function getSubscriptionPlan(planName: string): Promise<SubscriptionPlan | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('获取订阅计划失败:', err);
    return null;
  }
}

// ==================== 用户订阅 ====================

/**
 * 获取当前用户的订阅信息
 */
export async function getUserSubscription(): Promise<UserSubscription | null> {
  if (!supabase) return getDefaultSubscription();

  try {
    const { data, error } = await supabase.rpc('get_user_subscription');

    if (error) {
      console.warn('获取用户订阅失败，使用默认免费计划:', error);
      return getDefaultSubscription();
    }

    if (!data || data.length === 0) {
      return getDefaultSubscription();
    }

    return data[0] as UserSubscription;
  } catch (err) {
    console.error('获取用户订阅失败:', err);
    return getDefaultSubscription();
  }
}

/**
 * Get default free subscription
 */
function getDefaultSubscription(): UserSubscription {
  return {
    subscription_id: null,
    plan_name: 'free',
    plan_display_name: 'Free',
    status: 'active',
    max_keys: 1,
    max_team_members: 1,
    max_platform_accounts: 1,
    features: {
      export: false,
      batch_operations: false,
      alerts: false,
      api_access: false,
      priority_support: false,
      custom_branding: false,
    },
    current_period_end: null,
    is_trial: false,
  };
}

/**
 * 检查是否可以添加更多 Key
 */
export async function canAddMoreKeys(): Promise<{ allowed: boolean; current: number; max: number }> {
  if (!supabase) return { allowed: false, current: 0, max: 1 };

  try {
    // 获取用户订阅
    const subscription = await getUserSubscription();
    const maxKeys = subscription?.max_keys ?? 1;

    // 获取当前 Key 数量
    const { count, error } = await supabase
      .from('llm_api_keys')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    const currentKeys = count || 0;
    const allowed = maxKeys === -1 || currentKeys < maxKeys;

    return { allowed, current: currentKeys, max: maxKeys };
  } catch (err) {
    console.error('检查 Key 数量失败:', err);
    return { allowed: false, current: 0, max: 1 };
  }
}

/**
 * 检查是否有某个功能权限
 */
export async function hasFeature(featureName: keyof SubscriptionFeatures): Promise<boolean> {
  if (!supabase) return false;

  try {
    const subscription = await getUserSubscription();
    return subscription?.features?.[featureName] ?? false;
  } catch (err) {
    console.error('检查功能权限失败:', err);
    return false;
  }
}

// ==================== 支付记录 ====================

/**
 * 获取支付记录
 */
export async function getPaymentRecords(limit: number = 20): Promise<PaymentRecord[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('payment_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('获取支付记录失败:', err);
    return [];
  }
}

// ==================== 订阅操作 ====================

/**
 * 创建支付会话（用于升级订阅）
 * 这里需要对接具体的支付平台
 */
export async function createCheckoutSession(planName: string, billingCycle: 'monthly' | 'yearly'): Promise<{ url: string } | null> {
  // TODO: 对接 LemonSqueezy / Paddle / Stripe
  console.log('创建支付会话:', { planName, billingCycle });
  
  // 临时返回 null，等待支付平台集成
  return null;
}

/**
 * 取消订阅
 */
export async function cancelSubscription(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase 未配置' };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '用户未登录' };

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('取消订阅失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ==================== 工具函数 ====================

/**
 * 格式化价格
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  if (price === 0) return 'Free';
  
  const symbol = currency === 'USD' ? '$' : '¥';
  return `${symbol}${price.toFixed(0)}`;
}

/**
 * 获取计划徽章颜色
 */
export function getPlanBadgeColor(planName: string): string {
  const colors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    pro: 'bg-blue-100 text-blue-600',
    team: 'bg-purple-100 text-purple-600',
    enterprise: 'bg-orange-100 text-orange-600',
  };
  return colors[planName] || colors.free;
}

