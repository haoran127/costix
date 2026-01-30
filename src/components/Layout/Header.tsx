import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import AlertBadge from '../Alerts/AlertBadge';

interface HeaderProps {
  currentSection: string;
  currentPlatform: string;
  onPlatformChange: (platform: string) => void;
  onSync?: () => void;
}

// AI 平台配置
const AI_PLATFORMS = [
  { id: 'all', nameKey: 'common.all', icon: null },
  { id: 'openai', nameKey: 'platforms.openai', icon: 'simple-icons:openai', color: '#10a37f' },
  { id: 'anthropic', nameKey: 'platforms.anthropic', icon: 'simple-icons:anthropic', color: '#d97757' },
  { id: 'openrouter', nameKey: 'platforms.openrouter', icon: 'mdi:routes', color: '#6366f1' },
  { id: 'aliyun', nameKey: 'platforms.aliyun', icon: 'simple-icons:alibabadotcom', color: '#ff6a00' },
  { id: 'volcengine', nameKey: 'platforms.volcengine', icon: 'mdi:volcano', color: '#ff4d4f' },
  { id: 'deepseek', nameKey: 'platforms.deepseek', icon: 'mdi:brain', color: '#0066ff' },
];

const PAGE_TITLE_KEYS: Record<string, string> = {
  dashboard: 'dashboard.title',
  apikeys: 'apiKeys.title',
  members: 'team.title',
};

export default function Header({ currentSection, currentPlatform, onPlatformChange, onSync }: HeaderProps) {
  const { t } = useTranslation();
  const pageTitle = t(PAGE_TITLE_KEYS[currentSection] || currentSection);
  const showPlatformFilter = currentSection === 'apikeys' || currentSection === 'dashboard';

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{pageTitle}</h2>
        {showPlatformFilter && (
          <div className="flex gap-1.5 ml-4">
            {AI_PLATFORMS.map(platform => (
              <button 
                key={platform.id}
                className={`pill ${currentPlatform === platform.id ? 'active' : ''}`}
                onClick={() => onPlatformChange(platform.id)}
              >
                {platform.icon && (
                  <Icon icon={platform.icon} width={14} style={{ color: currentPlatform === platform.id ? 'white' : platform.color }} />
                )}
                {t(platform.nameKey)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input 
            type="text" 
            placeholder={t('apiKeys.searchKey')} 
            className="pl-8 pr-3 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-900"
          />
          <Icon icon="mdi:magnify" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width={16} />
        </div>
        {/* 告警徽章 */}
        <AlertBadge />
      </div>
    </header>
  );
}

