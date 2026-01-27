import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase 环境变量未配置');
}

// Supabase 客户端（使用 anon_key，所有操作受 RLS 保护）
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// 兼容旧代码：supabaseAdmin 现在指向同一个客户端
// 所有写入操作都通过 RLS 策略控制权限
// ⚠️ 注意：service_role_key 不应在前端使用！
export const supabaseAdmin = supabase;

// 调用 RPC 函数的辅助方法
export async function callRpc<T>(
  functionName: string,
  params?: Record<string, unknown>
): Promise<T> {
  if (!supabase) {
    throw new Error('Supabase 未配置');
  }

  const { data, error } = await supabase.rpc(functionName, params);
  
  if (error) {
    console.error(`RPC ${functionName} 调用失败:`, error);
    throw error;
  }
  
  return data as T;
}

// 数据库类型定义
export interface DeveloperAccount {
  id: string;
  name: string;
  platform: 'google' | 'apple' | 'onestore';
  developer_id: string;
  email: string;
  phone?: string;
  console_url?: string;
  renewal_date?: string;
  status: 'active' | 'warning' | 'expired';
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  account_id: string;
  name: string;
  name_en?: string;
  package_name: string;
  platform: 'google' | 'apple' | 'onestore';
  icon?: string;
  version?: string;
  status: 'published' | 'pending' | 'rejected' | 'draft';
  downloads?: number;
  rating?: number;
  reviews_count?: number;
  last_update?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  employee_id?: string;
  employee_status: 'active' | 'probation' | 'leave' | 'resigned' | 'external';
  tags?: string[];
  account_roles?: AccountRole[];
  created_at: string;
  updated_at: string;
}

export interface AccountRole {
  account_id: string;
  role: 'admin' | 'developer' | 'marketing' | 'finance' | 'viewer';
  apps: string[] | 'all';
  status: 'active' | 'pending';
  join_date: string;
  last_active?: string;
}

export interface AppVersion {
  id: string;
  app_id: string;
  version: string;
  version_code: number;
  status: 'draft' | 'review' | 'rejected' | 'approved' | 'staged' | 'live';
  submit_date?: string;
  review_date?: string;
  release_date?: string;
  release_notes?: string;
  rollout_percentage?: number;
  reject_reason?: string;
  created_at: string;
}

export interface IAPProduct {
  id: string;
  app_id: string;
  product_id: string;
  name: string;
  type: 'subscription' | 'consumable' | 'non_consumable';
  price: string;
  status: 'approved' | 'pending' | 'rejected';
  platforms: string[];
  created_at: string;
}

export interface AppReview {
  id: string;
  app_id: string;
  platform: string;
  user_name: string;
  rating: number;
  content: string;
  date: string;
  replied: boolean;
  reply?: string;
  created_at: string;
}

export interface DeveloperEmail {
  id: string;
  account_id: string;
  from_address: string;
  subject: string;
  preview: string;
  platform: string;
  email_type: 'policy' | 'review' | 'finance' | 'quality' | 'account';
  is_read: boolean;
  is_urgent: boolean;
  received_at: string;
  created_at: string;
}

export interface FinanceRecord {
  id: string;
  account_id: string;
  app_id?: string;
  period: string;
  revenue: number;
  iap_revenue?: number;
  ad_revenue?: number;
  payout_status: 'pending' | 'completed';
  payout_date?: string;
  created_at: string;
}
