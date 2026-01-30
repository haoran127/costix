/**
 * KeyPilot 告警服务层
 * 告警通知相关接口
 */

import { supabase } from '../lib/supabase';

export interface LLMAlert {
  id: string;
  tenant_id: string | null;
  alert_type: 'key_expiring' | 'low_balance' | 'high_usage' | 'key_error';
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  api_key_id: string | null;
  platform_account_id: string | null;
  alert_data: Record<string, any> | null;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LLMAlertConfig {
  id: string;
  tenant_id: string | null;
  alert_type: 'key_expiring' | 'low_balance' | 'high_usage' | 'key_error';
  enabled: boolean;
  threshold_value: number | null;
  threshold_days: number | null;
  notify_in_app: boolean;
  notify_email: boolean;
  notify_webhook: boolean;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 获取告警列表
 */
export async function getAlerts(params?: {
  is_read?: boolean;
  is_resolved?: boolean;
  alert_type?: string;
  limit?: number;
}): Promise<LLMAlert[]> {
  if (!supabase) return [];
  
  try {
    let query = supabase
      .from('llm_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (params?.is_read !== undefined) {
      query = query.eq('is_read', params.is_read);
    }
    if (params?.is_resolved !== undefined) {
      query = query.eq('is_resolved', params.is_resolved);
    }
    if (params?.alert_type) {
      query = query.eq('alert_type', params.alert_type);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('获取告警列表失败:', err);
    return [];
  }
}

/**
 * 获取未读告警数量
 */
export async function getUnreadAlertCount(): Promise<number> {
  if (!supabase) return 0;
  
  try {
    const { count, error } = await supabase
      .from('llm_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_resolved', false);
    
    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error('获取未读告警数量失败:', err);
    return 0;
  }
}

/**
 * 标记告警为已读
 */
export async function markAlertAsRead(alertId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const { error } = await supabase
      .from('llm_alerts')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', alertId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('标记告警为已读失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * 标记所有告警为已读
 */
export async function markAllAlertsAsRead(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const { error } = await supabase
      .from('llm_alerts')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('is_read', false)
      .eq('is_resolved', false);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('标记所有告警为已读失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * 标记告警为已解决
 */
export async function markAlertAsResolved(alertId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('llm_alerts')
      .update({ 
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('标记告警为已解决失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * 获取告警配置
 */
export async function getAlertConfigs(): Promise<LLMAlertConfig[]> {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('llm_alert_configs')
      .select('*')
      .order('alert_type');
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('获取告警配置失败:', err);
    return [];
  }
}

/**
 * 更新告警配置
 */
export async function updateAlertConfig(
  configId: string,
  params: {
    enabled?: boolean;
    threshold_value?: number | null;
    threshold_days?: number | null;
    notify_in_app?: boolean;
    notify_email?: boolean;
    notify_webhook?: boolean;
    webhook_url?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (params.enabled !== undefined) updateData.enabled = params.enabled;
    if (params.threshold_value !== undefined) updateData.threshold_value = params.threshold_value;
    if (params.threshold_days !== undefined) updateData.threshold_days = params.threshold_days;
    if (params.notify_in_app !== undefined) updateData.notify_in_app = params.notify_in_app;
    if (params.notify_email !== undefined) updateData.notify_email = params.notify_email;
    if (params.notify_webhook !== undefined) updateData.notify_webhook = params.notify_webhook;
    if (params.webhook_url !== undefined) updateData.webhook_url = params.webhook_url;
    
    const { error } = await supabase
      .from('llm_alert_configs')
      .update(updateData)
      .eq('id', configId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('更新告警配置失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

