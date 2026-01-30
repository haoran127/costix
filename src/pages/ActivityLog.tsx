/**
 * 操作日志页面
 * 显示所有 API Key 操作历史
 */

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { getActivityLogs, type ActivityLog } from '../services/activity-log';
import { getLLMApiKeys, type LLMApiKey } from '../services/api';

export default function ActivityLog() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [keys, setKeys] = useState<LLMApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    api_key_id?: string;
    action?: string;
  }>({});

  // 首次加载 Keys 列表（只加载一次）
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const keysData = await getLLMApiKeys({ platform: 'all' });
        setKeys(keysData);
      } catch (error) {
        console.error('加载 Keys 列表失败:', error);
      }
    };
    loadKeys();
  }, []);

  // 加载日志数据（筛选条件改变时重新加载）
  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const logsData = await getActivityLogs({ ...filter, limit: 100 });
      setLogs(logsData);
    } catch (error) {
      console.error('加载操作日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取 Key 名称
  const getKeyName = (keyId: string): string => {
    const key = keys.find(k => k.id === keyId);
    return key?.name || keyId.substring(0, 8) + '...';
  };

  // 格式化操作类型
  const formatAction = (action: string): string => {
    const actionMap: Record<string, string> = {
      create: t('activityLog.actions.create'),
      delete: t('activityLog.actions.delete'),
      update: t('activityLog.actions.update'),
      sync: t('activityLog.actions.sync'),
      import: t('activityLog.actions.import'),
    };
    return actionMap[action] || action;
  };

  // 格式化时间
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取操作图标
  const getActionIcon = (action: string): string => {
    const iconMap: Record<string, string> = {
      create: 'mdi:plus-circle',
      delete: 'mdi:delete',
      update: 'mdi:pencil',
      sync: 'mdi:sync',
      import: 'mdi:import',
    };
    return iconMap[action] || 'mdi:information';
  };

  // 获取状态颜色
  const getStatusColor = (status: string): string => {
    return status === 'success' 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6 animate-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('activityLog.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('activityLog.subtitle')}
          </p>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('activityLog.filterByKey')}
            </label>
            <select
              value={filter.api_key_id || ''}
              onChange={(e) => setFilter({ ...filter, api_key_id: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">{t('common.all')}</option>
              {keys.map(key => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.platform})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('activityLog.filterByAction')}
            </label>
            <select
              value={filter.action || ''}
              onChange={(e) => setFilter({ ...filter, action: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">{t('common.all')}</option>
              <option value="create">{t('activityLog.actions.create')}</option>
              <option value="delete">{t('activityLog.actions.delete')}</option>
              <option value="update">{t('activityLog.actions.update')}</option>
              <option value="sync">{t('activityLog.actions.sync')}</option>
              <option value="import">{t('activityLog.actions.import')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Icon icon="mdi:loading" width={24} className="text-gray-400 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <Icon icon="mdi:history" width={48} className="mb-4 opacity-50" />
            <p>{t('activityLog.noLogs')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('activityLog.time')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('activityLog.action')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('activityLog.key')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('activityLog.status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('activityLog.details')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon 
                          icon={getActionIcon(log.action)} 
                          width={16} 
                          className="text-gray-400"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {formatAction(log.action)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {getKeyName(log.api_key_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${getStatusColor(log.status)}`}>
                        {log.status === 'success' ? t('common.success') : t('common.error')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {log.error_message && (
                        <span className="text-red-600 dark:text-red-400">
                          {log.error_message}
                        </span>
                      )}
                      {log.new_values && Object.keys(log.new_values).length > 0 && (
                        <span className="text-gray-500 dark:text-gray-400">
                          {Object.keys(log.new_values).join(', ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

