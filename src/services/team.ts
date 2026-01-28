/**
 * 团队成员管理 API 服务
 * 基于 Supabase Auth
 */

import { supabase } from '../lib/supabase';

// ==================== 类型定义 ====================

export interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'invited' | 'active' | 'disabled';
  user_id: string | null;
  avatar_url: string | null;
  invited_at: string;
  joined_at: string | null;
}

export interface InviteMemberResult {
  success: boolean;
  member_id?: string;
  status?: 'active' | 'invited';
  error?: string;
}

// ==================== API 函数 ====================

/**
 * 获取当前团队的成员列表
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  if (!supabase) {
    console.warn('Supabase 未配置');
    return [];
  }

  try {
    const { data, error } = await supabase.rpc('get_my_team_members');
    
    if (error) {
      console.error('获取团队成员失败:', error);
      return [];
    }
    
    return (data || []) as TeamMember[];
  } catch (err) {
    console.error('获取团队成员失败:', err);
    return [];
  }
}

/**
 * 邀请新成员加入团队
 */
export async function inviteTeamMember(params: {
  email: string;
  name?: string;
  role?: 'admin' | 'member' | 'viewer';
}): Promise<InviteMemberResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase 未配置' };
  }

  try {
    // 获取当前用户的团队 ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_team_id')
      .single();
    
    if (profileError || !profile?.current_team_id) {
      // 如果没有 current_team_id，尝试从 team_members 获取
      const { data: memberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
        .limit(1)
        .single();
      
      if (!memberData?.team_id) {
        return { success: false, error: '未找到团队' };
      }
      
      const { data, error } = await supabase.rpc('invite_team_member', {
        p_team_id: memberData.team_id,
        p_email: params.email,
        p_name: params.name || null,
        p_role: params.role || 'member'
      });
      
      if (error) {
        console.error('邀请成员失败:', error);
        return { success: false, error: error.message };
      }
      
      return data as InviteMemberResult;
    }

    const { data, error } = await supabase.rpc('invite_team_member', {
      p_team_id: profile.current_team_id,
      p_email: params.email,
      p_name: params.name || null,
      p_role: params.role || 'member'
    });
    
    if (error) {
      console.error('邀请成员失败:', error);
      return { success: false, error: error.message };
    }
    
    return data as InviteMemberResult;
  } catch (err) {
    console.error('邀请成员失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * 更新成员角色
 */
export async function updateMemberRole(
  memberId: string,
  role: 'admin' | 'member' | 'viewer'
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase 未配置' };
  }

  try {
    const { error } = await supabase
      .from('team_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', memberId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('更新成员角色失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * 移除成员
 */
export async function removeMember(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase 未配置' };
  }

  try {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('移除成员失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * 重新发送邀请
 */
export async function resendInvite(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase 未配置' };
  }

  try {
    // 更新邀请时间
    const { error } = await supabase
      .from('team_members')
      .update({ 
        invited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('status', 'invited');
    
    if (error) throw error;
    
    // TODO: 发送邀请邮件
    
    return { success: true };
  } catch (err) {
    console.error('重新发送邀请失败:', err);
    return { success: false, error: (err as Error).message };
  }
}

