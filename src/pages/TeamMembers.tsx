import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../components/Modal/ConfirmModal';
import Toast from '../components/Toast';
import {
  getTeamMembers,
  inviteTeamMember,
  updateMemberRole,
  removeMember,
  resendInvite,
  type TeamMember,
  type InviteMemberResult,
} from '../services/team';

export default function TeamMembers() {
  const { t } = useTranslation();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 邀请表单
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'member' as 'admin' | 'member' | 'viewer',
  });
  const [isInviting, setIsInviting] = useState(false);

  // 加载成员列表
  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const data = await getTeamMembers();
      setMembers(data);
    } catch (err) {
      console.error('加载成员失败:', err);
      showToast(t('team.loadMembersFailed') || '加载成员失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 邀请成员
  const handleInvite = async () => {
    if (!inviteForm.email.trim()) {
      showToast(t('team.emailRequired'), 'error');
      return;
    }

    setIsInviting(true);
    try {
      const result = await inviteTeamMember({
        email: inviteForm.email.trim(),
        name: inviteForm.name.trim() || undefined,
        role: inviteForm.role,
      });

      if (result.success) {
        showToast(t('team.inviteSuccess'), 'success');
        setIsInviteModalOpen(false);
        setInviteForm({ email: '', name: '', role: 'member' });
        await loadMembers();
      } else {
        showToast(result.error || t('team.inviteFailed'), 'error');
      }
    } catch (err) {
      console.error('邀请失败:', err);
      showToast(t('team.inviteFailed'), 'error');
    } finally {
      setIsInviting(false);
    }
  };

  // 更新角色
  const handleRoleUpdate = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    try {
      const result = await updateMemberRole(memberId, newRole);
      if (result.success) {
        showToast(t('team.roleUpdateSuccess'), 'success');
        await loadMembers();
      } else {
        showToast(result.error || t('team.roleUpdateFailed'), 'error');
      }
    } catch (err) {
      console.error('更新角色失败:', err);
      showToast(t('team.roleUpdateFailed'), 'error');
    }
  };

  // 移除成员
  const handleRemove = async () => {
    if (!removingMemberId) return;

    setIsRemoving(true);
    try {
      const result = await removeMember(removingMemberId);
      if (result.success) {
        showToast(t('team.removeSuccess'), 'success');
        setRemovingMemberId(null);
        await loadMembers();
      } else {
        showToast(result.error || t('team.removeFailed'), 'error');
      }
    } catch (err) {
      console.error('移除成员失败:', err);
      showToast(t('team.removeFailed'), 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  // 重新发送邀请
  const handleResendInvite = async (memberId: string) => {
    try {
      const result = await resendInvite(memberId);
      if (result.success) {
        showToast(t('team.resendInviteSuccess'), 'success');
      } else {
        showToast(result.error || t('team.resendInviteFailed'), 'error');
      }
    } catch (err) {
      console.error('重新发送邀请失败:', err);
      showToast(t('team.resendInviteFailed'), 'error');
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      owner: t('team.roleOwner'),
      admin: t('team.roleAdmin'),
      member: t('team.roleMember'),
      viewer: t('team.roleViewer'),
    };
    return roleMap[role] || role;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      active: t('team.statusActive'),
      invited: t('team.statusInvited'),
      disabled: t('team.statusDisabled'),
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      invited: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      disabled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-5">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {t('team.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('team.subtitle')}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsInviteModalOpen(true)}
        >
          <Icon icon="mdi:account-plus" width={18} />
          {t('team.inviteMember')}
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('team.totalMembers')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                {members.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Icon icon="mdi:account-group" width={24} className="text-blue-500 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('team.activeMembers')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                {members.filter(m => m.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <Icon icon="mdi:account-check" width={24} className="text-green-500 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('team.invitedMembers')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                {members.filter(m => m.status === 'invited').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Icon icon="mdi:account-clock" width={24} className="text-yellow-500 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-500 dark:text-gray-400">{t('common.loading')}</span>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Icon icon="mdi:account-group-outline" width={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('team.noMembers')}</p>
            <button
              className="btn btn-primary mt-4"
              onClick={() => setIsInviteModalOpen(true)}
            >
              {t('team.inviteFirstMember')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('team.tableHeaderMember')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('team.tableHeaderRole')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('team.tableHeaderStatus')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('team.tableHeaderActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
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
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-100">
                            {member.name || member.email}
                          </p>
                          {member.name && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {member.role === 'owner' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          {getRoleLabel(member.role)}
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleUpdate(member.id, e.target.value as 'admin' | 'member' | 'viewer')}
                          className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                          disabled={member.role === 'owner'}
                        >
                          <option value="admin">{t('team.roleAdmin')}</option>
                          <option value="member">{t('team.roleMember')}</option>
                          <option value="viewer">{t('team.roleViewer')}</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                        {getStatusLabel(member.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {member.status === 'invited' && (
                          <button
                            className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                            onClick={() => handleResendInvite(member.id)}
                            title={t('team.resendInviteTooltip')}
                          >
                            <Icon icon="mdi:email-send" width={18} />
                          </button>
                        )}
                        {member.role !== 'owner' && (
                          <button
                            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            onClick={() => setRemovingMemberId(member.id)}
                            title={t('team.removeMemberTooltip')}
                          >
                            <Icon icon="mdi:delete-outline" width={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 邀请成员弹窗 */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {t('team.inviteModalTitle')}
              </h2>
              <button
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={() => setIsInviteModalOpen(false)}
              >
                <Icon icon="mdi:close" width={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('team.inviteEmailLabel')} *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('team.inviteNameLabel')}
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                  placeholder={t('team.inviteNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('team.inviteRoleLabel')}
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'admin' | 'member' | 'viewer' })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                >
                  <option value="admin">{t('team.roleAdmin')} - {t('team.roleAdminDescription')}</option>
                  <option value="member">{t('team.roleMember')} - {t('team.roleMemberDescription')}</option>
                  <option value="viewer">{t('team.roleViewer')} - {t('team.roleViewerDescription')}</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                onClick={() => setIsInviteModalOpen(false)}
                disabled={isInviting}
              >
                {t('common.cancel')}
              </button>
              <button
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={handleInvite}
                disabled={isInviting || !inviteForm.email.trim()}
              >
                {isInviting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('common.sending')}
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:send" width={18} />
                    {t('team.sendInvite')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmModal
        isOpen={removingMemberId !== null}
        title={t('team.removeConfirmTitle')}
        message={t('team.removeConfirmMessage')}
        type="danger"
        confirmText={t('team.removeButton')}
        cancelText={t('common.cancel')}
        onConfirm={handleRemove}
        onCancel={() => setRemovingMemberId(null)}
        isLoading={isRemoving}
      />

      {/* Toast 提示 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

