/**
 * 告警抽屉组件
 * 显示告警列表，支持标记已读、已解决
 */

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { 
  getAlerts, 
  markAlertAsRead, 
  markAllAlertsAsRead,
  markAlertAsResolved,
  type LLMAlert 
} from '../../services/alerts';
import AlertItem from './AlertItem';

interface AlertDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertUpdate?: () => void;
}

export default function AlertDrawer({ isOpen, onClose, onAlertUpdate }: AlertDrawerProps) {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<LLMAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'resolved'>('all');

  // 加载告警列表
  const loadAlerts = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      
      if (filter === 'unread') {
        params.is_read = false;
        params.is_resolved = false;
      } else if (filter === 'resolved') {
        params.is_resolved = true;
      }
      
      const data = await getAlerts(params);
      setAlerts(data);
    } catch (error) {
      console.error('加载告警列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen, filter]);

  // 标记所有为已读
  const handleMarkAllAsRead = async () => {
    try {
      const result = await markAllAlertsAsRead();
      if (result.success) {
        await loadAlerts();
        onAlertUpdate?.();
      }
    } catch (error) {
      console.error('标记所有告警为已读失败:', error);
    }
  };

  // 处理告警更新
  const handleAlertUpdate = async () => {
    await loadAlerts();
    onAlertUpdate?.();
  };

  const unreadCount = alerts.filter(a => !a.is_read && !a.is_resolved).length;

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* 抽屉 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-xl z-50 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Icon icon="mdi:bell" width={24} className="text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('alerts.title')}
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {t('alerts.markAllAsRead')}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon icon="mdi:close" width={20} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t('common.all')}
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'unread'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t('alerts.unreadCount')}
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'resolved'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t('alerts.markAsResolved')}
          </button>
        </div>

        {/* 告警列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon icon="mdi:loading" width={24} className="text-gray-400 animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <Icon icon="mdi:bell-off-outline" width={48} className="mb-4 opacity-50" />
              <p>{t('alerts.noAlerts')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onUpdate={handleAlertUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

