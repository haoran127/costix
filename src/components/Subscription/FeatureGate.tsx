/**
 * 功能限制组件
 * 检查用户是否有权限使用某个功能
 */

import { useState, ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { useSubscription } from '../../hooks/useSubscription';
import UpgradeModal from './UpgradeModal';

interface FeatureGateProps {
  feature: 'export' | 'batch_operations' | 'alerts' | 'api_access';
  children: ReactNode;
  fallback?: ReactNode;  // 无权限时显示的内容
}

/**
 * 功能门控组件
 * 有权限时渲染 children，无权限时显示升级提示
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { features } = useSubscription();
  const hasAccess = features[feature];

  if (hasAccess) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

interface FeatureButtonProps {
  feature: 'export' | 'batch_operations' | 'alerts' | 'api_access';
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

/**
 * 功能按钮组件
 * 有权限时正常触发 onClick，无权限时显示升级弹窗
 */
export function FeatureButton({ 
  feature, 
  children, 
  onClick, 
  className = '',
  disabled = false
}: FeatureButtonProps) {
  const { features } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  const hasAccess = features[feature];

  const handleClick = () => {
    if (hasAccess) {
      onClick?.();
    } else {
      setShowUpgrade(true);
    }
  };

  return (
    <>
      <button
        className={`${className} ${!hasAccess ? 'relative' : ''}`}
        onClick={handleClick}
        disabled={disabled}
      >
        {children}
        {!hasAccess && (
          <Icon 
            icon="mdi:lock" 
            width={12} 
            className="absolute -top-1 -right-1 text-orange-500" 
          />
        )}
      </button>
      
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={feature}
      />
    </>
  );
}

interface KeyQuotaGateProps {
  children: ReactNode;
  onExceeded?: () => void;  // 超出配额时的回调
}

/**
 * Key quota gate component
 * Checks if user can add more keys
 */
export function KeyQuotaGate({ children, onExceeded }: KeyQuotaGateProps) {
  const { keyQuota } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // If still loading or quota exceeded
  if (!keyQuota) {
    return <>{children}</>;
  }

  if (!keyQuota.allowed) {
    return (
      <>
        <div 
          className="cursor-pointer"
          onClick={() => {
            setShowUpgrade(true);
            onExceeded?.();
          }}
        >
          {children}
        </div>
        
        <UpgradeModal
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          feature="more_keys"
          title="API Key Limit Reached"
          description={`Your current plan supports up to ${keyQuota.max} API Key${keyQuota.max > 1 ? 's' : ''}. Upgrade to add more.`}
        />
      </>
    );
  }

  return <>{children}</>;
}

/**
 * Quota indicator component
 * Shows current usage and limits
 */
export function QuotaIndicator() {
  const { keyQuota, planDisplayName, isFree } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!keyQuota) return null;

  const { current, max } = keyQuota;
  const percentage = max === -1 ? 0 : (current / max) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <>
      <div 
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition-colors whitespace-nowrap ${
          isAtLimit 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
            : isNearLimit
              ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'
        }`}
        onClick={() => isFree && setShowUpgrade(true)}
      >
        <Icon icon="mdi:key" width={14} className="flex-shrink-0" />
        <span className="font-medium">
          {max === -1 ? (
            `${current}`
          ) : (
            `${current}/${max}`
          )}
        </span>
        <span className="text-xs opacity-70">Keys</span>
        {isFree && (
          <Icon icon="mdi:arrow-up-circle" width={14} className="text-blue-500 flex-shrink-0" />
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="more_keys"
      />
    </>
  );
}

export default FeatureGate;

