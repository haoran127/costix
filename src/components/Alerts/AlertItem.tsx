/**
 * 告警项组件
 * 显示单个告警的详细信息
 */

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { 
  markAlertAsRead, 
  markAlertAsResolved,
  type LLMAlert 
} from '../../services/alerts';

interface AlertItemProps {
  alert: LLMAlert;
  onUpdate: () => void;
}

export default function AlertItem({ alert, onUpdate }: AlertItemProps) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);

  // 获取严重程度对应的颜色和图标
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'error':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          icon: 'mdi:alert-circle',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      case 'warning':
        return {
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          icon: 'mdi:alert',
          borderColor: 'border-orange-200 dark:border-orange-800'
        };
      default:
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          icon: 'mdi:information',
          borderColor: 'border-blue-200 dark:border-blue-800'
        };
    }
  };

  const severityStyle = getSeverityStyle(alert.severity);

  // 标记为已读
  const handleMarkAsRead = async () => {
    if (alert.is_read) return;
    
    try {
      setProcessing(true);
      const result = await markAlertAsRead(alert.id);
      if (result.success) {
        onUpdate();
      }
    } catch (error) {
      console.error('标记告警为已读失败:', error);
    } finally {
      setProcessing(false);
    }
  };

  // 标记为已解决
  const handleMarkAsResolved = async () => {
    if (alert.is_resolved) return;
    
    try {
      setProcessing(true);
      const result = await markAlertAsResolved(alert.id);
      if (result.success) {
        onUpdate();
      }
    } catch (error) {
      console.error('标记告警为已解决失败:', error);
    } finally {
      setProcessing(false);
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  return (
    <div 
      className={`p-4 transition-colors ${
        !alert.is_read && !alert.is_resolved
          ? `${severityStyle.bgColor} border-l-4 ${severityStyle.borderColor}`
          : 'bg-white dark:bg-slate-900'
      } ${!alert.is_read && !alert.is_resolved ? 'hover:bg-gray-50 dark:hover:bg-slate-800' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${severityStyle.bgColor}`}>
          <Icon 
            icon={severityStyle.icon} 
            width={20} 
            className={severityStyle.color}
          />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`text-sm font-semibold ${alert.is_read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {alert.title}
            </h3>
            {!alert.is_read && !alert.is_resolved && (
              <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
          
          <p className={`text-sm mb-2 ${alert.is_read ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
            {alert.message}
          </p>

          {/* 告警数据详情 */}
          {alert.alert_data && Object.keys(alert.alert_data).length > 0 && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-800 rounded text-xs text-gray-600 dark:text-gray-400">
              {Object.entries(alert.alert_data).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="font-medium">{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 mt-3">
            {!alert.is_read && (
              <button
                onClick={handleMarkAsRead}
                disabled={processing}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
              >
                {t('alerts.markAsRead')}
              </button>
            )}
            {!alert.is_resolved && (
              <button
                onClick={handleMarkAsResolved}
                disabled={processing}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
              >
                {t('alerts.markAsResolved')}
              </button>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
              {formatTime(alert.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

