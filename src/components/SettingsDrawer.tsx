/**
 * 设置抽屉
 * 主题切换、语言切换等设置 [[memory:11405692]]
 */

import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { languages, type LanguageCode } from '../i18n';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const { t, i18n } = useTranslation();
  const { theme, themeMode, setThemeMode } = useTheme();

  const handleLanguageChange = (langCode: LanguageCode) => {
    i18n.changeLanguage(langCode);
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="drawer-overlay"
      onClick={onClose}
    >
      <div 
        className="drawer animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drawer-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 flex items-center justify-center">
              <Icon icon="mdi:cog" width={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-[var(--text-primary)]">
                {t('settings.title')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-[var(--text-tertiary)]">
                {t('settings.appearance')}
              </p>
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
          >
            <Icon icon="mdi:close" width={20} className="dark:text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body space-y-6">
          {/* 主题设置 */}
          <div className="bg-gray-50 dark:bg-[var(--bg-secondary)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-[var(--text-primary)]">
              <Icon icon="mdi:palette" width={18} />
              {t('settings.theme')}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {/* Light */}
              <button
                onClick={() => setThemeMode('light')}
                className={`p-2 rounded-lg border-2 transition-all ${
                  themeMode === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:border-[var(--accent-primary)] dark:!bg-blue-100'
                    : 'border-gray-200 dark:border-[var(--border-primary)] hover:border-gray-300 dark:hover:border-[var(--text-muted)] bg-white dark:bg-[var(--bg-tertiary)]'
                }`}
                style={themeMode === 'light' && theme === 'dark' ? { backgroundColor: '#dbeafe' } : undefined}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <Icon icon="mdi:white-balance-sunny" width={22} className={`${themeMode === 'light' ? 'text-amber-500 dark:text-amber-600' : 'text-amber-500 dark:text-amber-400'}`} />
                  <span className={`text-xs font-semibold ${themeMode === 'light' ? 'text-gray-900 dark:!text-gray-900' : 'text-gray-700 dark:text-[var(--text-primary)]'}`} style={themeMode === 'light' && theme === 'dark' ? { color: '#111827' } : undefined}>
                    {t('settings.themeLight')}
                  </span>
                </div>
              </button>

              {/* Dark */}
              <button
                onClick={() => setThemeMode('dark')}
                className={`p-2 rounded-lg border-2 transition-all ${
                  themeMode === 'dark'
                    ? 'border-blue-500 bg-blue-50 dark:border-[var(--accent-primary)] dark:!bg-blue-100'
                    : 'border-gray-200 dark:border-[var(--border-primary)] hover:border-gray-300 dark:hover:border-[var(--text-muted)] bg-white dark:bg-[var(--bg-tertiary)]'
                }`}
                style={themeMode === 'dark' && theme === 'dark' ? { backgroundColor: '#dbeafe' } : undefined}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <Icon icon="mdi:moon-waning-crescent" width={22} className={`${themeMode === 'dark' ? 'text-blue-400 dark:text-blue-600' : 'text-blue-400 dark:text-[var(--accent-primary)]'}`} />
                  <span className={`text-xs font-semibold ${themeMode === 'dark' ? 'text-gray-900 dark:!text-gray-900' : 'text-gray-700 dark:text-[var(--text-primary)]'}`} style={themeMode === 'dark' && theme === 'dark' ? { color: '#111827' } : undefined}>
                    {t('settings.themeDark')}
                  </span>
                </div>
              </button>

              {/* System */}
              <button
                onClick={() => setThemeMode('system')}
                className={`p-2 rounded-lg border-2 transition-all ${
                  themeMode === 'system'
                    ? 'border-blue-500 bg-blue-50 dark:border-[var(--accent-primary)] dark:!bg-blue-100'
                    : 'border-gray-200 dark:border-[var(--border-primary)] hover:border-gray-300 dark:hover:border-[var(--text-muted)] bg-white dark:bg-[var(--bg-tertiary)]'
                }`}
                style={themeMode === 'system' && theme === 'dark' ? { backgroundColor: '#dbeafe' } : undefined}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <Icon icon="mdi:laptop" width={22} className={`${themeMode === 'system' ? 'text-gray-600 dark:text-gray-700' : 'text-gray-500 dark:text-[var(--text-tertiary)]'}`} />
                  <span className={`text-xs font-semibold ${themeMode === 'system' ? 'text-gray-900 dark:!text-gray-900' : 'text-gray-700 dark:text-[var(--text-primary)]'}`} style={themeMode === 'system' && theme === 'dark' ? { color: '#111827' } : undefined}>
                    {t('settings.themeSystem')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 语言设置 */}
          <div className="bg-gray-50 dark:bg-[var(--bg-secondary)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-[var(--text-primary)]">
              <Icon icon="mdi:translate" width={18} />
              {t('settings.language')}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`px-3 py-2 rounded-lg border-2 flex items-center gap-2 transition-all text-left ${
                    i18n.language === lang.code
                      ? 'border-blue-500 bg-blue-50 dark:border-[var(--accent-primary)] dark:!bg-blue-100 dark:shadow-[0_0_0_2px_rgba(90,127,184,0.3)]'
                      : 'border-gray-200 dark:border-[var(--border-primary)] hover:border-gray-300 dark:hover:border-[var(--text-muted)] bg-white dark:bg-[var(--bg-tertiary)]'
                  }`}
                  style={i18n.language === lang.code && theme === 'dark' ? { backgroundColor: '#dbeafe' } : undefined}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className={`text-xs font-semibold truncate ${
                    i18n.language === lang.code 
                      ? 'text-gray-900 dark:!text-gray-900' 
                      : 'text-gray-700 dark:text-[var(--text-primary)]'
                  }`}
                  style={i18n.language === lang.code && theme === 'dark' ? { color: '#111827' } : undefined}>
                    {lang.name}
                  </span>
                  {i18n.language === lang.code && (
                    <Icon icon="mdi:check" width={14} className="ml-auto text-blue-500 dark:text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 其他设置预留 */}
          <div className="bg-gray-50 dark:bg-[var(--bg-secondary)] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-[var(--text-primary)]">
              <Icon icon="mdi:bell-outline" width={18} />
              {t('settings.notifications')}
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-600 dark:text-[var(--text-secondary)]">
                  {t('settings.emailNotifications')}
                </span>
                <div className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="toggle-slider"></span>
                </div>
              </label>
              
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-600 dark:text-[var(--text-secondary)]">
                  {t('settings.usageAlerts')}
                </span>
                <div className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

