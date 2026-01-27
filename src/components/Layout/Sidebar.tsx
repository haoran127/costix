import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../Modal/ConfirmModal';
import { signOut } from '../../lib/auth';

interface SidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  } | null;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

// 导航项配置 - 使用翻译 key
const getNavItems = (t: (key: string) => string) => [
  { section: 'overview', label: t('nav.overview'), items: [
    { id: 'dashboard', label: t('nav.dashboard'), icon: 'mdi:view-dashboard-outline' },
  ]},
  { section: 'keys', label: t('nav.apiKeys'), items: [
    { id: 'apikeys', label: t('nav.apiKeys'), icon: 'mdi:key-chain' },
  ]},
  { section: 'team', label: t('nav.team'), items: [
    { id: 'members', label: t('nav.members'), icon: 'mdi:account-group' },
  ]},
];

export default function Sidebar({ currentSection, onSectionChange, user, onOpenProfile, onOpenSettings }: SidebarProps) {
  const { t } = useTranslation();
  const navItems = getNavItems(t);
  
  // 用户信息（支持开发模式和真实用户）
  const userName = user?.name || user?.email?.split('@')[0] || '用户';
  const userEmail = user?.email || 'user@costix.net';
  const userAvatar = user?.avatar;
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 确认退出登录
  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 清除开发模式的模拟用户
      localStorage.removeItem('costix_dev_user');
      // 调用 Supabase 退出
      await signOut();
      // 刷新页面
      window.location.reload();
    } catch (err) {
      console.error('退出登录失败:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <>
      <aside className="w-56 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
          <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Icon icon="mdi:chart-timeline-variant" width={22} className="text-blue-500" />
            {t('common.productName')}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('common.productSlogan')}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(group => (
            <div key={group.section}>
              <div className="text-xs text-gray-400 dark:text-gray-500 px-3 py-2 mt-2 font-medium">{group.label}</div>
              {group.items.map(item => (
                <a
                  key={item.id}
                  href="#"
                  className={`nav-item ${currentSection === item.id ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSectionChange(item.id);
                  }}
                >
                  <Icon icon={item.icon} width={18} />
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* User Info with Menu */}
        <div className="p-3 border-t border-gray-100 dark:border-slate-700 relative" ref={menuRef}>
          <div 
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg p-1.5 -m-1.5 transition-colors"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={userName} 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{userName}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{userEmail}</div>
            </div>
            <Icon 
              icon={isUserMenuOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} 
              width={16} 
              className="text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
          </div>

          {/* User Menu Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden z-50">
              <div className="py-1">
                <button
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenProfile?.();
                  }}
                >
                  <Icon icon="mdi:account-circle-outline" width={18} className="text-gray-500 dark:text-gray-400" />
                  {t('nav.profile')}
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettings?.();
                  }}
                >
                  <Icon icon="mdi:cog-outline" width={18} className="text-gray-500 dark:text-gray-400" />
                  {t('nav.settings')}
                </button>
                <div className="border-t border-gray-100 dark:border-slate-600 my-1"></div>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                >
                  <Icon icon="mdi:logout" width={18} className="text-red-500 dark:text-red-400" />
                  {t('nav.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 退出登录确认弹窗 */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title={t('nav.logout')}
        message={t('nav.logout_confirm_message')}
        type="danger"
        confirmText={isLoggingOut ? t('common.logging_out') : t('nav.logout')}
        cancelText={t('common.cancel')}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
