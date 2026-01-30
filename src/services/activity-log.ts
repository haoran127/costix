/**
 * 操作日志服务
 * 记录和查询 API Key 操作历史
 */

import { supabase } from '../lib/supabase';

export interface ActivityLog {
  id: string;
  api_key_id: string;
  action: string;
  action_by: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  status: 'success' | 'error';
  error_message: string | null;
  ip_address: string | null;
  user_agent: string | null;
  tenant_id: string | null;
  created_at: string;
}

/**
 * 记录操作日志
 */
export async function logActivity(params: {
  api_key_id: string;
  action: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  status?: 'success' | 'error';
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase 未配置' };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('llm_api_key_logs')
      .insert({
        api_key_id: params.api_key_id,
        action: params.action,
        action_by: user?.id || null,
        old_values: params.old_values || null,
        new_values: params.new_values || null,
        status: params.status || 'success',
        error_message: params.error_message || null,
        ip_address: params.ip_address || null,
        user_agent: params.user_agent || null,
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('记录操作日志失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * 获取操作日志列表
 */
export async function getActivityLogs(params?: {
  api_key_id?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<ActivityLog[]> {
  if (!supabase) return [];

  try {
    let query = supabase
      .from('llm_api_key_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.api_key_id) {
      query = query.eq('api_key_id', params.api_key_id);
    }
    if (params?.action) {
      query = query.eq('action', params.action);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('获取操作日志失败:', err);
    return [];
  }
}

/**
 * 获取操作日志数量
 */
export async function getActivityLogCount(params?: {
  api_key_id?: string;
  action?: string;
}): Promise<number> {
  if (!supabase) return 0;

  try {
    let query = supabase
      .from('llm_api_key_logs')
      .select('*', { count: 'exact', head: true });

    if (params?.api_key_id) {
      query = query.eq('api_key_id', params.api_key_id);
    }
    if (params?.action) {
      query = query.eq('action', params.action);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error('获取操作日志数量失败:', err);
    return 0;
  }
}

