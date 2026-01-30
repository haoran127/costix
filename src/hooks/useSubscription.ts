/**
 * 订阅状态 Hook
 * 提供订阅信息和功能权限检查
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getUserSubscription,
  canAddMoreKeys,
  type UserSubscription,
  type SubscriptionFeatures,
} from '../services/subscription';

interface UseSubscriptionReturn {
  // 订阅信息
  subscription: UserSubscription | null;
  loading: boolean;
  
  // 计划信息
  planName: string;
  planDisplayName: string;
  isPro: boolean;
  isTeam: boolean;
  isEnterprise: boolean;
  isFree: boolean;
  
  // 限制信息
  maxKeys: number;
  maxTeamMembers: number;
  maxPlatformAccounts: number;
  
  // Key 数量检查
  keyQuota: { current: number; max: number; allowed: boolean } | null;
  checkKeyQuota: () => Promise<void>;
  
  // 功能权限
  features: SubscriptionFeatures;
  canExport: boolean;
  canBatchOperation: boolean;
  canUseAlerts: boolean;
  canUseApi: boolean;
  
  // 刷新
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyQuota, setKeyQuota] = useState<{ current: number; max: number; allowed: boolean } | null>(null);

  // 加载订阅信息
  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserSubscription();
      setSubscription(data);
    } catch (err) {
      console.error('加载订阅信息失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 检查 Key 配额
  const checkKeyQuota = useCallback(async () => {
    try {
      const quota = await canAddMoreKeys();
      setKeyQuota(quota);
    } catch (err) {
      console.error('检查 Key 配额失败:', err);
    }
  }, []);

  // 首次加载
  useEffect(() => {
    loadSubscription();
    checkKeyQuota();
  }, [loadSubscription, checkKeyQuota]);

  // 计算派生值
  const planName = subscription?.plan_name || 'free';
  const planDisplayName = subscription?.plan_display_name || '免费版';
  const isFree = planName === 'free';
  const isPro = planName === 'pro';
  const isTeam = planName === 'team';
  const isEnterprise = planName === 'enterprise';

  const features = subscription?.features || {
    export: false,
    batch_operations: false,
    alerts: false,
    api_access: false,
    priority_support: false,
    custom_branding: false,
  };

  return {
    subscription,
    loading,
    
    planName,
    planDisplayName,
    isPro,
    isTeam,
    isEnterprise,
    isFree,
    
    maxKeys: subscription?.max_keys ?? 1,
    maxTeamMembers: subscription?.max_team_members ?? 1,
    maxPlatformAccounts: subscription?.max_platform_accounts ?? 1,
    
    keyQuota,
    checkKeyQuota,
    
    features,
    canExport: features.export,
    canBatchOperation: features.batch_operations,
    canUseAlerts: features.alerts,
    canUseApi: features.api_access,
    
    refresh: loadSubscription,
  };
}

export default useSubscription;

