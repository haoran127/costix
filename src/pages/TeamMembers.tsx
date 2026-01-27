/**
 * 团队成员管理页面
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { 
  getTeamMembers, 
  inviteTeamMember, 
  updateMemberRole, 
  removeMember,
  resendInvite,
  type TeamMember 
} from '../services/team';

// 角色配置
const getRoles = (t: (key: string) => string) => ({
  owner: { label: t('members.owner'), color: 'purple', icon: 'mdi:crown' },
  admin: { label: t('members.admin'), color: 'blue', icon: 'mdi:shield-account' },
  member: { label: t('members.member'), color: 'green', icon: 'mdi:account' },
  viewer: { label: t('members.viewer'), color: 'gray', icon: 'mdi:eye' },
} as const);

// 状态配置
const getStatus = (t: (key: string) => string) => ({
  active: { label: t('members.active'), color: 'green' },
  invited: { label: t('members.invited'), color: 'amber' },
  disabled: { label: t('members.disabled'), color: 'red' },
} as const);

export default function TeamMembers() {
  const { t } = useTranslation();
  const ROLES = getRoles(t);
  const STATUS = getStatus(t);
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 邀请弹窗
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<{ email: string; name: string; role: 'admin' | 'member' | 'viewer' }>({ email: '', name: '', role: 'member' });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  
  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // 操作中的成员 ID
  const [actionMemberId, setActionMemberId] = useState<string | null>(null);

  // 加载成员列表
  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const data = await getTeamMembers();
      setMembers(data);
    } catch (err) {
      console.error('加载成员失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // 显示 Toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 邀请成员
  const handleInvite = async () => {
    if (!inviteForm.email) {
      setInviteError(t('members.emailRequired'));
      return;
    }
    
    setIsInviting(true);
    setInviteError(null);
    
    try {
      const result = await inviteTeamMember({
        email: inviteForm.email,
        name: inviteForm.name || undefined,
        role: inviteForm.role,
      });
      
      if (result.success) {
        showToast(result.status === 'active' ? t('members.memberJoined') : t('members.inviteSuccess'), 'success');
        setShowInviteModal(false);
        setInviteForm({ email: '', name: '', role: 'member' });
        loadMembers();
      } else {
        setInviteError(result.error || '邀请失败');
      }
    } catch (err) {
      setInviteError('邀请失败，请稍后重试');
    } finally {
      setIsInviting(false);
    }
  };

  // 更新角色
  const handleUpdateRole = async (memberId: string, role: 'admin' | 'member' | 'viewer') => {
    setActionMemberId(memberId);
    try {
      const result = await updateMemberRole(memberId, role);
      if (result.success) {
        showToast(t('members.roleUpdated'), 'success');
        loadMembers();
      } else {
        showToast(result.error || t('common.error'), 'error');
      }
    } finally {
      setActionMemberId(null);
    }
  };

  // 移除成员
  const handleRemove = async (member: TeamMember) => {
    if (!confirm(t('members.confirmRemove', { name: member.name || member.email }))) return;
    
    setActionMemberId(member.id);
    try {
      const result = await removeMember(member.id);
      if (result.success) {
        showToast(t('members.memberRemoved'), 'success');
        loadMembers();
      } else {
        showToast(result.error || t('common.error'), 'error');
      }
    } finally {
      setActionMemberId(null);
    }
  };

  // 重新发送邀请
  const handleResendInvite = async (memberId: string) => {
    setActionMemberId(memberId);
    try {
      const result = await resendInvite(memberId);
      if (result.success) {
        showToast(t('members.inviteSuccess'), 'success');
      } else {
        showToast(result.error || t('common.error'), 'error');
      }
    } finally {
      setActionMemberId(null);
    }
  };

  // 筛选成员
  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.email.toLowerCase().includes(query) ||
      member.name?.toLowerCase().includes(query)
    );
  });

  // 统计
  const stats = {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    invited: members.filter(m => m.status === 'invited').length,
  };

  return (
    <div className="space-y-6 animate-in">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{t('members.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('members.subtitle')}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowInviteModal(true)}
        >
          <Icon icon="mdi:account-plus" width={18} />
          {t('members.invite')}
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Icon icon="mdi:account-group" width={20} className="text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('members.totalMembers')}</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <Icon icon="mdi:check-circle" width={20} className="text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.active}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('members.activeMembers')}</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Icon icon="mdi:email-send" width={20} className="text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.invited}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('members.invitedMembers')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
        {/* 搜索栏 */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
          <div className="relative">
            <Icon icon="mdi:magnify" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('members.searchMember')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-sm pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 列表 */}
        {isLoading ? (
          <div className="py-12 text-center">
            <Icon icon="mdi:loading" width={32} className="text-gray-400 animate-spin mx-auto" />
            <p className="text-gray-500 dark:text-gray-400 mt-2">{t('common.loading')}</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 text-center">
            <Icon icon="mdi:account-group-outline" width={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? t('common.noData') : t('members.noMembers')}
            </p>
            {!searchQuery && (
              <button
                className="mt-3 text-blue-500 hover:text-blue-600 text-sm font-medium"
                onClick={() => setShowInviteModal(true)}
              >
                {t('members.inviteFirst')}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredMembers.map(member => {
              const roleConfig = ROLES[member.role];
              const statusConfig = STATUS[member.status];
              const isProcessing = actionMemberId === member.id;
              
              return (
                <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* 头像 */}
                    {member.avatar_url ? (
                      <img 
                        src={member.avatar_url} 
                        alt={member.name || member.email}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                        {(member.name || member.email).charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 truncate">
                          {member.name || member.email.split('@')[0]}
                        </span>
                        {/* 角色标签 */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${roleConfig.color}-50 text-${roleConfig.color}-600`}>
                          <Icon icon={roleConfig.icon} width={12} />
                          {roleConfig.label}
                        </span>
                        {/* 状态标签 */}
                        {member.status !== 'active' && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${statusConfig.color}-50 text-${statusConfig.color}-600`}>
                            {statusConfig.label}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 truncate">{member.email}</div>
                    </div>

                    {/* 操作 */}
                    <div className="flex items-center gap-2">
                      {isProcessing ? (
                        <Icon icon="mdi:loading" width={20} className="text-gray-400 animate-spin" />
                      ) : member.role !== 'owner' && (
                        <>
                          {/* 角色选择 */}
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value as 'admin' | 'member' | 'viewer')}
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="admin">管理员</option>
                            <option value="member">成员</option>
                            <option value="viewer">查看者</option>
                          </select>

                          {/* 重新发送邀请 */}
                          {member.status === 'invited' && (
                            <button
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              onClick={() => handleResendInvite(member.id)}
                              title="重新发送邀请"
                            >
                              <Icon icon="mdi:email-send" width={18} className="text-gray-500" />
                            </button>
                          )}

                          {/* 移除 */}
                          <button
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => handleRemove(member)}
                            title="移除成员"
                          >
                            <Icon icon="mdi:account-remove" width={18} className="text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <Icon icon={toast.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} width={18} />
          {toast.message}
        </div>
      )}

      {/* 邀请弹窗 */}
      {showInviteModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95">
            {/* 头部 */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Icon icon="mdi:account-plus" width={20} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('members.invite')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('members.inviteByEmail')}</p>
                </div>
              </div>
              <button
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                onClick={() => setShowInviteModal(false)}
              >
                <Icon icon="mdi:close" width={20} className="text-gray-400" />
              </button>
            </div>

            {/* 表单 */}
            <div className="p-5 space-y-4">
              {inviteError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                  <Icon icon="mdi:alert-circle" width={18} />
                  {inviteError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('common.email')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="member@company.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('members.nameOptional')}
                </label>
                <input
                  type="text"
                  placeholder={t('common.name')}
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('members.role')}
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'member' | 'viewer' }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="admin">{t('members.adminDesc')}</option>
                  <option value="member">{t('members.memberDesc')}</option>
                  <option value="viewer">{t('members.viewerDesc')}</option>
                </select>
              </div>
            </div>

            {/* 底部 */}
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-b-2xl">
              <button
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                onClick={() => setShowInviteModal(false)}
                disabled={isInviting}
              >
                {t('common.cancel')}
              </button>
              <button
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                onClick={handleInvite}
                disabled={isInviting || !inviteForm.email}
              >
                {isInviting ? (
                  <>
                    <Icon icon="mdi:loading" width={18} className="animate-spin" />
                    {t('members.sending')}
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:send" width={18} />
                    {t('members.sendInvite')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

