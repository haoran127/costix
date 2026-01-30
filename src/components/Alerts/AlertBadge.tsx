/**
 * 告警徽章组件
 * 显示在 Header 中，显示未读告警数量
 */

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { getUnreadAlertCount } from '../../services/alerts';
import AlertDrawer from './AlertDrawer';

export default function AlertBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载未读告警数量
  const loadUnreadCount = async () => {
    try {
      setLoading(true);
      const count = await getUnreadAlertCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('加载未读告警数量失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    
    // 每30秒刷新一次未读数量
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 当抽屉关闭时刷新数量
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    loadUnreadCount();
  };

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="告警通知"
      >
        <Icon 
          icon="mdi:bell-outline" 
          width={20} 
          className="text-gray-600 dark:text-gray-300"
        />
        {!loading && unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      <AlertDrawer 
        isOpen={isDrawerOpen} 
        onClose={handleDrawerClose}
        onAlertUpdate={loadUnreadCount}
      />
    </>
  );
}

