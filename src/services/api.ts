/**
 * KeyPilot API 服务层
 * LLM API Key 管理相关接口
 */

import { supabaseAdmin, supabase } from '../lib/supabase';

/**
 * 获取认证 headers（包含用户 token）
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  
  try {
    const {
      data: { session },
    } = await supabase?.auth.getSession() || { data: { session: null } };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.warn('获取认证 token 失败:', error);
  }
  
  return headers;
}

// ==================== API Endpoints ====================

// API endpoints - 使用相对路径，Vercel 会自动路由到 serverless functions
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const OPENAI_LIST_KEYS_URL = `${API_BASE_URL}/openai/list-keys`;
const OPENAI_CREATE_KEY_URL = `${API_BASE_URL}/openai/create-key`;
const OPENAI_DELETE_KEY_URL = `${API_BASE_URL}/openai/delete-key`;
const OPENAI_SYNC_USAGE_URL = `${API_BASE_URL}/openai/sync-usage`;
const OPENAI_SYNC_COSTS_URL = `${API_BASE_URL}/openai/sync-costs`;

const CLAUDE_MANAGE_KEYS_URL = `${API_BASE_URL}/claude/manage-keys`;
const CLAUDE_SYNC_DATA_URL = `${API_BASE_URL}/claude/sync-data`;
const CLAUDE_SYNC_COSTS_URL = `${API_BASE_URL}/claude/sync-costs`;

const OPENROUTER_MANAGE_KEYS_URL = `${API_BASE_URL}/openrouter/manage-keys`;

const VOLCENGINE_MANAGE_KEYS_URL = `${API_BASE_URL}/volcengine/manage-keys`;
const VOLCENGINE_SYNC_DATA_URL = `${API_BASE_URL}/volcengine/sync-data`;

// ==================== 类型定义 ====================

export interface MindUser {
  id: string;
  user_center_id: number;
  base_user_id?: string;
  nick_name?: string;
  real_name?: string;
  icon?: string;
  email?: string;
  position?: string;
  status?: number;
}

export interface LLMPlatformAccount {
  id: string;
  name: string;
  platform: 'openai' | 'anthropic' | 'openrouter' | 'aliyun' | 'volcengine' | 'deepseek';
  organization_id?: string;
  admin_api_key_encrypted?: string;
  admin_api_key_prefix?: string;
  balance?: number;
  total_balance?: number | null;
  currency?: string;
  status: 'active' | 'inactive' | 'error';
  last_synced_at?: string;
  created_at: string;
}

export interface LLMApiKey {
  id: string;
  name: string;
  platform: 'openai' | 'anthropic' | 'openrouter' | 'aliyun' | 'volcengine' | 'deepseek';
  platform_account_id?: string;
  platform_key_id?: string;
  project_id?: string;
  api_key_encrypted?: string;
  api_key_prefix?: string;
  api_key_suffix?: string;
  status: 'active' | 'expired' | 'disabled' | 'error';
  business?: string;
  description?: string;
  expires_at?: string;
  last_used_at?: string;
  last_synced_at?: string;
  creation_method: 'api' | 'manual';
  created_at: string;
  // 用量统计
  total_tokens?: number;
  month_tokens?: number;
  daily_tokens?: number;
  total_cost?: number;
  month_cost?: number;
  balance?: number | null;
  usage_this_month_usd?: number;
  // 责任人联系信息（直接存储）
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  // 责任人（关联用户方式 - 保留兼容）
  owners?: Array<{
    user_id: string;
    user_name: string;
    user_avatar?: string;
    user_status?: number;
    is_primary: boolean;
    role: string;
  }>;
}

export interface OpenRouterKey {
  hash: string;
  name: string;
  label: string;
  disabled: boolean;
  limit: number | null;
  limit_remaining: number | null;
  limit_reset: 'daily' | 'weekly' | 'monthly' | null;
  usage: number;
  usage_daily: number;
  usage_weekly: number;
  usage_monthly: number;
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
}

// ==================== 用户管理 ====================

export async function fetchMindUsers(): Promise<MindUser[]> {
  if (!supabaseAdmin) throw new Error('Supabase 未配置');
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('nick_name');
  
  if (error) throw error;
  return data || [];
}

// ==================== LLM 平台账号管理 ====================

export async function getLLMPlatformAccounts(platform?: string): Promise<LLMPlatformAccount[]> {
  if (!supabaseAdmin) return [];
  
  try {
    let query = supabaseAdmin
      .from('llm_platform_accounts')
      .select('*')
      .order('name');
    
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('获取 LLM 平台账号失败:', err);
    return [];
  }
}

export async function addLLMPlatformAccount(params: {
  name: string;
  platform: 'openai' | 'anthropic' | 'openrouter' | 'aliyun' | 'volcengine' | 'deepseek';
  admin_api_key: string;
  organization_id?: string;
  project_id?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const keyPrefix = params.admin_api_key.substring(0, 15);
    
    const { data, error } = await supabaseAdmin
      .from('llm_platform_accounts')
      .insert({
        name: params.name,
        platform: params.platform,
        admin_api_key_encrypted: params.admin_api_key,
        admin_api_key_prefix: keyPrefix,
        organization_id: params.organization_id || null,
        project_id: params.project_id || null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('添加平台账号失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function updatePlatformAccountBalance(
  accountId: string,
  balance: number
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const { error } = await supabaseAdmin
      .from('llm_platform_accounts')
      .update({
        total_balance: balance,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('更新平台账号余额失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ==================== LLM API Keys 管理 ====================

export async function getLLMApiKeys(params?: {
  platform?: string;
  search?: string;
  status?: string;
}): Promise<LLMApiKey[]> {
  if (!supabaseAdmin) return [];
  
  try {
    let query = supabaseAdmin
      .from('llm_api_keys')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (params?.platform && params.platform !== 'all') {
      query = query.eq('platform', params.platform);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,business.ilike.%${params.search}%`);
    }
    
    const { data: keysData, error: keysError } = await query;
    if (keysError) throw keysError;
    
    if (!keysData || keysData.length === 0) {
      return [];
    }
    
    const keyIds = keysData.map(k => k.id);
    
    // 查询责任人
    const { data: ownersData } = await supabaseAdmin
      .from('llm_api_key_owners')
      .select('api_key_id, user_id, is_primary, role')
      .in('api_key_id', keyIds)
      .eq('is_primary', true);
    
    const ownerUserIds = (ownersData || []).map(o => o.user_id);
    let usersMap: Record<string, { id: string; nick_name: string; real_name: string; icon: string; email: string; status: number }> = {};
    
    if (ownerUserIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('users')
        .select('id, nick_name, real_name, icon, email, status')
        .in('id', ownerUserIds);
      
      usersMap = (usersData || []).reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {} as typeof usersMap);
    }
    
    const ownersMap: Record<string, { user_id: string; user_name: string; user_avatar: string; user_status: number; is_primary: boolean; role: string }> = {};
    (ownersData || []).forEach(o => {
      const user = usersMap[o.user_id];
      if (user) {
        ownersMap[o.api_key_id] = {
          user_id: user.id,
          user_name: user.nick_name || user.real_name || '未知',
          user_avatar: user.icon || '',
          user_status: user.status,
          is_primary: o.is_primary,
          role: o.role || 'owner'
        };
      }
    });
    
    // 查询用量数据
    const { data: usageData } = await supabaseAdmin
      .from('llm_api_key_latest_usage')
      .select('api_key_id, balance, token_usage_total, token_usage_monthly, token_usage_daily, total_usage, monthly_usage, synced_at')
      .in('api_key_id', keyIds);
    
    const usageMap: Record<string, {
      balance: number | null;
      token_usage_total: number;
      token_usage_monthly: number;
      token_usage_daily: number;
      total_usage: number;
      monthly_usage: number;
      synced_at: string | null;
    }> = {};
    (usageData || []).forEach(u => {
      usageMap[u.api_key_id] = {
        balance: u.balance,
        token_usage_total: u.token_usage_total || 0,
        token_usage_monthly: u.token_usage_monthly || 0,
        token_usage_daily: u.token_usage_daily || 0,
        total_usage: u.total_usage || 0,
        monthly_usage: u.monthly_usage || 0,
        synced_at: u.synced_at
      };
    });
    
    return keysData.map(key => {
      const owner = ownersMap[key.id];
      const usage = usageMap[key.id];
      
      return {
        ...key,
        owners: owner ? [owner] : [],
        total_tokens: usage?.token_usage_total || 0,
        total_cost: usage?.total_usage || 0,
        month_tokens: usage?.token_usage_monthly || 0,
        month_cost: usage?.monthly_usage || 0,
        usage_this_month_usd: usage?.monthly_usage || 0,
        daily_tokens: usage?.token_usage_daily || 0,
        balance: usage?.balance,
        last_synced_at: usage?.synced_at,
      } as LLMApiKey;
    });
  } catch (err) {
    console.error('获取 LLM API Keys 失败:', err);
    return [];
  }
}

export async function addManualLLMApiKey(params: {
  name: string;
  platform: 'openai' | 'anthropic' | 'openrouter' | 'aliyun' | 'volcengine' | 'deepseek';
  api_key: string;
  business?: string;
  // 责任人联系信息（直接存储）
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  expires_at?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const keyPrefix = params.api_key.substring(0, 10);
    const keySuffix = params.api_key.slice(-4);
    
    const { data, error } = await supabaseAdmin
      .from('llm_api_keys')
      .insert({
        name: params.name,
        platform: params.platform,
        api_key_encrypted: params.api_key,
        api_key_prefix: keyPrefix,
        api_key_suffix: keySuffix,
        business: params.business || null,
        // 责任人联系信息
        owner_name: params.owner_name || null,
        owner_email: params.owner_email || null,
        owner_phone: params.owner_phone || null,
        expires_at: params.expires_at || null,
        status: 'active',
        creation_method: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('添加 API Key 失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteLLMApiKey(keyId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (!supabaseAdmin) return { success: false, error: 'Supabase 未配置' };
    
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('llm_api_keys')
      .select('id, name, platform, project_id, platform_key_id, platform_account_id')
      .eq('id', keyId)
      .single();
    
    if (keyError || !keyData) {
      return { success: false, error: '未找到该 API Key' };
    }
    
    // OpenAI 平台通过 API 删除
    if (keyData.platform === 'openai' && keyData.platform_key_id && keyData.project_id) {
      const accounts = await getLLMPlatformAccounts();
      const openaiAccount = accounts.find(a => a.platform === 'openai' && a.status === 'active');
      
      if (openaiAccount?.admin_api_key_encrypted) {
        const headers = await getAuthHeaders();
        const response = await fetch(OPENAI_DELETE_KEY_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            admin_key: openaiAccount.admin_api_key_encrypted,
            project_id: keyData.project_id,
            key_id: keyData.platform_key_id,
            db_key_id: keyId,
            key_name: keyData.name
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            return result;
          }
        }
      }
    }
    
    // 直接从数据库删除
    await supabaseAdmin.from('llm_api_key_owners').delete().eq('api_key_id', keyId);
    await supabaseAdmin.from('llm_api_key_usage').delete().eq('api_key_id', keyId);
    
    const { error } = await supabaseAdmin.from('llm_api_keys').delete().eq('id', keyId);
    if (error) throw error;
    
    return { success: true, message: `API Key "${keyData.name}" 已删除` };
  } catch (err) {
    console.error('删除 API Key 失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function updateLLMApiKeyOwner(
  keyId: string,
  ownerId: string | null,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Supabase 未配置' };
  
  try {
    await supabaseAdmin
      .from('llm_api_key_owners')
      .delete()
      .eq('api_key_id', keyId)
      .eq('is_primary', true);
    
    if (ownerId) {
      const { error } = await supabaseAdmin
        .from('llm_api_key_owners')
        .insert({
          api_key_id: keyId,
          user_id: ownerId,
          is_primary: true,
          role: 'owner',
          notes: notes || null
        });
      
      if (error) throw error;
    }
    
    return { success: true };
  } catch (err) {
    console.error('更新责任人失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

// 更新 API Key 责任人联系信息（直接存储方式）
export async function updateLLMApiKeyOwnerContact(
  keyId: string,
  contact: {
    name: string;
    phone?: string;
    email?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Supabase 未配置' };
  
  // 验证：手机号和邮箱至少填一个
  if (!contact.phone && !contact.email) {
    return { success: false, error: '手机号和邮箱至少填写一项' };
  }
  
  try {
    const { error } = await supabaseAdmin
      .from('llm_api_keys')
      .update({
        owner_name: contact.name || null,
        owner_phone: contact.phone || null,
        owner_email: contact.email || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('更新责任人联系信息失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

// 清除 API Key 责任人联系信息
export async function clearLLMApiKeyOwnerContact(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const { error } = await supabaseAdmin
      .from('llm_api_keys')
      .update({
        owner_name: null,
        owner_phone: null,
        owner_email: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('清除责任人联系信息失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function updateLLMApiKeyBusiness(
  keyId: string,
  business: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const { error } = await supabaseAdmin
      .from('llm_api_keys')
      .update({ business: business || null })
      .eq('id', keyId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('更新业务用途失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function updateLLMApiKeyDescription(
  keyId: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const { error } = await supabaseAdmin
      .from('llm_api_keys')
      .update({ description: description || null })
      .eq('id', keyId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('更新备注失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function updateLLMApiKeyEncrypted(
  keyId: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Supabase 未配置' };
  
  try {
    const keyPrefix = apiKey.substring(0, 10);
    const keySuffix = apiKey.slice(-4);
    
    const { error } = await supabaseAdmin
      .from('llm_api_keys')
      .update({ 
        api_key_encrypted: apiKey,
        api_key_prefix: keyPrefix,
        api_key_suffix: keySuffix,
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('更新 API Key 失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ==================== OpenAI API ====================

export async function createOpenAIKey(params: {
  admin_key: string;
  organization_id?: string;
  project_id: string;
  name: string;
  business?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  expires_at?: string;
  platform_account_id?: string;
}): Promise<{
  success: boolean;
  id?: string;
  name?: string;
  api_key?: string;
  masked_key?: string;
  message?: string;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(OPENAI_CREATE_KEY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      const errorData = await response.json().catch(() => ({ error: errorText }));
      return { success: false, error: errorData.error || `创建失败: ${response.statusText}` };
    }
    
    return await response.json();
  } catch (err) {
    console.error('创建 OpenAI API Key 失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function getOpenAIProjects(adminKey: string): Promise<{
  success: boolean;
  projects?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const response = await fetch('https://api.openai.com/v1/organization/projects?limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `获取项目列表失败: ${errorText}` };
    }
    
    const data = await response.json();
    const projects = (data.data || []).map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name
    }));
    
    return { success: true, projects };
  } catch (err) {
    console.error('获取 OpenAI 项目列表失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function syncOpenAIKeys(platformAccountId: string): Promise<{
  success: boolean;
  keys?: Array<{ id: string; name: string; redacted_value: string; created_at: string }>;
  error?: string;
}> {
  try {
    const response = await fetch(OPENAI_LIST_KEYS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_account_id: platformAccountId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `同步失败: ${response.statusText} - ${errorText}` };
    }
    
    return await response.json();
  } catch (err) {
    console.error('同步 OpenAI Keys 失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function fetchOpenAIUsageDirect(adminKey: string): Promise<{
  success: boolean;
  today_tokens: number;
  month_tokens: number;
  by_project?: Record<string, { input: number; output: number; total: number }>;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(OPENAI_SYNC_USAGE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ admin_key: adminKey })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        return { 
          success: false, 
          today_tokens: 0, 
          month_tokens: 0, 
          error: '用量同步服务未启用' 
        };
      }
      return { success: false, today_tokens: 0, month_tokens: 0, error: `同步失败: ${response.status} - ${errorText}` };
    }
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, today_tokens: 0, month_tokens: 0, error: data.error || '同步失败' };
    }
    
    const summary = data.summary || {};
    const dailyUsage = data.daily_usage || [];
    
    const byProject: Record<string, { input: number; output: number; total: number }> = {};
    dailyUsage.forEach((item: { project_id: string; input_tokens: number; output_tokens: number; total_tokens: number }) => {
      if (!byProject[item.project_id]) {
        byProject[item.project_id] = { input: 0, output: 0, total: 0 };
      }
      byProject[item.project_id].input += item.input_tokens || 0;
      byProject[item.project_id].output += item.output_tokens || 0;
      byProject[item.project_id].total += item.total_tokens || 0;
    });
    
    return {
      success: true,
      today_tokens: summary.today_tokens || 0,
      month_tokens: summary.month_tokens || 0,
      by_project: byProject
    };
  } catch (err) {
    console.error('获取 OpenAI 用量失败:', err);
    return { success: false, today_tokens: 0, month_tokens: 0, error: (err as Error).message };
  }
}

// ==================== Claude (Anthropic) API ====================

async function claudeManageKeysRequest(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(CLAUDE_MANAGE_KEYS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        return { success: false, error: 'Claude 密钥管理服务未启用' };
      }
      return { success: false, error: `请求失败: ${response.status} - ${errorText}` };
    }
    
    return await response.json();
  } catch (err) {
    console.error('Claude 密钥管理请求失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

async function claudeSyncDataRequest(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(CLAUDE_SYNC_DATA_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        return { success: false, error: 'Claude 数据同步服务未启用' };
      }
      return { success: false, error: `请求失败: ${response.status} - ${errorText}` };
    }
    
    return await response.json();
  } catch (err) {
    console.error('Claude 数据同步请求失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function listClaudeKeys(adminKey: string, options?: {
  workspace_id?: string;
  status?: 'active' | 'inactive';
}): Promise<{
  success: boolean;
  keys?: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
    workspace_id?: string;
    partially_redacted_value?: string;
  }>;
  total?: number;
  error?: string;
}> {
  return claudeSyncDataRequest({ action: 'list_keys', admin_key: adminKey, ...options }) as Promise<{
    success: boolean;
    keys?: Array<{ id: string; name: string; status: string; created_at: string; workspace_id?: string; partially_redacted_value?: string }>;
    total?: number;
    error?: string;
  }>;
}

export async function syncClaudeUsage(adminKey: string, options?: {
  starting_at?: string;
  ending_at?: string;
  workspace_id?: string;
  range?: 'today' | 'month';
}): Promise<{
  success: boolean;
  summary?: {
    total_input_tokens: number;
    total_output_tokens: number;
    total_tokens: number;
    starting_at: string;
    ending_at: string;
  };
  error?: string;
}> {
  return claudeSyncDataRequest({ action: 'sync_usage', admin_key: adminKey, ...options }) as Promise<{
    success: boolean;
    summary?: { total_input_tokens: number; total_output_tokens: number; total_tokens: number; starting_at: string; ending_at: string };
    error?: string;
  }>;
}

export async function updateClaudeKey(params: {
  admin_key: string;
  api_key_id: string;
  new_name?: string;
  status?: 'active' | 'inactive';
}): Promise<{
  success: boolean;
  message?: string;
  key?: { id: string; name: string; status: string };
  error?: string;
}> {
  return claudeManageKeysRequest({ action: 'update', ...params }) as Promise<{
    success: boolean;
    message?: string;
    key?: { id: string; name: string; status: string };
    error?: string;
  }>;
}

// ==================== OpenRouter API ====================

async function openrouterManageKeysRequest(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(OPENROUTER_MANAGE_KEYS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '请求失败' };
  }
}

export async function listOpenRouterKeys(adminKey: string): Promise<{
  success: boolean;
  count?: number;
  keys?: OpenRouterKey[];
  error?: string;
}> {
  return openrouterManageKeysRequest({ action: 'list', admin_key: adminKey }) as Promise<{
    success: boolean;
    count?: number;
    keys?: OpenRouterKey[];
    error?: string;
  }>;
}

export async function createOpenRouterKey(params: {
  admin_key: string;
  name: string;
  limit?: number | null;
  limit_reset?: 'daily' | 'weekly' | 'monthly' | null;
  expires_at?: string | null;
  business?: string;
  description?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  platform_account_id?: string;
}): Promise<{
  success: boolean;
  id?: string;
  key?: {
    hash: string;
    name: string;
    label: string;
    api_key_prefix: string;
    api_key_suffix: string;
  };
  message?: string;
  error?: string;
}> {
  return openrouterManageKeysRequest({ action: 'create', ...params }) as Promise<{
    success: boolean;
    id?: string;
    key?: { hash: string; name: string; label: string; api_key_prefix: string; api_key_suffix: string };
    message?: string;
    error?: string;
  }>;
}

export async function deleteOpenRouterKey(params: {
  admin_key: string;
  key_hash: string;
  db_key_id?: string;
}): Promise<{
  success: boolean;
  message?: string;
  db_deleted?: boolean;
  error?: string;
}> {
  return openrouterManageKeysRequest({ action: 'delete', ...params }) as Promise<{
    success: boolean;
    message?: string;
    db_deleted?: boolean;
    error?: string;
  }>;
}

export async function getOpenRouterCredits(adminKey: string): Promise<{
  success: boolean;
  credits?: {
    total_credits: number;
    total_usage: number;
    remaining: number;
  };
  error?: string;
}> {
  return openrouterManageKeysRequest({ action: 'credits', admin_key: adminKey }) as Promise<{
    success: boolean;
    credits?: { total_credits: number; total_usage: number; remaining: number };
    error?: string;
  }>;
}

export async function syncOpenRouterKeys(adminKey: string, platformAccountId?: string): Promise<{
  success: boolean;
  keys_count?: number;
  keys?: Array<{
    platform: string;
    platform_key_id: string;
    name: string;
    status: string;
    usage_data: {
      usage: number;
      usage_daily: number;
      usage_monthly: number;
    };
  }>;
  error?: string;
}> {
  return openrouterManageKeysRequest({ 
    action: 'sync', 
    admin_key: adminKey,
    platform_account_id: platformAccountId 
  }) as Promise<{
    success: boolean;
    keys_count?: number;
    keys?: Array<{
      platform: string;
      platform_key_id: string;
      name: string;
      status: string;
      usage_data: {
        usage: number;
        usage_daily: number;
        usage_monthly: number;
      };
    }>;
    error?: string;
  }>;
}

// ==================== 费用同步 ====================

export async function syncOpenAICosts(adminKey: string, platformAccountId?: string): Promise<{
  success: boolean;
  summary?: {
    total_cost_usd: string;
    month_cost_usd: string;
    today_cost_usd: string;
    total_buckets: number;
    pages_fetched: number;
    projects_with_costs: number;
  };
  matched_keys?: Array<{
    project_id: string;
    project_name: string;
    name: string;
    db_id: string;
    month_cost: string;
    today_cost: string;
    keys_in_project: number;
  }>;
  synced_at?: string;
  saved_count?: number;
  errors?: Array<{ api_key_id: string; error: string }>;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(OPENAI_SYNC_COSTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ admin_key: adminKey, platform_account_id: platformAccountId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `同步失败: ${response.statusText} - ${errorText}` };
    }
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, error: data.error || '同步失败' };
    }
    
    return {
      success: true,
      summary: data.summary,
      matched_keys: data.matched_keys,
      synced_at: data.synced_at || new Date().toISOString(),
      saved_count: data.saved_count,
      errors: data.errors,
    };
  } catch (err) {
    console.error('同步 OpenAI 费用失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function syncClaudeCosts(adminKey: string, platformAccountId?: string): Promise<{
  success: boolean;
  summary?: {
    total_cost_usd: string;
    month_cost_usd: string;
    today_cost_usd: string;
    total_buckets: number;
    workspaces_count: number;
    unmatched_cost_usd: string;
    zero_fee_keys_count: number;
  };
  matched_keys?: Array<{
    workspace_id: string;
    name: string;
    db_id: string;
    month_cost: string;
    today_cost: string;
    keys_in_workspace: number;
  }>;
  synced_at?: string;
  saved_count?: number;
  errors?: Array<{ api_key_id: string; error: string }>;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(CLAUDE_SYNC_COSTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ admin_key: adminKey, platform_account_id: platformAccountId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `同步失败: ${response.statusText} - ${errorText}` };
    }
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, error: data.error || '同步失败' };
    }
    
    return {
      success: true,
      summary: data.summary,
      matched_keys: data.matched_keys,
      synced_at: data.synced_at || new Date().toISOString(),
      saved_count: data.saved_count,
      errors: data.errors,
    };
  } catch (err) {
    console.error('同步 Claude 费用失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ==================== 火山引擎 API Key 管理 ====================

async function volcengineManageKeysRequest(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(VOLCENGINE_MANAGE_KEYS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '请求失败' };
  }
}

export async function createVolcengineKey(params: {
  access_key_id: string;
  secret_access_key: string;
  user_name: string;
  key_name?: string;
  business?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  platform_account_id?: string;
}): Promise<{
  success: boolean;
  id?: string;
  access_key_id?: string;
  secret_access_key?: string;
  masked_key?: string;
  message?: string;
  warning?: string;
  error?: string;
}> {
  return volcengineManageKeysRequest({ 
    action: 'create', 
    ...params 
  }) as Promise<{
    success: boolean;
    id?: string;
    access_key_id?: string;
    secret_access_key?: string;
    masked_key?: string;
    message?: string;
    warning?: string;
    error?: string;
  }>;
}

export async function deleteVolcengineKey(params: {
  access_key_id: string;
  secret_access_key: string;
  target_access_key_id: string;
  user_name?: string;
  db_key_id?: string;
}): Promise<{
  success: boolean;
  message?: string;
  db_deleted?: boolean;
  volcengine_deleted?: boolean;
  error?: string;
}> {
  return volcengineManageKeysRequest({ 
    action: 'delete', 
    ...params 
  }) as Promise<{
    success: boolean;
    message?: string;
    db_deleted?: boolean;
    volcengine_deleted?: boolean;
    error?: string;
  }>;
}

export async function listVolcengineKeys(params: {
  access_key_id: string;
  secret_access_key: string;
  user_name?: string;
}): Promise<{
  success: boolean;
  keys?: Array<{
    access_key_id: string;
    status: string;
    user_name: string;
    create_date: string;
    update_date?: string;
  }>;
  total?: number;
  error?: string;
}> {
  return volcengineManageKeysRequest({ 
    action: 'list', 
    ...params 
  }) as Promise<{
    success: boolean;
    keys?: Array<{
      access_key_id: string;
      status: string;
      user_name: string;
      create_date: string;
      update_date?: string;
    }>;
    total?: number;
    error?: string;
  }>;
}

export async function syncVolcengineData(params: {
  access_key_id: string;
  secret_access_key: string;
  platform_account_id?: string;
  sync_balance?: boolean;
  sync_usage?: boolean;
}): Promise<{
  success: boolean;
  balance?: {
    available_balance: number;
    cash_balance: number;
    credit_limit: number;
    frozen_balance: number;
  };
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    request_count: number;
  };
  balance_error?: string;
  usage_error?: string;
  keys_count?: number;
  synced_at?: string;
  message?: string;
  error?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(VOLCENGINE_SYNC_DATA_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '请求失败' };
  }
}

