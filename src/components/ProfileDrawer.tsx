/**
 * 个人信息抽屉组件
 * 从右侧滑出，支持查看和修改用户信息
 */

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { updatePassword } from '../lib/auth';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  } | null;
}

type TabType = 'profile' | 'security';

export default function ProfileDrawer({ isOpen, onClose, user }: ProfileDrawerProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isClosing, setIsClosing] = useState(false);
  
  // 个人信息表单
  const [name, setName] = useState(user?.name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 修改密码表单
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  // 同步用户信息
  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  // 处理关闭动画
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      // 重置表单
      setActiveTab('profile');
      setProfileMessage(null);
      setPasswordMessage(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 200);
  };

  // 保存个人信息
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage(null);
    
    try {
      // 开发模式：更新本地存储
      if (import.meta.env.DEV) {
        const devUserStr = localStorage.getItem('costix_dev_user');
        if (devUserStr) {
          const devUser = JSON.parse(devUserStr);
          devUser.name = name;
          localStorage.setItem('costix_dev_user', JSON.stringify(devUser));
          setProfileMessage({ type: 'success', text: t('profile.updateSuccess') });
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      }
      
      // TODO: 调用 Supabase 更新用户元数据
      // const { error } = await supabase.auth.updateUser({
      //   data: { name }
      // });
      
      setProfileMessage({ type: 'success', text: t('profile.updateSuccess') });
    } catch (err) {
      setProfileMessage({ type: 'error', text: t('profile.updateFailed') });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    // 验证
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: t('profile.passwordTooShort') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: t('profile.passwordMismatch') });
      return;
    }
    
    setIsSavingPassword(true);
    setPasswordMessage(null);
    
    try {
      const result = await updatePassword(newPassword);
      
      if (result.success) {
        setPasswordMessage({ type: 'success', text: t('profile.passwordUpdated') });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: result.error || t('profile.updateFailed') });
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: t('profile.updateFailed') });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!isOpen && !isClosing) return null;

  const userName = user?.name || user?.email?.split('@')[0] || '用户';
  const userEmail = user?.email || '';

  return (
    <>
      {/* 遮罩层 */}
      <div 
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />
      
      {/* 抽屉 */}
      <div 
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-200 ${
          isClosing ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('profile.title')}</h2>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Icon icon="mdi:close" width={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 用户头像区域 */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={userName} 
                className="w-16 h-16 rounded-full object-cover ring-4 ring-white dark:ring-slate-700 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white dark:ring-slate-700 shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{userName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</div>
            </div>
          </div>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-gray-100 dark:border-slate-700">
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'profile' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            {t('profile.info')}
            {activeTab === 'profile' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'security' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('security')}
          >
            {t('profile.security')}
            {activeTab === 'security' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 280px)' }}>
          {/* 个人信息 */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {profileMessage && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  profileMessage.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                  <Icon icon={profileMessage.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} width={18} />
                  <span className="text-sm">{profileMessage.text}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('common.email')}
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('profile.emailReadonly')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('profile.nickname')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('profile.nicknamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingProfile ? (
                  <Icon icon="mdi:loading" width={18} className="animate-spin" />
                ) : (
                  <Icon icon="mdi:content-save" width={18} />
                )}
                {t('profile.saveChanges')}
              </button>
            </div>
          )}

          {/* 安全设置 */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.changePassword')}</h3>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                >
                  <Icon icon={showPasswords ? 'mdi:eye-off' : 'mdi:eye'} width={14} />
                  {showPasswords ? t('profile.hidePassword') : t('profile.showPassword')}
                </button>
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  passwordMessage.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                  <Icon icon={passwordMessage.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} width={18} />
                  <span className="text-sm">{passwordMessage.text}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('profile.currentPassword')}
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('profile.currentPasswordPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('profile.newPassword')}
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('profile.newPasswordPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('profile.confirmNewPassword')}
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('profile.confirmPasswordPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleChangePassword}
                disabled={isSavingPassword || !newPassword || !confirmPassword}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingPassword ? (
                  <Icon icon="mdi:loading" width={18} className="animate-spin" />
                ) : (
                  <Icon icon="mdi:lock-reset" width={18} />
                )}
                {t('profile.updatePassword')}
              </button>

              {/* 其他安全选项 */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-700 mt-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('profile.otherOptions')}</h4>
                <div className="space-y-2">
                  <button className="w-full p-3 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-3">
                    <Icon icon="mdi:shield-account" width={20} className="text-gray-400" />
                    <div>
                      <div className="font-medium">{t('profile.twoFactor')}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{t('profile.twoFactorDesc')}</div>
                    </div>
                    <Icon icon="mdi:chevron-right" width={18} className="text-gray-300 dark:text-gray-600 ml-auto" />
                  </button>
                  <button className="w-full p-3 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-3">
                    <Icon icon="mdi:history" width={20} className="text-gray-400" />
                    <div>
                      <div className="font-medium">{t('profile.loginHistory')}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{t('profile.loginHistoryDesc')}</div>
                    </div>
                    <Icon icon="mdi:chevron-right" width={18} className="text-gray-300 dark:text-gray-600 ml-auto" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

