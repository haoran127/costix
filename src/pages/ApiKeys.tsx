import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { 
  getLLMApiKeys, 
  addManualLLMApiKey, 
  deleteLLMApiKey,
  updateLLMApiKeyOwner,
  updateLLMApiKeyOwnerContact,
  clearLLMApiKeyOwnerContact,
  updateLLMApiKeyBusiness,
  updateLLMApiKeyDescription,
  updateLLMApiKeyEncrypted,
  fetchOpenAIUsageDirect,
  getLLMPlatformAccounts,
  createOpenAIKey,
  getOpenAIProjects,
  syncOpenAIKeys,
  listClaudeKeys,
  syncClaudeUsage,
  updateClaudeKey,
  listOpenRouterKeys,
  createOpenRouterKey,
  deleteOpenRouterKey,
  getOpenRouterCredits,
  syncOpenRouterKeys,
  updatePlatformAccountBalance,
  syncOpenAICosts,
  syncClaudeCosts,
  createVolcengineKey,
  deleteVolcengineKey,
  syncVolcengineKeys,
  syncVolcengineData,
  getAuthHeaders,
  type LLMApiKey,
} from '../services/api';
import { getTeamMembers, type TeamMember } from '../services/team';
import { exportToCSV, exportToExcel, API_KEYS_EXPORT_COLUMNS } from '../utils/export';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradeModal, QuotaIndicator } from '../components/Subscription';

// AI 平台配置
const AI_PLATFORMS = {
  openai: { 
    name: 'OpenAI', 
    icon: 'simple-icons:openai', 
    color: '#10a37f',
    bgColor: 'bg-emerald-500',
    description: 'GPT-4, GPT-3.5, DALL-E, Whisper'
  },
  anthropic: { 
    name: 'Claude (Anthropic)', 
    icon: 'simple-icons:anthropic', 
    color: '#d97757',
    bgColor: 'bg-orange-500',
    description: 'Claude 3.5, Claude 3, Claude 2'
  },
  openrouter: { 
    name: 'OpenRouter', 
    icon: 'mdi:routes', 
    color: '#6366f1',
    bgColor: 'bg-indigo-500',
    description: 'GPT-4, Claude, Llama, Mistral 等多模型聚合'
  },
  aliyun: { 
    name: '阿里通义千问', 
    icon: 'simple-icons:alibabadotcom', 
    color: '#ff6a00',
    bgColor: 'bg-orange-600',
    description: 'Qwen-Max, Qwen-Plus, Qwen-Turbo'
  },
  volcengine: { 
    name: '火山引擎', 
    icon: 'mdi:volcano', 
    color: '#ff4d4f',
    bgColor: 'bg-red-500',
    description: '豆包大模型, Skylark'
  },
  deepseek: { 
    name: 'DeepSeek', 
    icon: 'mdi:brain', 
    color: '#0066ff',
    bgColor: 'bg-blue-600',
    description: 'DeepSeek-V3, DeepSeek-Coder'
  },
} as const;

type PlatformKey = keyof typeof AI_PLATFORMS;

// 默认平台配置（当平台未知时使用）
const DEFAULT_PLATFORM_CONFIG = {
  name: '未知平台',
  icon: 'mdi:help-circle',
  color: '#6b7280',
  bgColor: 'bg-gray-500',
  description: '未识别的平台'
};

// 安全获取平台配置的辅助函数
const getPlatformConfig = (platform: string) => {
  return AI_PLATFORMS[platform as PlatformKey] || DEFAULT_PLATFORM_CONFIG;
};

// Mock 数据
const MOCK_API_KEYS = [
  {
    id: '1',
    name: 'GPT-4 生产环境',
    platform: 'openai' as PlatformKey,
    apiKey: 'sk-proj-xxxx...xxxx1234',
    maskedKey: 'sk-proj-************************************1234',
    status: 'active',
    balance: 156.78,
    totalUsage: 843.22,
    monthlyUsage: 123.45,
    tokenUsage: {
      total: 12580000,
      monthly: 1850000,
      daily: 62000,
    },
    owner: {
      id: 'user1',
      name: '张三',
      avatar: null,
      email: 'zhangsan@company.com',
      status: 'active' as const,
    },
    business: 'AI 客服助手',
    createdAt: '2024-12-15T10:30:00Z',
    lastUsedAt: '2025-01-22T08:45:00Z',
    expiresAt: null,
    rateLimit: {
      rpm: 60,
      tpm: 150000,
    }
  },
  {
    id: '2',
    name: 'Claude API 测试',
    platform: 'anthropic' as PlatformKey,
    apiKey: 'sk-ant-xxxx...xxxx5678',
    maskedKey: 'sk-ant-************************************5678',
    status: 'active',
    balance: 89.50,
    totalUsage: 210.50,
    monthlyUsage: 45.20,
    tokenUsage: {
      total: 5680000,
      monthly: 890000,
      daily: 28000,
    },
    owner: {
      id: 'user2',
      name: '李四',
      avatar: null,
      email: 'lisi@company.com',
      status: 'active' as const,
    },
    business: '内容审核系统',
    createdAt: '2025-01-05T14:20:00Z',
    lastUsedAt: '2025-01-22T09:12:00Z',
    expiresAt: null,
    rateLimit: {
      rpm: 50,
      tpm: 100000,
    }
  },
  {
    id: '3',
    name: '通义千问-内部开发',
    platform: 'aliyun' as PlatformKey,
    apiKey: 'sk-qwen-xxxx...xxxx9012',
    maskedKey: 'sk-qwen-************************************9012',
    status: 'active',
    balance: 520.00,
    totalUsage: 480.00,
    monthlyUsage: 89.30,
    tokenUsage: {
      total: 28900000,
      monthly: 4200000,
      daily: 156000,
    },
    owner: {
      id: 'user3',
      name: '王五',
      avatar: null,
      email: 'wangwu@company.com',
      status: 'resigned' as const, // 离职
    },
    business: '智能问答系统',
    createdAt: '2024-11-20T09:00:00Z',
    lastUsedAt: '2025-01-22T10:05:00Z',
    expiresAt: '2025-06-30T23:59:59Z',
    rateLimit: {
      rpm: 100,
      tpm: 200000,
    }
  },
  {
    id: '4',
    name: 'DeepSeek 代码助手',
    platform: 'deepseek' as PlatformKey,
    apiKey: 'sk-deep-xxxx...xxxx3456',
    maskedKey: 'sk-deep-************************************3456',
    status: 'active',
    balance: 200.00,
    totalUsage: 50.00,
    monthlyUsage: 25.80,
    tokenUsage: {
      total: 3200000,
      monthly: 1100000,
      daily: 45000,
    },
    owner: {
      id: 'user1',
      name: '张三',
      avatar: null,
      email: 'zhangsan@company.com',
      status: 'active' as const,
    },
    business: 'IDE 代码补全插件',
    createdAt: '2025-01-10T16:45:00Z',
    lastUsedAt: '2025-01-22T11:30:00Z',
    expiresAt: null,
    rateLimit: {
      rpm: 120,
      tpm: 300000,
    }
  },
  {
    id: '5',
    name: 'OpenRouter 多模型',
    platform: 'openrouter' as PlatformKey,
    apiKey: 'sk-or-xxxx...xxxx7890',
    maskedKey: 'sk-or-************************************7890',
    status: 'inactive',
    balance: 0,
    totalUsage: 35.60,
    monthlyUsage: 0,
    tokenUsage: {
      total: 890000,
      monthly: 0,
      daily: 0,
    },
    owner: {
      id: 'user4',
      name: '赵六',
      avatar: null,
      email: 'zhaoliu@company.com',
      status: 'active' as const,
    },
    business: '多模态测试',
    createdAt: '2024-10-01T08:00:00Z',
    lastUsedAt: '2024-12-15T14:20:00Z',
    expiresAt: '2025-01-01T23:59:59Z',
    rateLimit: {
      rpm: 60,
      tpm: 120000,
    }
  },
  {
    id: '6',
    name: '豆包-营销文案',
    platform: 'volcengine' as PlatformKey,
    apiKey: 'volc-xxxx...xxxx2468',
    maskedKey: 'volc-************************************2468',
    status: 'low_balance',
    balance: 15.20,
    totalUsage: 284.80,
    monthlyUsage: 67.40,
    tokenUsage: {
      total: 15600000,
      monthly: 3800000,
      daily: 125000,
    },
    owner: {
      id: 'user2',
      name: '李四',
      avatar: null,
      email: 'lisi@company.com',
      status: 'active' as const,
    },
    business: '营销文案生成',
    createdAt: '2024-09-15T11:30:00Z',
    lastUsedAt: '2025-01-22T09:58:00Z',
    expiresAt: null,
    rateLimit: {
      rpm: 80,
      tpm: 180000,
    }
  },
];

// API Key 接口类型
interface ApiKeyItem {
  id: string;
  name: string;
  platform: PlatformKey;
  projectId?: string;  // OpenAI 项目 ID
  platformKeyId?: string;  // 平台返回的 Key ID（用于调用平台 API）
  apiKey: string;
  maskedKey: string;
  status: 'active' | 'inactive' | 'low_balance' | 'expired';
  balance: number | null; // null 表示该平台不支持余额（如 OpenAI、Claude 按量付费）
  totalUsage: number;
  monthlyUsage: number;
  tokenUsage: {
    total: number;
    monthly: number;
    daily: number;
  };
  // 责任人联系信息（直接存储）
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  // 责任人（关联用户方式 - 保留兼容）
  owner: {
    id: string;
    name: string;
    avatar: string | null;
    email: string;
    status?: 'active' | 'resigned';
  } | null;
  business: string;
  description: string;  // 备注说明
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string | null;
  rateLimit: {
    rpm: number;
    tpm: number;
  };
}

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 格式化金额
function formatCurrency(amount: number | null | undefined, platform?: string): string {
  if (amount === null || amount === undefined) {
    return '-';
  }
  // 火山引擎使用人民币（¥），其他平台使用美元（$）
  const currencySymbol = platform === 'volcengine' ? '¥' : '$';
  return currencySymbol + amount.toFixed(2);
}

// 格式化日期 - 需要传入翻译函数
function formatDate(dateStr: string, t: (key: string, options?: Record<string, unknown>) => string, locale: string = 'en'): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return t('common.minutesAgo', { count: minutes });
    }
    return t('common.hoursAgo', { count: hours });
  } else if (days === 1) {
    return t('common.yesterday');
  } else if (days < 7) {
    return t('common.daysAgo', { count: days });
  }
  return date.toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-US');
}

// 获取状态配置
function getStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return { textKey: 'apiKeys.normalStatus', class: 'tag-green', icon: 'mdi:check-circle' };
    case 'inactive':
      return { textKey: 'apiKeys.inactive', class: 'tag-gray', icon: 'mdi:pause-circle' };
    case 'low_balance':
      return { textKey: 'apiKeys.lowBalance', class: 'tag-yellow', icon: 'mdi:alert-circle' };
    case 'expired':
      return { textKey: 'apiKeys.expired', class: 'tag-red', icon: 'mdi:close-circle' };
    default:
      return { textKey: status, class: 'tag-gray', icon: 'mdi:help-circle' };
  }
}

interface ApiKeysProps {
  platform: string;
}

export default function ApiKeys({ platform }: ApiKeysProps) {
  const { t, i18n } = useTranslation();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>(platform || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'balance' | 'tokens' | null>('balance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // 订阅状态
  const { 
    keyQuota, 
    checkKeyQuota, 
    canExport, 
    canBatchOperation,
    isFree,
    planDisplayName 
  } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>('');
  
  // 批量选择状态
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<string>>(new Set());
  const [showBatchOwnerModal, setShowBatchOwnerModal] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchAssigning, setBatchAssigning] = useState(false);

  // 高级筛选状态
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string>(''); // 责任人筛选
  const [monthFilter, setMonthFilter] = useState<string>(''); // 账单月份 (格式: YYYY-MM)
  const [usageFilter, setUsageFilter] = useState<'all' | 'has_usage' | 'no_usage'>('all'); // 用量筛选
  const [tokenRangeFilter, setTokenRangeFilter] = useState<{ min: string; max: string }>({ min: '', max: '' }); // 用量范围筛选

  // 同步顶部平台筛选
  useEffect(() => {
    setPlatformFilter(platform || 'all');
  }, [platform]);
  const [selectedKey, setSelectedKey] = useState<ApiKeyItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 责任人选择弹窗状态
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerTarget, setOwnerTarget] = useState<ApiKeyItem | null>(null);
  const [keyDescription, setKeyDescription] = useState('');  // 密钥备注（独立于责任人）
  const [savingOwner, setSavingOwner] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);  // 保存备注状态
  // 团队成员列表（用于选择责任人）
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(''); // 选中的团队成员 ID
  const [autoSyncing, setAutoSyncing] = useState(false);  // 自动同步状态
  const [platformAccounts, setPlatformAccounts] = useState<Array<{ id: string; platform: string; total_balance: number | null; total_monthly_tokens: number | null; status: string }>>([]);  // 平台账号数据
  
  // 编辑业务用途（详情弹窗）
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [businessValue, setBusinessValue] = useState('');
  const [savingBusiness, setSavingBusiness] = useState(false);
  
  // 行内编辑业务用途
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineBusinessValue, setInlineBusinessValue] = useState('');

  // 创建表单状态
  const [createMode, setCreateMode] = useState<'import' | 'create'>('import'); // import=导入已有, create=API创建
  const [createForm, setCreateForm] = useState({
    name: '',
    platform: 'openai' as PlatformKey,
    apiKey: '', // 手动添加时填写
    business: '',
    // 责任人联系信息（直接填写）
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    expiresAt: '', // 过期时间，空字符串表示永久有效
    projectId: '', // OpenAI 项目 ID（API 创建时需要）
    userName: '', // 火山引擎 IAM 用户名（API 创建时需要）
  });
  const [isCreating, setIsCreating] = useState(false);
  
  
  // 创建成功弹窗
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdKeyInfo, setCreatedKeyInfo] = useState<{
    name: string;
    apiKey: string;
    platform: PlatformKey;
    projectName?: string;
  } | null>(null);
  
  // OpenAI 项目列表（API 创建时使用）
  const [openaiProjects, setOpenaiProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // 项目选择器状态
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // 转换 LLMApiKey 为 ApiKeyItem
  const convertToApiKeyItem = useCallback((key: LLMApiKey): ApiKeyItem => {
    const primaryOwner = key.owners?.find(o => o.is_primary);
    
    // 判断平台是否有余额概念
    // OpenAI 和 Claude 是按使用量付费，没有余额；Volcengine 有余额（账户级别，不在 key 级别显示）；OpenRouter 按使用量付费，没有余额
    // 注意：火山引擎的余额和用量都是账户级别的，不在 key 级别显示
    const hasBalance = false; // 火山引擎的余额不在 key 级别显示
    const balance = null; // 所有平台的 key 级别余额都设为 null（余额在平台账号级别显示）
    
    return {
      id: key.id,
      name: key.name,
      platform: key.platform as PlatformKey,
      projectId: key.project_id,
      platformKeyId: key.platform_key_id,  // 平台 Key ID（用于调用平台 API）
      apiKey: key.api_key_encrypted || '', // 完整 Key（用于复制）
      maskedKey: `${key.api_key_prefix || '***'}****${key.api_key_suffix || '***'}`,
      status: key.status as 'active' | 'inactive' | 'low_balance' | 'expired',
      balance: balance, // 有余额的平台显示余额，无余额的平台为 null
      totalUsage: key.total_cost || 0,
      monthlyUsage: key.month_cost || 0,
      tokenUsage: {
        total: key.total_tokens || 0,
        monthly: key.month_tokens || 0,
        daily: key.daily_tokens || 0, // 从数据库获取今日用量
      },
      // 责任人联系信息
      ownerName: key.owner_name,
      ownerPhone: key.owner_phone,
      ownerEmail: key.owner_email,
      // 关联用户方式（兼容旧数据）
      owner: primaryOwner ? {
        id: primaryOwner.user_id,
        name: primaryOwner.user_name,
        avatar: primaryOwner.user_avatar || null,
        email: '',
        status: primaryOwner.user_status === 1 ? 'active' : 'resigned',
      } : null,
      business: key.business || '',
      description: key.description || '',  // 备注说明
      createdAt: key.created_at,
      lastUsedAt: key.last_synced_at || key.last_used_at || key.created_at,
      expiresAt: key.expires_at || null,
      rateLimit: { rpm: 0, tpm: 0 },
    };
  }, []);

  // 显示 Toast 函数需要在 loadData 之前定义
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    // 自动消失时间：成功和提示 3 秒，错误 5 秒
    setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  }, []);

  // 批量选择：切换单个 Key 的选择状态
  const toggleKeySelection = useCallback((keyId: string) => {
    setSelectedKeyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  }, []);

  // 批量选择：全选/取消全选
  const toggleSelectAll = useCallback((keys: ApiKeyItem[]) => {
    setSelectedKeyIds(prev => {
      if (prev.size === keys.length && keys.every(k => prev.has(k.id))) {
        return new Set();
      }
      return new Set(keys.map(k => k.id));
    });
  }, []);

  // 清除选择
  const clearSelection = useCallback(() => {
    setSelectedKeyIds(new Set());
  }, []);

  // 导出选中的 Keys
  const handleExport = useCallback((format: 'csv' | 'excel') => {
    const keysToExport = selectedKeyIds.size > 0 
      ? apiKeys.filter(k => selectedKeyIds.has(k.id))
      : apiKeys;
    
    const filename = `api-keys-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(keysToExport, API_KEYS_EXPORT_COLUMNS, filename);
    } else {
      exportToExcel(keysToExport, API_KEYS_EXPORT_COLUMNS, filename, 'API Keys');
    }
    
    showToast(t('common.exportedCount', { count: keysToExport.length }), 'success');
  }, [apiKeys, selectedKeyIds, showToast]);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 如果 platformFilter 是 'all'，不传递 platform 参数，获取所有平台的 keys
      const [keysData, accountsData] = await Promise.all([
        getLLMApiKeys(platformFilter === 'all' ? undefined : { platform: platformFilter }),
        getLLMPlatformAccounts()
      ]);
      
      console.log(`[loadData] 加载完成: ${keysData.length} 个 keys, platformFilter: ${platformFilter}`);
      console.log(`[loadData] Keys 平台分布:`, keysData.reduce((acc: Record<string, number>, k: any) => {
        acc[k.platform] = (acc[k.platform] || 0) + 1;
        return acc;
      }, {}));
      
      setApiKeys(keysData.map(convertToApiKeyItem));
      setPlatformAccounts(accountsData.map(a => ({
        id: a.id,
        platform: a.platform,
        total_balance: a.total_balance ?? null,
        total_monthly_tokens: (a as any).total_monthly_tokens ?? null, // 火山引擎的月度 tokens
        status: a.status
      })));
      
      // 加载团队成员列表
      const members = await getTeamMembers();
      setTeamMembers(members);
    } catch (err) {
      console.error('加载数据失败:', err);
      showToast('加载数据失败', 'error');
      // 如果 API 失败，回退到 Mock 数据
      setApiKeys(MOCK_API_KEYS as ApiKeyItem[]);
    } finally {
      setIsLoading(false);
    }
  }, [platformFilter, convertToApiKeyItem, showToast]);

  // 批量删除 - 必须在 loadData 之后定义
  const handleBatchDelete = useCallback(async () => {
    if (selectedKeyIds.size === 0) return;
    
    if (!confirm(t('apiKeys.confirmBatchDelete', { count: selectedKeyIds.size }))) {
      return;
    }
    
    setBatchDeleting(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const keyId of selectedKeyIds) {
      try {
        const key = apiKeys.find(k => k.id === keyId);
        if (!key) continue;
        
        // 直接从数据库删除
        await deleteLLMApiKey(keyId);
        successCount++;
      } catch (err) {
        console.error(`删除 Key ${keyId} 失败:`, err);
        failCount++;
      }
    }
    
    setBatchDeleting(false);
    clearSelection();
    await loadData();
    
    if (failCount === 0) {
      showToast(`成功删除 ${successCount} 个 API Key`, 'success');
    } else {
      showToast(`删除完成：成功 ${successCount} 个，失败 ${failCount} 个`, failCount > 0 ? 'error' : 'success');
    }
  }, [selectedKeyIds, apiKeys, clearSelection, loadData, showToast]);

  // 批量分配责任人 - 必须在 loadData 之后定义
  const handleBatchAssignOwner = useCallback(async (memberId: string) => {
    if (selectedKeyIds.size === 0) return;
    
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;
    
    setBatchAssigning(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const keyId of selectedKeyIds) {
      try {
        await updateLLMApiKeyOwnerContact(keyId, {
          name: member.name || '',
          phone: '',
          email: member.email || '',
        });
        successCount++;
      } catch (err) {
        console.error(`分配责任人到 Key ${keyId} 失败:`, err);
        failCount++;
      }
    }
    
    setBatchAssigning(false);
    setShowBatchOwnerModal(false);
    clearSelection();
    await loadData();
    
    if (failCount === 0) {
      showToast(`成功为 ${successCount} 个 Key 分配责任人`, 'success');
    } else {
      showToast(`分配完成：成功 ${successCount} 个，失败 ${failCount} 个`, failCount > 0 ? 'error' : 'success');
    }
  }, [selectedKeyIds, teamMembers, clearSelection, loadData, showToast]);

  // 当 platformFilter 改变时，重新加载数据
  useEffect(() => {
    loadData();
  }, [platformFilter, loadData]);

  // 初始化自动同步（仅首次加载，使用 localStorage 记录上次同步时间）
  // 注意：自动同步不会触发 loadData()，避免循环调用
  useEffect(() => {
    const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5分钟间隔
    const LAST_SYNC_KEY = 'keypilot_last_auto_sync';
    
    const initSync = async () => {
      // 检查是否需要自动同步（距离上次同步超过5分钟）
      const lastSync = localStorage.getItem(LAST_SYNC_KEY);
      const now = Date.now();
      if (lastSync && (now - parseInt(lastSync)) < AUTO_SYNC_INTERVAL) {
        console.log('[自动同步] 距离上次同步时间过短，跳过本次同步');
        return;
      }
      
      // 然后静默同步 OpenAI Keys 和用量（不阻塞页面显示）
      setAutoSyncing(true);
      try {
        console.log('[自动同步] 开始同步，检查平台账号...');
        const accounts = await getLLMPlatformAccounts();
        console.log('[自动同步] 平台账号列表:', accounts.map(a => ({ platform: a.platform, status: a.status, id: a.id })));
        
        const openaiAccount = accounts.find(a => a.platform === 'openai' && a.status === 'active');
        const claudeAccount = accounts.find(a => a.platform === 'anthropic' && a.status === 'active');
        
        console.log('[自动同步] OpenAI 账号:', openaiAccount ? { id: openaiAccount.id, hasKey: !!openaiAccount.admin_api_key_encrypted } : '未找到');
        console.log('[自动同步] Claude 账号:', claudeAccount ? { id: claudeAccount.id, hasKey: !!claudeAccount.admin_api_key_encrypted } : '未找到');
        
        // OpenAI 同步
        if (openaiAccount?.admin_api_key_encrypted) {
          console.log('[自动同步] 开始同步 OpenAI Keys...');
          // 1. 先同步 Keys 列表（如果数据库中没有）
          const keysResult = await syncOpenAIKeys(openaiAccount.id);
          console.log('[自动同步] OpenAI Keys 同步结果:', { success: keysResult.success, saved_count: (keysResult as any).saved_count, error: keysResult.error });
          
          // 2. 然后同步用量（sync-usage 会自动同步缺失的 keys）
          console.log('[自动同步] 开始同步 OpenAI 用量...');
          const result = await fetchOpenAIUsageDirect(openaiAccount.admin_api_key_encrypted, openaiAccount.id);
          console.log('[自动同步] OpenAI 用量同步结果:', { success: result.success, error: result.error });
          
          if (result.success) {
            console.log('[自动同步] OpenAI 同步完成');
            // 记录本次同步时间
            localStorage.setItem(LAST_SYNC_KEY, now.toString());
          }
        } else {
          console.log('[自动同步] OpenAI 账号不存在或没有配置 Admin Key，跳过同步');
        }
        
        // Claude 同步
        if (claudeAccount?.admin_api_key_encrypted) {
          console.log('[自动同步] 开始同步 Claude Keys...');
          const claudeKeysResult = await listClaudeKeys(claudeAccount.admin_api_key_encrypted, { platform_account_id: claudeAccount.id });
          console.log('[自动同步] Claude Keys 同步结果:', { success: claudeKeysResult.success, total: claudeKeysResult.total, saved_count: claudeKeysResult.saved_count, error: claudeKeysResult.error });
          
          if (claudeKeysResult.success) {
            console.log('[自动同步] 开始同步 Claude 用量（月度）...');
            const claudeMonthResult = await syncClaudeUsage(claudeAccount.admin_api_key_encrypted, { range: 'month', platform_account_id: claudeAccount.id });
            console.log('[自动同步] Claude 月度用量同步结果:', { success: claudeMonthResult.success, error: claudeMonthResult.error, summary: claudeMonthResult.summary });
            
            console.log('[自动同步] 开始同步 Claude 用量（今日）...');
            const claudeTodayResult = await syncClaudeUsage(claudeAccount.admin_api_key_encrypted, { range: 'today', platform_account_id: claudeAccount.id });
            console.log('[自动同步] Claude 今日用量同步结果:', { success: claudeTodayResult.success, error: claudeTodayResult.error, summary: claudeTodayResult.summary });
            
            // 同步费用数据
            console.log('[自动同步] 开始同步 Claude 费用...');
            const claudeCostsResult = await syncClaudeCosts(claudeAccount.admin_api_key_encrypted, claudeAccount.id);
            console.log('[自动同步] Claude 费用同步结果:', { success: claudeCostsResult.success, error: claudeCostsResult.error, summary: claudeCostsResult.summary });
            
            // 记录本次同步时间
            localStorage.setItem(LAST_SYNC_KEY, now.toString());
          }
        } else {
          console.log('[自动同步] Claude 账号不存在或没有配置 Admin Key，跳过同步');
        }
      } catch (err) {
        console.error('[自动同步] 同步失败:', err);
      } finally {
        setAutoSyncing(false);
      }
    };
    
    initSync();
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 筛选和排序后的数据
  const filteredKeys = useMemo(() => {
    let filtered = apiKeys.filter(key => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = key.name.toLowerCase().includes(query);
        const matchBusiness = key.business.toLowerCase().includes(query);
        const matchOwner = key.owner?.name.toLowerCase().includes(query);
        const matchOwnerName = key.ownerName?.toLowerCase().includes(query);
        const matchKey = key.maskedKey.toLowerCase().includes(query);
        if (!matchName && !matchBusiness && !matchOwner && !matchOwnerName && !matchKey) {
          return false;
        }
      }
      // 平台过滤
      if (platformFilter !== 'all' && key.platform !== platformFilter) {
        return false;
      }
      // 状态过滤
      if (statusFilter !== 'all' && key.status !== statusFilter) {
        return false;
      }
      // 责任人筛选
      if (ownerFilter) {
        const ownerMatch = key.ownerName?.toLowerCase().includes(ownerFilter.toLowerCase()) ||
                          key.owner?.name.toLowerCase().includes(ownerFilter.toLowerCase());
        if (!ownerMatch) {
          return false;
        }
      }
      // 月份筛选（仅当前月有效，历史月份暂不支持）
      if (monthFilter) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // 如果选择的是当前月，筛选有用量的 Key
        if (monthFilter === currentMonth) {
          if ((key.tokenUsage.monthly || 0) === 0) return false;
        }
        // 如果选择的是历史月份，根据创建时间筛选（Key 必须在该月之前创建）
        else {
          const keyCreated = new Date(key.createdAt);
          const filterDate = new Date(monthFilter + '-01');
          if (keyCreated > filterDate) return false;
        }
      }
      // 用量筛选
      if (usageFilter !== 'all') {
        const hasUsage = (key.tokenUsage.monthly || 0) > 0;
        if (usageFilter === 'has_usage' && !hasUsage) return false;
        if (usageFilter === 'no_usage' && hasUsage) return false;
      }
      // 用量范围筛选 (Monthly Tokens)
      if (tokenRangeFilter.min || tokenRangeFilter.max) {
        const monthlyTokens = key.tokenUsage.monthly || 0;
        const minTokens = tokenRangeFilter.min ? parseInt(tokenRangeFilter.min) * 1000 : 0; // 用户输入的是 K 单位
        const maxTokens = tokenRangeFilter.max ? parseInt(tokenRangeFilter.max) * 1000 : Infinity;
        if (monthlyTokens < minTokens || monthlyTokens > maxTokens) {
          return false;
        }
      }
      return true;
    });

    // 排序
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: number;
        let bValue: number;

        if (sortField === 'balance') {
          // 按本月消费排序
          aValue = a.monthlyUsage ?? 0;
          bValue = b.monthlyUsage ?? 0;
        } else if (sortField === 'tokens') {
          // 按本月 Tokens 排序
          aValue = a.tokenUsage?.monthly ?? 0;
          bValue = b.tokenUsage?.monthly ?? 0;
        } else {
          return 0;
        }

        if (sortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }

    return filtered;
  }, [apiKeys, searchQuery, platformFilter, statusFilter, ownerFilter, monthFilter, usageFilter, tokenRangeFilter, sortField, sortDirection]);

  // 处理排序点击
  const handleSort = (field: 'balance' | 'tokens') => {
    if (sortField === field) {
      // 切换排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 设置新的排序字段，默认降序
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 统计数据 - 根据当前选中的平台计算
  const stats = useMemo(() => {
    const keysToCount = platformFilter === 'all' 
      ? apiKeys 
      : apiKeys.filter(k => k.platform === platformFilter);
    const total = keysToCount.length;
    const active = keysToCount.filter(k => k.status === 'active').length;
    
    // 使用平台账号的 total_balance 来计算账户余额
    // 注意：不能直接相加，因为有美元和人民币两种货币
    // 如果是筛选特定平台，只计算该平台账号的余额
    // 如果是全部平台，计算所有活跃平台账号的余额总和
    const accountsToCount = platformFilter === 'all'
      ? platformAccounts.filter(a => a.status === 'active')
      : platformAccounts.filter(a => a.platform === platformFilter && a.status === 'active');
    
    // 分别计算美元和人民币余额
    let usdBalance = 0;
    let cnyBalance = 0;
    accountsToCount.forEach(account => {
      const balance = account.total_balance || 0;
      // 火山引擎使用人民币，其他平台使用美元
      if (account.platform === 'volcengine') {
        cnyBalance += balance;
      } else {
        usdBalance += balance;
      }
    });
    
    const monthlyUsage = keysToCount.reduce((sum, k) => sum + k.monthlyUsage, 0);
    
    // 计算 Monthly Tokens
    // 注意：火山引擎的用量是账户级别的，不应该累加所有 keys（会导致重复计算）
    // 应该从平台账号的 total_monthly_tokens 获取
    let monthlyTokens = 0;
    if (platformFilter === 'volcengine') {
      // 火山引擎：从平台账号的 total_monthly_tokens 获取
      const volcengineAccount = platformAccounts.find(a => a.platform === 'volcengine' && a.status === 'active');
      monthlyTokens = volcengineAccount?.total_monthly_tokens || 0;
    } else if (platformFilter === 'all') {
      // 全部平台：累加所有平台的用量，但火山引擎只计算一次
      const volcengineAccount = platformAccounts.find(a => a.platform === 'volcengine' && a.status === 'active');
      const volcengineTokens = volcengineAccount?.total_monthly_tokens || 0;
      const otherPlatformTokens = keysToCount
        .filter(k => k.platform !== 'volcengine')
        .reduce((sum, k) => sum + k.tokenUsage.monthly, 0);
      monthlyTokens = volcengineTokens + otherPlatformTokens;
    } else {
      // 其他平台：正常累加所有 keys 的用量
      monthlyTokens = keysToCount.reduce((sum, k) => sum + k.tokenUsage.monthly, 0);
    }
    
    return { total, active, usdBalance, cnyBalance, monthlyUsage, monthlyTokens };
  }, [apiKeys, platformFilter, platformAccounts]);

  // 同步状态
  const [syncing, setSyncing] = useState<string | null>(null); // 正在同步的平台
  // 用量数据缓存
  const [usageData, setUsageData] = useState<{
    today_tokens: number;
    month_tokens: number;
    by_project?: Record<string, { input: number; output: number; total: number }>;
    last_synced?: string;
  } | null>(null);

  // 同步平台数据（获取真实用量）
  const syncPlatformData = async (targetPlatform: string) => {
    setSyncing(targetPlatform);
    // 不显示 Toast，改为在 icon 左侧显示"同步中"文字
    
    try {
      const accounts = await getLLMPlatformAccounts();
      
      // OpenAI 用量同步 + 费用同步
      if (targetPlatform === 'openai' || targetPlatform === 'all') {
        const openaiAccount = accounts.find(a => a.platform === 'openai' && a.status === 'active');
        
        if (openaiAccount?.admin_api_key_encrypted) {
          const adminKey = openaiAccount.admin_api_key_encrypted;
          const messages: string[] = [];
          
          // 1. 同步 Keys 列表（先获取所有 projects 的 keys）
          const keysResult = await syncOpenAIKeys(openaiAccount.id);
          if (keysResult.success) {
            const keyCount = keysResult.keys?.length || 0;
            const savedCount = (keysResult as any).saved_count || 0;
            if (savedCount > 0) {
              messages.push(`同步 ${keyCount} 个 Keys（新增/更新 ${savedCount} 个）`);
            } else if (keyCount > 0) {
              messages.push(`${keyCount} 个 Keys（已存在）`);
            } else {
              console.warn('OpenAI Keys 同步完成，但没有找到 keys');
            }
          } else {
            console.error('OpenAI Keys 同步失败:', keysResult.error);
            showToast(`Keys 同步失败: ${keysResult.error}`, 'error');
          }
          
          // 2. 同步用量数据
          const usageResult = await fetchOpenAIUsageDirect(adminKey, openaiAccount.id);
          if (usageResult.success) {
            setUsageData({
              today_tokens: usageResult.today_tokens,
              month_tokens: usageResult.month_tokens,
              by_project: usageResult.by_project,
              last_synced: new Date().toISOString()
            });
            messages.push(`本月 ${formatNumber(usageResult.month_tokens)} tokens`);
          }
          
          // 3. 同步费用数据
          const costsResult = await syncOpenAICosts(adminKey, openaiAccount.id);
          if (costsResult.success && costsResult.summary) {
            const monthCost = parseFloat(costsResult.summary.month_cost_usd || '0');
            const todayCost = parseFloat(costsResult.summary.today_cost_usd || '0');
            if (monthCost > 0 || todayCost > 0) {
              messages.push(`本月费用 $${monthCost.toFixed(2)}，今日 $${todayCost.toFixed(2)}`);
            }
          }
          
            await loadData();
            
            // 同步完成后检查告警
            try {
              const headers = await getAuthHeaders();
              await fetch('/api/alerts/check-alerts', {
                method: 'POST',
                headers,
              });
            } catch (err) {
              console.warn('告警检查失败:', err);
            }
            
            if (messages.length > 0) {
              showToast(`OpenAI 同步完成！${messages.join('，')}`, 'success');
            } else {
              showToast(`OpenAI 同步完成`, 'success');
            }
        } else if (targetPlatform === 'openai') {
          showToast(t('apiKeys.noAdminKey', { platform: 'OpenAI' }), 'error');
        }
      }
      
      // Claude (Anthropic) 同步 - Keys 列表 + 用量数据 + 费用数据
      if (targetPlatform === 'anthropic' || targetPlatform === 'all') {
        console.log('[手动同步] 开始同步 Claude，查找账号...');
        const claudeAccount = accounts.find(a => a.platform === 'anthropic' && a.status === 'active');
        console.log('[手动同步] Claude 账号:', claudeAccount ? { id: claudeAccount.id, hasKey: !!claudeAccount.admin_api_key_encrypted } : '未找到');
        
        if (claudeAccount?.admin_api_key_encrypted) {
          const adminKey = claudeAccount.admin_api_key_encrypted;
          const messages: string[] = [];
          
          console.log('[手动同步] Claude - 步骤1: 同步 Keys 列表');
          // 1. 获取并保存 Keys 列表
          const keysResult = await listClaudeKeys(adminKey, { platform_account_id: claudeAccount.id });
          console.log('[手动同步] Claude Keys 同步结果:', { 
            success: keysResult.success, 
            total: keysResult.total, 
            saved_count: keysResult.saved_count,
            keys_count: keysResult.keys?.length,
            error: keysResult.error 
          });
          
          if (keysResult.success) {
            const keyCount = keysResult.total || (keysResult.keys?.length || 0);
            const savedCount = keysResult.saved_count || 0;
            if (savedCount > 0) {
              messages.push(`同步 ${keyCount} 个 Keys（新增/更新 ${savedCount} 个）`);
            } else if (keyCount > 0) {
              messages.push(`${keyCount} 个 Keys（已存在）`);
            } else {
              console.warn('[手动同步] Claude Keys 同步完成，但没有找到 keys');
            }
          } else {
            console.error('[手动同步] Claude Keys 同步失败:', keysResult.error);
            showToast(`Keys 同步失败: ${keysResult.error}`, 'error');
          }
          
          console.log('[手动同步] Claude - 步骤2: 同步月度用量数据');
          // 2. 同步每月用量数据（会自动同步缺失的 keys）
          const monthResult = await syncClaudeUsage(adminKey, { range: 'month', platform_account_id: claudeAccount.id });
          console.log('[手动同步] Claude 月度用量同步结果:', { 
            success: monthResult.success, 
            error: monthResult.error,
            summary: monthResult.summary 
          });
          
          if (monthResult.success && monthResult.summary) {
            const totalTokens = monthResult.summary.total_tokens || 0;
            messages.push(`本月 ${formatNumber(totalTokens)} tokens`);
          } else {
            console.error('[手动同步] Claude 每月用量同步失败:', monthResult.error);
            if (monthResult.error) {
              showToast(`Claude 月度用量同步失败: ${monthResult.error}`, 'error');
            }
          }
          
          console.log('[手动同步] Claude - 步骤3: 同步今日用量数据');
          // 3. 同步今日用量数据
          const todayResult = await syncClaudeUsage(adminKey, { range: 'today', platform_account_id: claudeAccount.id });
          console.log('[手动同步] Claude 今日用量同步结果:', { 
            success: todayResult.success, 
            error: todayResult.error,
            summary: todayResult.summary 
          });
          
          if (todayResult.success && todayResult.summary) {
            const todayTokens = todayResult.summary.total_tokens || 0;
            messages.push(`今日 ${formatNumber(todayTokens)} tokens`);
          } else {
            console.error('[手动同步] Claude 今日用量同步失败:', todayResult.error);
            if (todayResult.error) {
              showToast(`Claude 今日用量同步失败: ${todayResult.error}`, 'error');
            }
          }
          
          // 4. 同步费用数据
          const costsResult = await syncClaudeCosts(adminKey, claudeAccount.id);
          if (costsResult.success && costsResult.summary) {
            const monthCost = parseFloat(costsResult.summary.month_cost_usd || '0');
            const todayCost = parseFloat(costsResult.summary.today_cost_usd || '0');
            if (monthCost > 0 || todayCost > 0) {
              messages.push(`本月费用 $${monthCost.toFixed(2)}，今日 $${todayCost.toFixed(2)}`);
            }
          }
          
            await loadData();
            
            // 同步完成后检查告警
            try {
              const headers = await getAuthHeaders();
              await fetch('/api/alerts/check-alerts', {
                method: 'POST',
                headers,
              });
            } catch (err) {
              console.warn('告警检查失败:', err);
            }
            
            if (messages.length > 0) {
              showToast(`Claude 同步完成！${messages.join('，')}`, 'success');
          } else {
            showToast(t('apiKeys.syncFailed', { platform: 'Claude' }), 'error');
          }
        } else if (targetPlatform === 'anthropic') {
          showToast(t('apiKeys.noAdminKey', { platform: 'Claude' }), 'error');
        }
      }
      
      // OpenRouter 同步 - Keys 列表 + 用量 + 余额
      if (targetPlatform === 'openrouter' || targetPlatform === 'all') {
        const openrouterAccount = accounts.find(a => a.platform === 'openrouter' && a.status === 'active');
        
        if (openrouterAccount?.admin_api_key_encrypted) {
          const adminKey = openrouterAccount.admin_api_key_encrypted;
          const messages: string[] = [];
          
          // 1. 同步 Keys 列表和用量数据
          const keysResult = await syncOpenRouterKeys(adminKey, openrouterAccount.id);
          if (keysResult.success) {
            const keyCount = keysResult.keys_count || 0;
            // @ts-ignore - API may return additional fields
            const createdCount = (keysResult as any).created_count || 0;
            // @ts-ignore - API may return additional fields
            const updatedCount = (keysResult as any).updated_count || 0;
            
            if (createdCount > 0 || updatedCount > 0) {
              messages.push(`同步 ${keyCount} 个 Keys（新增 ${createdCount} 个，更新 ${updatedCount} 个）`);
            } else if (keyCount > 0) {
              messages.push(`${keyCount} 个 Keys（已存在）`);
            }
            
            // 用量统计
            // @ts-ignore - API may return additional fields
            const stats = (keysResult as any).stats;
            if (stats) {
              const monthlyUsage = stats.monthly_usage || 0;
              if (monthlyUsage > 0) {
                messages.push(`本月消费 $${monthlyUsage.toFixed(2)}`);
              }
            }
          } else {
            console.error('OpenRouter Keys 同步失败:', keysResult.error);
            showToast(`OpenRouter 同步失败: ${keysResult.error}`, 'error');
          }
          
          // 2. 获取余额并保存到数据库
          const creditsResult = await getOpenRouterCredits(adminKey);
          if (creditsResult.success && creditsResult.credits) {
            const remaining = creditsResult.credits.remaining;
            messages.push(`余额 $${remaining.toFixed(2)}`);
            // 保存账户余额到数据库
            await updatePlatformAccountBalance(openrouterAccount.id, remaining);
          } else {
            console.error('OpenRouter 余额获取失败:', creditsResult.error);
            if (creditsResult.error) {
              showToast(`OpenRouter 余额获取失败: ${creditsResult.error}`, 'error');
            }
          }
          
          await loadData();
          
          if (messages.length > 0) {
            showToast(`OpenRouter 同步完成！${messages.join('，')}`, 'success');
          } else {
            showToast(`OpenRouter 同步完成`, 'success');
          }
        } else if (targetPlatform === 'openrouter') {
          showToast(t('apiKeys.noAdminKey', { platform: 'OpenRouter' }), 'error');
        }
      }
      
      // 火山引擎同步 - Keys 列表 + 余额和用量
      if (targetPlatform === 'volcengine' || targetPlatform === 'all') {
        const volcengineAccount = accounts.find(a => a.platform === 'volcengine' && a.status === 'active');
        
        if (volcengineAccount?.admin_api_key_encrypted) {
          // 火山引擎的 admin_api_key_encrypted 格式为 "access_key_id:secret_access_key_base64"
          // AK 部分是明文，SK 部分是 Base64 编码的
          const adminKeyValue = volcengineAccount.admin_api_key_encrypted;
          const parts = adminKeyValue.split(':');
          
          if (parts.length >= 2) {
            const accessKeyId = parts[0];
            const secretAccessKeyBase64 = parts.slice(1).join(':'); // 如果 SK 中包含冒号，重新组合
            
            // 解码 SK（Base64）
            let secretAccessKey: string;
            try {
              secretAccessKey = atob(secretAccessKeyBase64);
            } catch (e) {
              showToast('SecretAccessKey Base64 解码失败: ' + (e instanceof Error ? e.message : String(e)), 'error');
              setSyncing(null);
              return;
            }
            const messages: string[] = [];
            
            // 1. 同步 Keys 列表
            const keysResult = await syncVolcengineKeys(volcengineAccount.id);
            if (keysResult.success) {
              const keyCount = keysResult.keys_count || 0;
              const createdCount = keysResult.created_count || 0;
              const updatedCount = keysResult.updated_count || 0;
              
              if (createdCount > 0 || updatedCount > 0) {
                messages.push(`同步 ${keyCount} 个 Keys（新增 ${createdCount} 个，更新 ${updatedCount} 个）`);
              } else if (keyCount > 0) {
                messages.push(`${keyCount} 个 Keys（已存在）`);
              }
            } else {
              console.error('火山引擎 Keys 同步失败:', keysResult.error);
              if (keysResult.error) {
                showToast(`Keys 同步失败: ${keysResult.error}`, 'error');
              }
            }
            
            // 2. 同步余额和用量数据
            const result = await syncVolcengineData({
              access_key_id: accessKeyId,
              secret_access_key: secretAccessKey,
              platform_account_id: volcengineAccount.id,
              sync_balance: true,
              sync_usage: true,
            });
            
            if (result.success) {
              if (result.balance) {
                messages.push(`余额 ¥${result.balance.available_balance.toFixed(2)}`);
              }
              if (result.usage) {
                messages.push(`本月 ${formatNumber(result.usage.total_tokens)} tokens`);
              }
              
              // 更新平台账号余额
              if (result.balance) {
                console.log('[volcengine/sync] 准备更新平台账号余额:', {
                  account_id: volcengineAccount.id,
                  available_balance: result.balance.available_balance,
                  balance_object: result.balance
                });
                const updateResult = await updatePlatformAccountBalance(volcengineAccount.id, result.balance.available_balance);
                console.log('[volcengine/sync] 平台账号余额更新结果:', updateResult);
              } else {
                console.log('[volcengine/sync] 没有余额数据，跳过更新');
              }
            } else {
              console.error('火山引擎数据同步失败:', result.error);
              if (result.error) {
                showToast(`数据同步失败: ${result.error}`, 'error');
              }
            }
            
            await loadData();
            
            // 同步完成后检查告警
            try {
              const headers = await getAuthHeaders();
              await fetch('/api/alerts/check-alerts', {
                method: 'POST',
                headers,
              });
            } catch (err) {
              console.warn('告警检查失败:', err);
            }
            
            if (messages.length > 0) {
              showToast(`火山引擎同步完成！${messages.join('，')}`, 'success');
            } else {
              showToast('火山引擎同步完成', 'success');
            }
          } else {
            showToast('火山引擎 Admin Key 格式错误，应为 "AK:SK" 格式', 'error');
          }
        } else if (targetPlatform === 'volcengine') {
          showToast(t('apiKeys.noAdminKey', { platform: '火山引擎' }), 'error');
        }
      }
      
      // 其他平台暂不支持
      if (targetPlatform !== 'openai' && targetPlatform !== 'anthropic' && targetPlatform !== 'openrouter' && targetPlatform !== 'volcengine' && targetPlatform !== 'all') {
        showToast(t('apiKeys.syncNotSupported', { platform: AI_PLATFORMS[targetPlatform as PlatformKey]?.name || targetPlatform }), 'info');
      }
    } catch (err) {
      console.error('同步用量失败:', err);
      showToast(`同步失败: ${(err as Error).message}`, 'error');
    } finally {
      setSyncing(null);
    }
  };

  // 当前平台配置
  const currentPlatformConfig = platformFilter !== 'all' ? AI_PLATFORMS[platformFilter as PlatformKey] : null;

  // 兼容 HTTP 的复制方法（fallback for non-HTTPS）
  const copyToClipboardCompat = async (text: string): Promise<boolean> => {
    // 优先使用 Clipboard API（需要 HTTPS）
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // 继续尝试 fallback
      }
    }
    
    // Fallback: 使用 execCommand（兼容 HTTP）
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  };

  // 复制 API Key
  const copyApiKey = async (key: ApiKeyItem) => {
    try {
      // 优先复制完整 key
      if (key.apiKey && key.apiKey.length > 20) {
        const success = await copyToClipboardCompat(key.apiKey);
        if (success) {
          setCopiedId(key.id);
          setTimeout(() => setCopiedId(null), 2000);
          showToast(t('common.copiedToClipboard'), 'success');
        } else {
          showToast(t('common.copyFailed'), 'error');
        }
        return;
      }
      
      // 如果没有完整 key，尝试复制 maskedKey（至少可以复制显示的部分）
      if (key.maskedKey) {
        const success = await copyToClipboardCompat(key.maskedKey);
        if (success) {
          setCopiedId(key.id);
          setTimeout(() => setCopiedId(null), 2000);
          showToast(t('apiKeys.cannotCopyKey') + '（已复制显示的部分）', 'info');
        } else {
          showToast(t('common.copyFailed'), 'error');
        }
        return;
      }
      
      // 如果都没有，提示无法复制
      showToast(t('apiKeys.cannotCopyKey'), 'error');
    } catch (error) {
      console.error('复制失败:', error);
      showToast(t('common.copyFailed'), 'error');
    }
  };

  // 删除 API Key
  const handleDelete = (key: ApiKeyItem) => {
    setDeleteTarget(key);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      try {
        const result = await deleteLLMApiKey(deleteTarget.id);
        if (result.success) {
          setApiKeys(prev => prev.filter(k => k.id !== deleteTarget.id));
          showToast(`已删除 ${deleteTarget.name}`, 'success');
        } else {
          showToast(result.error || '删除失败', 'error');
        }
      } catch (err) {
        showToast(`删除失败: ${(err as Error).message}`, 'error');
      }
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  // 切换 Claude Key 状态（启用/禁用）
  const [togglingKeyId, setTogglingKeyId] = useState<string | null>(null);
  
  const toggleClaudeKeyStatus = async (key: ApiKeyItem) => {
    if (!key.platformKeyId) {
      showToast(t('apiKeys.cannotToggleMissingId'), 'error');
      return;
    }
    
    const newStatus = key.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? '启用' : '禁用';
    
    setTogglingKeyId(key.id);
    try {
      // 获取 Claude 平台账号的 Admin Key
      const accounts = await getLLMPlatformAccounts();
      const claudeAccount = accounts.find((a: { platform: string; status: string }) => a.platform === 'anthropic' && a.status === 'active');
      if (!claudeAccount?.admin_api_key_encrypted) {
        showToast(t('apiKeys.noAdminKey', { platform: 'Claude' }), 'error');
        setTogglingKeyId(null);
        return;
      }
      
      const result = await updateClaudeKey({
        admin_key: claudeAccount.admin_api_key_encrypted,
        api_key_id: key.platformKeyId,
        status: newStatus
      });
      
      if (result.success) {
        // 更新本地状态
        setApiKeys(prev => prev.map(k => 
          k.id === key.id ? { ...k, status: newStatus } : k
        ));
        showToast(`${key.name} 已${actionText}`, 'success');
      } else {
        showToast(result.error || `${actionText}失败`, 'error');
      }
    } catch (err) {
      showToast(`${actionText}失败: ${(err as Error).message}`, 'error');
    } finally {
      setTogglingKeyId(null);
    }
  };

  // 打开责任人选择弹窗
  const openOwnerModal = (key: ApiKeyItem) => {
    setOwnerTarget(key);
    setKeyDescription(key.description || '');  // 加载当前密钥的备注
    
    // 如果已有责任人，尝试找到对应的团队成员 ID
    // 优先通过 user_id 关联查找，如果没有则通过邮箱匹配
    let matchedMemberId = '';
    if (key.owner?.id) {
      const member = teamMembers.find(m => m.user_id === key.owner?.id);
      if (member) {
        matchedMemberId = member.id;
      }
    } else if (key.ownerEmail) {
      const member = teamMembers.find(m => m.email === key.ownerEmail);
      if (member) {
        matchedMemberId = member.id;
      }
    }
    setSelectedOwnerId(matchedMemberId);
    setShowOwnerModal(true);
  };


  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 保存密钥备注
  const handleSaveDescription = async () => {
    if (!ownerTarget) return;
    
    setSavingDescription(true);
    try {
      const result = await updateLLMApiKeyDescription(ownerTarget.id, keyDescription);
      if (result.success) {
        showToast(`备注已保存${keyDescription ? `: ${keyDescription}` : ''}`, 'success');
        // 更新本地状态
        setApiKeys(prev => prev.map(k => {
          if (k.id === ownerTarget.id) {
            return { ...k, description: keyDescription };
          }
          return k;
        }));
        // 如果详情弹窗打开，也更新 selectedKey
        if (selectedKey?.id === ownerTarget.id) {
          setSelectedKey(prev => prev ? { ...prev, description: keyDescription } : null);
        }
        // 关闭弹窗
        setShowOwnerModal(false);
        setOwnerTarget(null);
      } else {
        showToast(result.error || '保存备注失败', 'error');
      }
    } catch (err) {
      showToast(`保存备注失败: ${(err as Error).message}`, 'error');
    } finally {
      setSavingDescription(false);
    }
  };

  // 保存业务用途（详情弹窗）
  const handleSaveBusiness = async () => {
    if (!selectedKey) return;
    
    setSavingBusiness(true);
    try {
      const result = await updateLLMApiKeyBusiness(selectedKey.id, businessValue);
      if (result.success) {
        showToast(`${t('apiKeys.updatedBusiness')}: ${businessValue || `(${t('apiKeys.notSet')})`}`, 'success');
        setApiKeys(prev => prev.map(k => {
          if (k.id === selectedKey.id) {
            return { ...k, business: businessValue };
          }
          return k;
        }));
        // 更新 selectedKey
        setSelectedKey(prev => prev ? { ...prev, business: businessValue } : null);
        setEditingBusiness(false);
      } else {
        showToast(result.error || '更新业务用途失败', 'error');
      }
    } catch (err) {
      showToast(`更新业务用途失败: ${(err as Error).message}`, 'error');
    } finally {
      setSavingBusiness(false);
    }
  };

  // 行内保存业务用途
  const handleInlineSaveBusiness = async (keyId: string) => {
    try {
      const result = await updateLLMApiKeyBusiness(keyId, inlineBusinessValue);
      if (result.success) {
        showToast(`业务用途已更新`, 'success');
        setApiKeys(prev => prev.map(k => {
          if (k.id === keyId) {
            return { ...k, business: inlineBusinessValue };
          }
          return k;
        }));
        setInlineEditingId(null);
        setInlineBusinessValue('');
      } else {
        showToast(result.error || '更新失败', 'error');
      }
    } catch (err) {
      showToast(`更新失败: ${(err as Error).message}`, 'error');
    }
  };

  // 加载 OpenAI 项目列表
  const loadOpenAIProjects = async () => {
    setLoadingProjects(true);
    try {
      const accounts = await getLLMPlatformAccounts();
      const openaiAccount = accounts.find(a => a.platform === 'openai' && a.status === 'active');
      
      if (!openaiAccount?.admin_api_key_encrypted) {
        showToast('未找到 OpenAI Admin Key，请先在开发者账号中配置', 'error');
        setOpenaiProjects([]);
        return;
      }
      
      const result = await getOpenAIProjects(openaiAccount.admin_api_key_encrypted, openaiAccount.id);
      if (result.success && result.projects) {
        setOpenaiProjects(result.projects);
        // 默认选择第一个项目
        if (result.projects.length > 0 && !createForm.projectId) {
          setCreateForm(prev => ({ ...prev, projectId: result.projects![0].id }));
        }
      } else {
        showToast(result.error || '获取项目列表失败', 'error');
      }
    } catch (err) {
      console.error('加载项目列表失败:', err);
    } finally {
      setLoadingProjects(false);
    }
  };
  
  // 当切换到 API 创建模式且平台是 OpenAI 时，加载项目列表
  useEffect(() => {
    if (createMode === 'create' && createForm.platform === 'openai' && isCreateOpen) {
      loadOpenAIProjects();
    }
  }, [createMode, createForm.platform, isCreateOpen]);

  // 创建 API Key（通过调用平台 API）
  const handleCreate = async () => {
    if (!createForm.name) {
      showToast(t('apiKeys.fillKeyName'), 'error');
      return;
    }

    if (createMode === 'import' && !createForm.apiKey) {
      showToast(t('apiKeys.fillApiKey'), 'error');
      return;
    }
    
    if (createMode === 'create' && createForm.platform === 'openai' && !createForm.projectId) {
      showToast('请选择 OpenAI 项目', 'error');
      return;
    }

    setIsCreating(true);
    
    try {
      if (createMode === 'import') {
        // 导入模式：手动添加已有 Key
        const result = await addManualLLMApiKey({
          name: createForm.name,
          platform: createForm.platform,
          api_key: createForm.apiKey,
          business: createForm.business || undefined,
          owner_name: createForm.ownerName || undefined,
          owner_email: createForm.ownerEmail || undefined,
          owner_phone: createForm.ownerPhone || undefined,
          expires_at: createForm.expiresAt || undefined,
        });
        
        if (result.success) {
          showToast(t('apiKeys.importedKey', { platform: AI_PLATFORMS[createForm.platform].name }), 'success');
          await loadData(); // 重新加载数据
        } else {
          showToast(result.error || t('apiKeys.importFailed'), 'error');
          setIsCreating(false);
          return;
        }
      } else {
        // API 创建模式：通过 Vercel Serverless Function 调用平台 API 创建 Key
        if (createForm.platform === 'openai') {
          // 获取 Admin Key
          const accounts = await getLLMPlatformAccounts();
          const openaiAccount = accounts.find(a => a.platform === 'openai' && a.status === 'active');
          
          if (!openaiAccount?.admin_api_key_encrypted) {
            showToast(t('apiKeys.noAdminKeyConfigure', { platform: 'OpenAI' }), 'error');
            setIsCreating(false);
            return;
          }
          
          const result = await createOpenAIKey({
            admin_key: openaiAccount.admin_api_key_encrypted,
            organization_id: openaiAccount.organization_id,
            project_id: createForm.projectId,
            name: createForm.name,
            business: createForm.business || undefined,
            owner_name: createForm.ownerName || undefined,
            owner_email: createForm.ownerEmail || undefined,
            owner_phone: createForm.ownerPhone || undefined,
            expires_at: createForm.expiresAt || undefined,
            platform_account_id: openaiAccount.id,
          });
          
          if (result.success && result.api_key) {
            // 如果返回了 key ID，保存完整 key 到数据库
            if (result.id && result.api_key) {
              await updateLLMApiKeyEncrypted(result.id, result.api_key);
            }
            
            // 显示成功弹窗
            const projectName = openaiProjects.find(p => p.id === createForm.projectId)?.name;
            setCreatedKeyInfo({
              name: createForm.name,
              apiKey: result.api_key,
              platform: createForm.platform,
              projectName
            });
            setShowSuccessModal(true);
            await loadData(); // 重新加载数据
          } else if (!result.success) {
            showToast(result.error || t('apiKeys.createFailed'), 'error');
            setIsCreating(false);
            return;
          }
        } else if (createForm.platform === 'openrouter') {
          // OpenRouter 创建 Key
          const accounts = await getLLMPlatformAccounts();
          const openrouterAccount = accounts.find(a => a.platform === 'openrouter' && a.status === 'active');
          
          if (!openrouterAccount?.admin_api_key_encrypted) {
            showToast(t('apiKeys.noAdminKeyConfigure', { platform: 'OpenRouter' }), 'error');
            setIsCreating(false);
            return;
          }
          
          const result = await createOpenRouterKey({
            admin_key: openrouterAccount.admin_api_key_encrypted,
            name: createForm.name,
            business: createForm.business || undefined,
            owner_name: createForm.ownerName || undefined,
            owner_email: createForm.ownerEmail || undefined,
            owner_phone: createForm.ownerPhone || undefined,
            expires_at: createForm.expiresAt || undefined,
            platform_account_id: openrouterAccount.id,
          });
          
          if (result.success && result.key) {
            // 如果有责任人联系信息，设置责任人
            if (result.id && createForm.ownerName) {
              await updateLLMApiKeyOwnerContact(result.id, {
                name: createForm.ownerName,
                email: createForm.ownerEmail || undefined,
                phone: createForm.ownerPhone || undefined,
              });
            }
            showToast(t('apiKeys.createdKey', { platform: 'OpenRouter', name: createForm.name }), 'success');
            await loadData(); // 重新加载数据
          } else if (!result.success) {
            showToast(result.error || t('apiKeys.createFailed'), 'error');
            setIsCreating(false);
            return;
          }
        } else {
          // 其他平台暂不支持 API 创建
          showToast(t('apiKeys.platformNotSupported', { platform: AI_PLATFORMS[createForm.platform].name }), 'info');
          setIsCreating(false);
          return;
        }
      }
      
      setIsCreating(false);
      setIsCreateOpen(false);
      setCreateForm({ name: '', platform: 'openai', apiKey: '', business: '', ownerName: '', ownerEmail: '', ownerPhone: '', expiresAt: '', projectId: '', userName: '' });
      setCreateMode('import');
      setOpenaiProjects([]);
      // 重置创建表单
    } catch (err) {
      showToast(`操作失败: ${(err as Error).message}`, 'error');
      setIsCreating(false);
    }
  };

  // 查看详情
  const openDetail = (key: ApiKeyItem) => {
    setSelectedKey(key);
    setIsDetailOpen(true);
  };

  // 切换状态
  const toggleStatus = (key: ApiKeyItem) => {
    const newStatus = key.status === 'active' ? 'inactive' : 'active';
    setApiKeys(prev => prev.map(k => 
      k.id === key.id ? { ...k, status: newStatus } : k
    ));
    showToast(newStatus === 'active' ? t('apiKeys.enabled', { name: key.name }) : t('apiKeys.disabled', { name: key.name }), 'success');
  };

  return (
    <div className="space-y-5 animate-in">
      {/* Toast 提示框 - 友好的提示框 */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-2">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm min-w-[300px] max-w-[500px] ${
            toast.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
              : toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              : 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          }`}>
            <Icon 
              icon={toast.type === 'success' ? 'mdi:check-circle' : toast.type === 'error' ? 'mdi:close-circle' : 'mdi:information'} 
              width={20} 
              className="flex-shrink-0"
            />
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            >
              <Icon icon="mdi:close" width={16} />
            </button>
          </div>
        </div>
      )}

      {/* 统计卡片 - 顺序：Monthly Usage、Monthly Tokens、Total Keys、Active Keys、Total Balance */}
      <div className="grid grid-cols-5 gap-4">
        {/* 1. 本月消费卡片（带刷新按钮） */}
        <div 
          className="stat-card relative overflow-hidden"
          style={currentPlatformConfig ? { 
            background: `linear-gradient(135deg, ${currentPlatformConfig.color}08 0%, transparent 100%)`,
          } : {}}
        >
          <div className="flex items-center gap-3">
            <div 
              className="stat-icon"
              style={currentPlatformConfig ? { 
                backgroundColor: `${currentPlatformConfig.color}20`,
              } : { backgroundColor: 'rgb(255 237 213)' }}
            >
              <Icon 
                icon="mdi:chart-line" 
                width={20} 
                style={currentPlatformConfig ? { color: currentPlatformConfig.color } : { color: 'rgb(234 88 12)' }}
              />
            </div>
            <div className="flex-1">
              <div className="stat-value">{formatCurrency(stats.monthlyUsage, platformFilter === 'all' ? undefined : platformFilter)}</div>
              <div className="stat-label">{t('apiKeys.monthlySpend')}</div>
            </div>
          </div>
          {/* 刷新按钮和状态 */}
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {/* 同步中文字提示 - 显示在 icon 左侧 */}
            {(syncing === platformFilter || autoSyncing) && (
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                {t('apiKeys.syncing')}
              </span>
            )}
            <button
              className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
              onClick={() => syncPlatformData(platformFilter)}
              disabled={syncing !== null || autoSyncing}
              title={autoSyncing ? t('apiKeys.syncing') : `${t('common.syncData')} ${currentPlatformConfig?.name || t('common.all')}`}
            >
              <Icon 
                icon="mdi:sync" 
                width={16} 
                className={`${(syncing === platformFilter || autoSyncing) ? 'animate-spin' : ''} ${currentPlatformConfig ? 'text-gray-600' : 'text-gray-400'}`} 
              />
            </button>
          </div>
        </div>

        {/* 2. 本月 Tokens 卡片 */}
        <div 
          className="stat-card"
          style={currentPlatformConfig ? { 
            background: `linear-gradient(135deg, ${currentPlatformConfig.color}08 0%, transparent 100%)`,
          } : {}}
        >
          <div className="flex items-center gap-3">
            <div 
              className="stat-icon"
              style={currentPlatformConfig ? { 
                backgroundColor: `${currentPlatformConfig.color}20`,
              } : { backgroundColor: 'rgb(207 250 254)' }}
            >
              <Icon 
                icon="mdi:message-processing-outline" 
                width={20} 
                style={currentPlatformConfig ? { color: currentPlatformConfig.color } : { color: 'rgb(8 145 178)' }}
              />
            </div>
            <div>
              <div className="stat-value">{formatNumber(stats.monthlyTokens)}</div>
              <div className="stat-label">{t('apiKeys.monthlyTokens')}</div>
            </div>
          </div>
        </div>

        {/* 3. 平台标识卡片 */}
        <div 
          className="stat-card relative overflow-hidden"
          style={currentPlatformConfig ? { 
            background: `linear-gradient(135deg, ${currentPlatformConfig.color}15 0%, ${currentPlatformConfig.color}05 100%)`,
            borderColor: `${currentPlatformConfig.color}30`,
          } : {}}
        >
          <div className="flex items-center gap-3">
            <div 
              className={`stat-icon ${currentPlatformConfig ? currentPlatformConfig.bgColor : 'bg-blue-100'}`}
              style={currentPlatformConfig ? { boxShadow: `0 4px 12px ${currentPlatformConfig.color}40` } : {}}
            >
              <Icon 
                icon={currentPlatformConfig?.icon || 'mdi:key-variant'} 
                width={22} 
                className={currentPlatformConfig ? 'text-white' : 'text-blue-600'} 
              />
            </div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">
                {currentPlatformConfig ? t('apiKeys.platformKeys', { platform: currentPlatformConfig.name }) : t('apiKeys.totalKeysCount')}
              </div>
            </div>
          </div>
        </div>

        {/* 4. 正常使用卡片 */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-green-100">
              <Icon icon="mdi:check-circle-outline" width={20} className="text-green-600" />
            </div>
            <div>
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">{t('apiKeys.normalUsage')}</div>
            </div>
          </div>
        </div>

        {/* 5. 账户余额卡片（最后） */}
        <div 
          className="stat-card relative overflow-hidden"
          style={currentPlatformConfig ? { 
            background: `linear-gradient(135deg, ${currentPlatformConfig.color}08 0%, transparent 100%)`,
          } : {}}
        >
          <div className="flex items-center gap-3">
            <div 
              className="stat-icon"
              style={currentPlatformConfig ? { 
                backgroundColor: `${currentPlatformConfig.color}20`,
              } : { backgroundColor: 'rgb(243 232 255)' }}
            >
              <Icon 
                icon="mdi:wallet-outline" 
                width={20} 
                style={currentPlatformConfig ? { color: currentPlatformConfig.color } : { color: 'rgb(147 51 234)' }}
              />
            </div>
            <div className="flex-1">
              {/* 美元余额（小字，灰色） */}
              {stats.usdBalance > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-0.5">
                  ${stats.usdBalance.toFixed(2)}
                </div>
              )}
              {/* 人民币余额（大字，橙色，突出显示） */}
              {stats.cnyBalance > 0 ? (
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ¥{stats.cnyBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              ) : stats.usdBalance > 0 ? (
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ${stats.usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              ) : (
                <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                  $0.00
                </div>
              )}
              <div className="stat-label mt-0.5">{t('apiKeys.accountBalance')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('apiKeys.keyList')}</h2>
            {/* 刷新按钮 - 显示在标题左侧 */}
            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => {
                loadData();
                showToast('数据已刷新', 'success');
              }}
              title="刷新数据"
            >
              <Icon 
                icon="mdi:refresh" 
                width={18} 
                className={isLoading ? 'animate-spin' : ''}
              />
            </button>
            {/* 搜索 */}
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder={t('apiKeys.searchKey')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-3 w-72"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 导出按钮 */}
            <div className="relative group">
              <button 
                className="btn btn-secondary whitespace-nowrap relative"
                title={canExport ? (selectedKeyIds.size > 0 ? t('common.exportSelected', { count: selectedKeyIds.size }) : t('common.exportAll')) : t('common.unlockExport')}
                onClick={!canExport ? () => {
                  setUpgradeFeature('export');
                  setShowUpgradeModal(true);
                } : undefined}
              >
                <Icon icon="mdi:download" width={18} />
                {t('common.export')}
                <Icon icon="mdi:chevron-down" width={16} className="ml-1" />
                {!canExport && (
                  <Icon icon="mdi:lock" width={12} className="absolute -top-1 -right-1 text-orange-500" />
                )}
              </button>
              {canExport && (
                <div className="absolute right-0 top-full mt-1 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[140px]">
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    onClick={() => handleExport('csv')}
                  >
                    <Icon icon="mdi:file-delimited" width={16} />
                    {t('common.exportCsv')}
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    onClick={() => handleExport('excel')}
                  >
                    <Icon icon="mdi:file-excel" width={16} />
                    {t('common.exportExcel')}
                  </button>
                </div>
              )}
            </div>
            {/* 状态筛选 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select w-32"
            >
              <option value="all">{t('apiKeys.allStatus')}</option>
              <option value="active">{t('apiKeys.normalStatus')}</option>
              <option value="inactive">{t('apiKeys.inactive')}</option>
              <option value="low_balance">{t('apiKeys.lowBalance')}</option>
              <option value="expired">{t('apiKeys.expired')}</option>
            </select>
            {/* 高级筛选按钮 */}
            <button 
              className={`btn ${showAdvancedFilter || ownerFilter || monthFilter || usageFilter !== 'all' || tokenRangeFilter.min || tokenRangeFilter.max ? 'btn-primary' : 'btn-secondary'} whitespace-nowrap`}
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            >
              <Icon icon="mdi:filter-variant" width={18} />
              {t('apiKeys.advancedFilter')}
              {(ownerFilter || monthFilter || usageFilter !== 'all' || tokenRangeFilter.min || tokenRangeFilter.max) && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">!</span>
              )}
            </button>
            {/* Key 配额显示 */}
            <QuotaIndicator />
            {/* 创建按钮 */}
            <button 
              className="btn btn-primary whitespace-nowrap relative" 
              onClick={() => {
                if (keyQuota && !keyQuota.allowed) {
                  setUpgradeFeature('more_keys');
                  setShowUpgradeModal(true);
                } else {
                  setIsCreateOpen(true);
                }
              }}
            >
              <Icon icon="mdi:plus" width={18} />
              {t('apiKeys.createApiKey')}
              {keyQuota && !keyQuota.allowed && (
                <Icon icon="mdi:lock" width={12} className="absolute -top-1 -right-1 text-orange-500" />
              )}
            </button>
          </div>
        </div>

        {/* 高级筛选面板 */}
        {showAdvancedFilter && (
          <div className="px-4 py-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 账单月份 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('apiKeys.billingMonth')}
                </label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="form-select w-full text-sm"
                >
                  <option value="">{t('apiKeys.allMonths')}</option>
                  {(() => {
                    const months = [];
                    const now = new Date();
                    for (let i = 0; i < 12; i++) {
                      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      const label = date.toLocaleDateString(i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' });
                      const isCurrent = i === 0;
                      months.push(
                        <option key={value} value={value}>
                          {label}{isCurrent ? ` (${t('apiKeys.currentMonth')})` : ''}
                        </option>
                      );
                    }
                    return months;
                  })()}
                </select>
              </div>
              {/* 责任人筛选 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('apiKeys.owner')}
                </label>
                <input
                  type="text"
                  placeholder={t('apiKeys.ownerNamePlaceholder')}
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="form-input w-full text-sm"
                />
              </div>
              {/* 用量筛选 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('apiKeys.usageFilter')}
                </label>
                <select
                  value={usageFilter}
                  onChange={(e) => setUsageFilter(e.target.value as 'all' | 'has_usage' | 'no_usage')}
                  className="form-select w-full text-sm"
                >
                  <option value="all">{t('apiKeys.allKeys')}</option>
                  <option value="has_usage">{t('apiKeys.hasUsage')}</option>
                  <option value="no_usage">{t('apiKeys.noUsage')}</option>
                </select>
              </div>
              {/* 用量范围 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('apiKeys.monthlyUsageRange')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={t('apiKeys.minLabel')}
                    value={tokenRangeFilter.min}
                    onChange={(e) => setTokenRangeFilter(prev => ({ ...prev, min: e.target.value }))}
                    className="form-input w-full text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder={t('apiKeys.maxLabel')}
                    value={tokenRangeFilter.max}
                    onChange={(e) => setTokenRangeFilter(prev => ({ ...prev, max: e.target.value }))}
                    className="form-input w-full text-sm"
                  />
                </div>
              </div>
            </div>
            {/* 清除筛选按钮 */}
            {(ownerFilter || monthFilter || usageFilter !== 'all' || tokenRangeFilter.min || tokenRangeFilter.max) && (
              <div className="mt-3 flex justify-end">
                <button
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={() => {
                    setOwnerFilter('');
                    setMonthFilter('');
                    setUsageFilter('all');
                    setTokenRangeFilter({ min: '', max: '' });
                  }}
                >
                  {t('apiKeys.clearAllFilters')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 批量操作工具栏 */}
        {selectedKeyIds.size > 0 && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                已选择 {selectedKeyIds.size} 项
              </span>
              <button
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                onClick={clearSelection}
              >
                {t('common.clearSelection')}
              </button>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {canBatchOperation ? (
                <>
                  <button
                    className="btn btn-secondary text-sm py-1.5 px-3"
                    onClick={() => setShowBatchOwnerModal(true)}
                    disabled={batchAssigning}
                  >
                    <Icon icon="mdi:account-edit" width={16} />
                    {t('apiKeys.assignOwner')}
                  </button>
                  <button
                    className="btn btn-secondary text-sm py-1.5 px-3 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    onClick={handleBatchDelete}
                    disabled={batchDeleting}
                  >
                    {batchDeleting ? (
                      <Icon icon="mdi:loading" width={16} className="animate-spin" />
                    ) : (
                      <Icon icon="mdi:delete" width={16} />
                    )}
                    批量删除
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-primary text-sm py-1.5 px-3"
                  onClick={() => {
                    setUpgradeFeature('batch_operations');
                    setShowUpgradeModal(true);
                  }}
                >
                  <Icon icon="mdi:crown" width={16} />
                  升级解锁批量操作
                </button>
              )}
            </div>
          </div>
        )}

        {/* 表格 */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Icon icon="mdi:loading" width={32} className="text-gray-400 animate-spin" />
              <span className="ml-3 text-gray-500">加载中...</span>
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Icon icon="mdi:key-off" width={48} className="mb-3" />
              <p className="text-lg">{t('apiKeys.noApiKeys')}</p>
              <p className="text-sm mt-1">{t('apiKeys.clickToAddApiKey')}</p>
            </div>
          ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={filteredKeys.length > 0 && filteredKeys.every(k => selectedKeyIds.has(k.id))}
                    onChange={() => toggleSelectAll(filteredKeys)}
                  />
                </th>
                <th>{t('apiKeys.namePlatform')}</th>
                <th>{t('apiKeys.apiKeyLabel')}</th>
                <th>{t('apiKeys.status')}</th>
                <th 
                  className="cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  onClick={() => handleSort('balance')}
                >
                  <div className="flex items-center gap-2">
                    <span>{t('apiKeys.balanceUsage')}</span>
                    {sortField === 'balance' ? (
                      <Icon 
                        icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} 
                        width={16} 
                        className="text-blue-600 dark:text-blue-400"
                      />
                    ) : (
                      <Icon 
                        icon="mdi:unfold-more-horizontal" 
                        width={16} 
                        className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    )}
                  </div>
                </th>
                {/* Tokens Usage 列 - OpenRouter 平台不显示 */}
                {platformFilter !== 'openrouter' && (
                  <th 
                    className="cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                    onClick={() => handleSort('tokens')}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t('apiKeys.tokensUsage')}</span>
                      {sortField === 'tokens' ? (
                        <Icon 
                          icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} 
                          width={16} 
                          className="text-blue-600 dark:text-blue-400"
                        />
                      ) : (
                        <Icon 
                          icon="mdi:unfold-more-horizontal" 
                          width={16} 
                          className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                    </div>
                  </th>
                )}
                <th>{t('apiKeys.owner')}</th>
                <th>{t('apiKeys.business')}</th>
                <th>{t('apiKeys.expiresAt')}</th>
                <th className="text-center">{t('common.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((key) => {
                const platform = getPlatformConfig(key.platform);
                const status = getStatusConfig(key.status);
                const isSelected = selectedKeyIds.has(key.id);
                return (
                  <tr 
                    key={key.id} 
                    className={`${
                      isSelected 
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : key.owner?.status === 'resigned' 
                          ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-400' 
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <td className="w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleKeySelection(key.id)}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${platform.bgColor}`}
                          style={{ boxShadow: `0 2px 8px ${platform.color}40` }}
                        >
                          <Icon icon={platform.icon} width={22} className="text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{key.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{platform.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 dark:bg-[var(--bg-tertiary)] px-2 py-1 rounded font-mono text-gray-600 dark:text-[var(--text-primary)]">
                          {key.maskedKey}
                        </code>
                        <button 
                          className={`btn-icon ${!key.apiKey || key.apiKey.length <= 20 ? 'opacity-60' : ''}`}
                          onClick={() => copyApiKey(key)}
                          title={key.apiKey && key.apiKey.length > 20 ? t('apiKeys.copyApiKey') : (key.maskedKey ? t('apiKeys.copyApiKey') + ' (仅显示部分)' : t('apiKeys.cannotCopyKey'))}
                        >
                          <Icon 
                            icon={copiedId === key.id ? 'mdi:check' : (!key.apiKey || key.apiKey.length <= 20 ? 'mdi:alert-circle-outline' : 'mdi:content-copy')} 
                            width={16} 
                            className={copiedId === key.id ? 'text-green-500' : (!key.apiKey || key.apiKey.length <= 20 ? 'text-orange-500' : '')} 
                          />
                        </button>
                        {(!key.apiKey || key.apiKey.length <= 20) && (
                          <span title={t('apiKeys.cannotCopyKey')}>
                            <Icon 
                              icon="mdi:alert-circle-outline" 
                              width={14} 
                              className="text-orange-500 dark:text-orange-400"
                            />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`tag ${status.class}`}>
                        <Icon icon={status.icon} width={14} />
                        {t(status.textKey)}
                      </span>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(key.balance, key.platform)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('apiKeys.thisMonth')} {formatCurrency(key.monthlyUsage, key.platform)}
                        </div>
                      </div>
                    </td>
                    {/* Tokens Usage 列 - OpenRouter 平台不显示 */}
                    {platformFilter !== 'openrouter' && (
                      <td>
                        {key.platform !== 'openrouter' ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              {t('apiKeys.thisMonth')} {formatNumber(key.tokenUsage.monthly)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {t('apiKeys.today')} {formatNumber(key.tokenUsage.daily)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                    )}
                    <td>
                      <div className="flex items-center gap-2 group">
                        {key.ownerName ? (
                          <>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-500">
                              <span>{key.ownerName.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-900">{key.ownerName}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {key.ownerPhone || key.ownerEmail || ''}
                              </div>
                            </div>
                          </>
                        ) : key.owner ? (
                          // 兼容旧的关联用户方式
                          <>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 overflow-hidden ${
                              key.owner.status === 'resigned' ? 'bg-red-100' : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                            }`}>
                              {key.owner.avatar ? (
                                <img src={key.owner.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className={key.owner.status === 'resigned' ? 'text-red-600' : 'text-white'}>
                                  {key.owner.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm ${key.owner.status === 'resigned' ? 'text-red-600' : 'text-gray-900'}`}>
                                  {key.owner.name}
                                </span>
                                {key.owner.status === 'resigned' && (
                                  <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">已离职</span>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">{t('apiKeys.notAssigned')}</span>
                        )}
                        <button 
                          className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOwnerModal(key);
                          }}
                          title={t('apiKeys.editOwner')}
                        >
                          <Icon icon="mdi:pencil-outline" width={14} className="text-gray-400" />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="max-w-[140px]">
                        {inlineEditingId === key.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              className="flex-1 px-2 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-0"
                              placeholder={t('apiKeys.inputBusiness')}
                              value={inlineBusinessValue}
                              onChange={e => setInlineBusinessValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleInlineSaveBusiness(key.id);
                                if (e.key === 'Escape') { setInlineEditingId(null); setInlineBusinessValue(''); }
                              }}
                              onBlur={() => {
                                // 延迟关闭，让按钮点击能生效
                                setTimeout(() => {
                                  if (inlineEditingId === key.id) {
                                    setInlineEditingId(null);
                                    setInlineBusinessValue('');
                                  }
                                }, 150);
                              }}
                              autoFocus
                            />
                            <button
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              onClick={() => handleInlineSaveBusiness(key.id)}
                              title={t('common.save')}
                            >
                              <Icon icon="mdi:check" width={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="group flex items-center gap-1 w-full text-left"
                            onClick={() => {
                              setInlineEditingId(key.id);
                              setInlineBusinessValue(key.business || '');
                            }}
                          >
                            <span className={`tag ${key.business ? 'tag-blue' : 'tag-gray'} truncate`}>
                              {key.business || t('apiKeys.notSet')}
                            </span>
                            <Icon 
                              icon="mdi:pencil-outline" 
                              width={12} 
                              className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" 
                            />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {key.expiresAt ? (
                        <div className="space-y-0.5">
                          <div className={`text-sm font-medium ${
                            new Date(key.expiresAt) < new Date() 
                              ? 'text-red-600' 
                              : new Date(key.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-orange-600'
                                : 'text-gray-900'
                          }`}>
                            {new Date(key.expiresAt) < new Date() ? (
                              <span className="flex items-center gap-1">
                                <Icon icon="mdi:alert-circle" width={14} />
                                {t('apiKeys.expired')}
                              </span>
                            ) : (
                              formatDate(key.expiresAt, t, i18n.language)
                            )}
                          </div>
                          {new Date(key.expiresAt) > new Date() && new Date(key.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                            <div className="text-xs text-orange-500">
                              {t('common.expiresInDays', { count: Math.ceil((new Date(key.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">{t('apiKeys.neverExpires')}</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          className="btn-icon" 
                          onClick={() => openDetail(key)}
                          title={t('apiKeys.viewDetail')}
                        >
                          <Icon icon="mdi:eye-outline" width={18} />
                        </button>
                        {/* Claude 平台显示启用/禁用切换，其他平台显示删除 */}
                        {key.platform === 'anthropic' ? (
                          <button 
                            className={`btn-icon ${key.status === 'active' ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}
                            onClick={() => toggleClaudeKeyStatus(key)}
                            disabled={togglingKeyId === key.id}
                            title={key.status === 'active' ? '禁用' : '启用'}
                          >
                            {togglingKeyId === key.id ? (
                              <Icon icon="mdi:loading" width={18} className="animate-spin" />
                            ) : (
                              <Icon icon={key.status === 'active' ? 'mdi:pause-circle-outline' : 'mdi:play-circle-outline'} width={18} />
                            )}
                          </button>
                        ) : (
                          <button 
                            className="btn-icon text-red-500 hover:bg-red-50" 
                            onClick={() => handleDelete(key)}
                            title={t('common.delete')}
                          >
                            <Icon icon="mdi:delete-outline" width={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* 详情抽屉 */}
      {isDetailOpen && selectedKey && createPortal(
        <div className="drawer-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="drawer" style={{ width: '33.33%', minWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="flex items-center gap-3">
                <div 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${getPlatformConfig(selectedKey.platform).bgColor}`}
                >
                  <Icon icon={getPlatformConfig(selectedKey.platform).icon} width={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedKey.name}</h3>
                  <div className="text-sm text-gray-500">{getPlatformConfig(selectedKey.platform).name}</div>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsDetailOpen(false)}>
                <Icon icon="mdi:close" width={20} />
              </button>
            </div>
            <div className="drawer-body space-y-6">
              {/* 基本信息 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">{t('apiKeys.basicInfo')}</h4>
                <div className="space-y-3 bg-gray-50 dark:bg-[var(--bg-secondary)] rounded-lg p-4">
                  <div className="info-row">
                    <div className="info-label">{t('apiKeys.apiKeyLabel')}</div>
                    <div className="info-value">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-white dark:bg-[var(--bg-tertiary)] px-2 py-1 rounded border font-mono dark:border-[var(--border-primary)] dark:text-[var(--text-primary)]">
                          {selectedKey.maskedKey}
                        </code>
                        <button 
                          className={`text-blue-500 hover:text-blue-600 dark:text-[var(--accent-primary)] dark:hover:text-[var(--accent-primary-hover)] transition-colors ${
                            !selectedKey.apiKey || selectedKey.apiKey.length <= 20 ? 'opacity-60' : ''
                          }`}
                          onClick={() => copyApiKey(selectedKey)}
                          title={selectedKey.apiKey && selectedKey.apiKey.length > 20 ? t('apiKeys.copyApiKey') : (selectedKey.maskedKey ? t('apiKeys.copyApiKey') + ' (仅显示部分)' : t('apiKeys.cannotCopyKey'))}
                        >
                          <Icon 
                            icon={copiedId === selectedKey.id ? 'mdi:check' : (!selectedKey.apiKey || selectedKey.apiKey.length <= 20 ? 'mdi:alert-circle-outline' : 'mdi:content-copy')} 
                            width={14} 
                            className={copiedId === selectedKey.id ? 'text-green-500' : (!selectedKey.apiKey || selectedKey.apiKey.length <= 20 ? 'text-orange-500' : '')} 
                          />
                        </button>
                        {(!selectedKey.apiKey || selectedKey.apiKey.length <= 20) && (
                          <span className="text-xs text-orange-600 dark:text-orange-400" title={t('apiKeys.cannotCopyKey')}>
                            <Icon icon="mdi:alert-circle-outline" width={14} />
                          </span>
                        )}
                      </div>
                      {(!selectedKey.apiKey || selectedKey.apiKey.length <= 20) && (
                        <p className="text-xs text-gray-500 dark:text-[var(--text-tertiary)] mt-1">
                          {t('apiKeys.cannotCopyKey')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">{t('apiKeys.status')}</div>
                    <div className="info-value">
                      <span className={`tag ${getStatusConfig(selectedKey.status).class}`}>
                        {t(getStatusConfig(selectedKey.status).textKey)}
                      </span>
                    </div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">{t('apiKeys.createdAt')}</div>
                    <div className="info-value">{new Date(selectedKey.createdAt).toLocaleString(i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US')}</div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">{t('apiKeys.lastUsed')}</div>
                    <div className="info-value">{formatDate(selectedKey.lastUsedAt, t, i18n.language)}</div>
                  </div>
                  {selectedKey.expiresAt && (
                    <div className="info-row">
                      <div className="info-label">{t('apiKeys.expiresAt')}</div>
                      <div className="info-value text-orange-600">
                        {new Date(selectedKey.expiresAt).toLocaleString(i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 用量统计 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">{t('apiKeys.usageStats')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4">
                    <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">{t('apiKeys.accountBalance')}</div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(selectedKey.balance, selectedKey.platform)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-4">
                    <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">{t('apiKeys.monthlySpend')}</div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(selectedKey.monthlyUsage, selectedKey.platform)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4">
                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">{t('apiKeys.monthlyTokens')}</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatNumber(selectedKey.tokenUsage.monthly)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-xl p-4">
                    <div className="text-sm text-cyan-600 dark:text-cyan-400 mb-1">{t('apiKeys.todayTokens')}</div>
                    <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{formatNumber(selectedKey.tokenUsage.daily)}</div>
                  </div>
                </div>
              </div>

              {/* 速率限制 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">{t('apiKeys.rateLimit')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('apiKeys.rpm')}</div>
                    <div className="text-lg font-semibold text-gray-800">{selectedKey.rateLimit.rpm}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('apiKeys.tpm')}</div>
                    <div className="text-lg font-semibold text-gray-800">{formatNumber(selectedKey.rateLimit.tpm)}</div>
                  </div>
                </div>
              </div>

              {/* 责任人与业务 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">{t('apiKeys.ownerAndBusiness')}</h4>
                <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                  <div className="info-row">
                    <div className="info-label">{t('apiKeys.owner')}</div>
                    <div className="info-value flex items-center gap-2">
                      {selectedKey.ownerName ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-500">
                            <span>{selectedKey.ownerName.charAt(0)}</span>
                          </div>
                          <span>{selectedKey.ownerName}</span>
                          {selectedKey.ownerPhone && (
                            <span className="text-gray-400 text-xs">{selectedKey.ownerPhone}</span>
                          )}
                          {selectedKey.ownerEmail && (
                            <span className="text-gray-400 text-xs">{selectedKey.ownerEmail}</span>
                          )}
                        </div>
                      ) : selectedKey.owner ? (
                        // 兼容旧的关联用户方式
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 overflow-hidden ${
                            selectedKey.owner.status === 'resigned' ? 'bg-red-100' : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                          }`}>
                            {selectedKey.owner.avatar ? (
                              <img src={selectedKey.owner.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className={selectedKey.owner.status === 'resigned' ? 'text-red-600' : 'text-white'}>
                                {selectedKey.owner.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className={selectedKey.owner.status === 'resigned' ? 'text-red-600' : ''}>
                            {selectedKey.owner.name}
                          </span>
                          {selectedKey.owner.status === 'resigned' && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">已离职</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">{t('apiKeys.notAssigned')}</span>
                      )}
                      <button
                        className="text-xs text-blue-500 hover:text-blue-600 ml-2"
                        onClick={() => openOwnerModal(selectedKey)}
                      >
                        {t('common.edit')}
                      </button>
                    </div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">{t('apiKeys.business')}</div>
                    <div className="info-value flex items-center gap-2">
                      {editingBusiness ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder={t('apiKeys.inputBusiness')}
                            value={businessValue}
                            onChange={e => setBusinessValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveBusiness();
                              if (e.key === 'Escape') setEditingBusiness(false);
                            }}
                            autoFocus
                          />
                          <button
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                            onClick={handleSaveBusiness}
                            disabled={savingBusiness}
                          >
                            {savingBusiness ? t('common.saving') : t('common.save')}
                          </button>
                          <button
                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                            onClick={() => setEditingBusiness(false)}
                            disabled={savingBusiness}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="tag tag-blue">{selectedKey.business || t('apiKeys.notSet')}</span>
                          <button
                            className="text-xs text-blue-500 hover:text-blue-600"
                            onClick={() => {
                              setBusinessValue(selectedKey.business || '');
                              setEditingBusiness(true);
                            }}
                          >
                            {t('common.edit')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              <button className="btn btn-secondary" onClick={() => setIsDetailOpen(false)}>
                {t('common.close')}
              </button>
              <button 
                className={`btn ${selectedKey.status === 'active' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => {
                  toggleStatus(selectedKey);
                  setSelectedKey({...selectedKey, status: selectedKey.status === 'active' ? 'inactive' : 'active'});
                }}
              >
                <Icon icon={selectedKey.status === 'active' ? 'mdi:pause' : 'mdi:play'} width={16} />
                {selectedKey.status === 'active' ? t('apiKeys.disable') : t('apiKeys.enable')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 创建抽屉 */}
      {isCreateOpen && createPortal(
        <div className="drawer-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="drawer" style={{ width: '33.33%', minWidth: '480px' }} onClick={e => e.stopPropagation()}>
            {/* 渐变头部 */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-5">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full blur-3xl" />
              </div>
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Icon icon="mdi:key-plus" width={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{t('apiKeys.addApiKey')}</h3>
                  <p className="text-white/70 text-sm">{t('apiKeys.addApiKeyDesc')}</p>
                </div>
              </div>
              <button 
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                onClick={() => setIsCreateOpen(false)}
              >
                <Icon icon="mdi:close" width={18} className="text-white" />
              </button>
            </div>
            <div className="drawer-body space-y-5">
              {/* 模式切换 */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    createMode === 'import' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setCreateMode('import')}
                >
                  <Icon icon="mdi:key-plus" width={16} className="inline mr-1.5" />
                  {t('apiKeys.importExistingKey')}
                </button>
                <button
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    createMode === 'create' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => {
                    setCreateMode('create');
                    // 如果当前选中的是 Claude，切换到支持 API 创建的平台
                    if (createForm.platform === 'anthropic') {
                      setCreateForm(prev => ({ ...prev, platform: 'openai' }));
                    }
                  }}
                >
                  <Icon icon="mdi:api" width={16} className="inline mr-1.5" />
                  {t('apiKeys.createViaApi')}
                </button>
              </div>

              {/* 平台选择 */}
              <div className="form-group">
                <label className="form-label">选择平台</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(AI_PLATFORMS).map(([key, platform]) => {
                    // Claude 在"通过 API 创建"模式下不可用
                    const isDisabled = key === 'anthropic' && createMode === 'create';
                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isDisabled 
                            ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50' 
                            : createForm.platform === key 
                              ? 'border-blue-500 bg-blue-50 cursor-pointer' 
                              : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (isDisabled) {
                            showToast(t('apiKeys.claudeNotSupported'), 'info');
                            return;
                          }
                          setCreateForm(prev => ({ ...prev, platform: key as PlatformKey }));
                        }}
                        title={isDisabled ? t('apiKeys.claudeApiNotSupported') : ''}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDisabled ? 'bg-gray-300' : platform.bgColor}`}
                          >
                            <Icon icon={platform.icon} width={18} className={isDisabled ? 'text-gray-400' : 'text-white'} />
                          </div>
                          <div className={`text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-800'}`}>
                            {platform.name}
                            {isDisabled && <Icon icon="mdi:lock" width={12} className="inline ml-1" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 名称 */}
              <div className="form-group">
                <label className="form-label">Key 名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('apiKeys.keyNamePlaceholder')}
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('apiKeys.keyNameDesc')}
                </p>
              </div>

              {/* 导入模式：输入已有 Key */}
              {createMode === 'import' && (
                <div className="form-group">
                  <label className="form-label">{t('apiKeys.apiKeyLabel')} *</label>
                  <input
                    type="password"
                    className="form-input font-mono"
                    placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxx"
                    value={createForm.apiKey}
                    onChange={e => setCreateForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('apiKeys.apiKeyInputDesc')}
                  </p>
                </div>
              )}

              {/* 说明信息 */}
              <div className={`p-4 rounded-lg border ${
                createForm.platform === 'anthropic' && createMode === 'import' 
                  ? 'bg-orange-50 border-orange-100' 
                  : createMode === 'import' 
                    ? 'bg-green-50 border-green-100' 
                    : 'bg-blue-50 border-blue-100'
              }`}>
                <div className="flex items-start gap-3">
                  <Icon 
                    icon={createForm.platform === 'anthropic' ? 'mdi:alert-circle' : createMode === 'import' ? 'mdi:cloud-sync' : 'mdi:information'} 
                    width={20} 
                    className={`${
                      createForm.platform === 'anthropic' && createMode === 'import'
                        ? 'text-orange-500'
                        : createMode === 'import' 
                          ? 'text-green-500' 
                          : 'text-blue-500'
                    } mt-0.5 flex-shrink-0`} 
                  />
                  <div className={`text-sm ${
                    createForm.platform === 'anthropic' && createMode === 'import'
                      ? 'text-orange-800'
                      : createMode === 'import' 
                        ? 'text-green-800' 
                        : 'text-blue-800'
                  }`}>
                    {createForm.platform === 'anthropic' ? (
                      <>
                        <p className="font-medium mb-1">Claude 仅支持导入模式</p>
                        <p className="text-orange-600">
                          {t('apiKeys.claudeApiKeyNotSupported')}{' '}
                          <a 
                            href="https://console.anthropic.com/settings/keys" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline hover:text-orange-700"
                          >
                            Anthropic Console
                          </a>
                          {' '}创建 Key 后导入。
                        </p>
                      </>
                    ) : createMode === 'import' ? (
                      <>
                        <p className="font-medium mb-1">导入后自动同步数据</p>
                        <p className="text-green-600">
                          系统会定时调用 {AI_PLATFORMS[createForm.platform].name} API 同步余额、用量、Token 消耗等数据。
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium mb-1">通过 API 自动创建</p>
                        <p className="text-blue-600">
                          {t('apiKeys.autoCreateApiKeyDesc', { platform: AI_PLATFORMS[createForm.platform].name })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 火山引擎 IAM 用户名（API 创建模式） */}
              {createMode === 'create' && createForm.platform === 'volcengine' && (
                <div className="form-group">
                  <label className="form-label">IAM 用户名 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="请输入 IAM 用户名"
                    value={createForm.userName}
                    onChange={e => setCreateForm(prev => ({ ...prev, userName: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    火山引擎 IAM 用户名，用于创建 AccessKey
                  </p>
                </div>
              )}

              {/* OpenAI 项目选择（API 创建模式） */}
              {createMode === 'create' && createForm.platform === 'openai' && (
                <div className="form-group">
                  <label className="form-label">选择项目 *</label>
                  {loadingProjects ? (
                    <div className="flex items-center gap-2 text-gray-500 py-2">
                      <Icon icon="mdi:loading" width={16} className="animate-spin" />
                      <span className="text-sm">加载项目列表...</span>
                    </div>
                  ) : openaiProjects.length > 0 ? (
                    <div className="relative" ref={projectDropdownRef}>
                      {/* 选择器触发按钮 */}
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-left"
                        onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-md flex-shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Icon icon="mdi:folder-outline" width={14} className="text-white" />
                          </div>
                          <span className="truncate text-gray-900">
                            {openaiProjects.find(p => p.id === createForm.projectId)?.name || '选择项目...'}
                          </span>
                        </div>
                        <Icon 
                          icon={projectDropdownOpen ? "mdi:chevron-up" : "mdi:chevron-down"} 
                          width={18} 
                          className="text-gray-400 flex-shrink-0" 
                        />
                      </button>

                      {/* 下拉列表 */}
                      {projectDropdownOpen && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="max-h-64 overflow-y-auto">
                            {openaiProjects.map(project => (
                              <button
                                key={project.id}
                                type="button"
                                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left ${
                                  createForm.projectId === project.id ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => {
                                  setCreateForm(prev => ({ ...prev, projectId: project.id }));
                                  setProjectDropdownOpen(false);
                                }}
                              >
                                <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                                  createForm.projectId === project.id 
                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                                    : 'bg-gray-100'
                                }`}>
                                  <Icon 
                                    icon="mdi:folder-outline" 
                                    width={16} 
                                    className={createForm.projectId === project.id ? 'text-white' : 'text-gray-500'} 
                                  />
                                </div>
                                <span className={`flex-1 truncate ${
                                  createForm.projectId === project.id ? 'text-blue-600 font-medium' : 'text-gray-700'
                                }`}>
                                  {project.name}
                                </span>
                                {createForm.projectId === project.id && (
                                  <Icon icon="mdi:check" width={18} className="text-blue-500 flex-shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-500 py-2">
                      未找到可用项目，请确保已配置 OpenAI Admin Key
                    </div>
                  )}
                </div>
              )}

              {/* 业务用途 */}
              <div className="form-group">
                <label className="form-label">业务用途</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('apiKeys.businessPlaceholder')}
                  value={createForm.business}
                  onChange={e => setCreateForm(prev => ({ ...prev, business: e.target.value }))}
                />
              </div>

              {/* 责任人选择 */}
              <div className="form-group">
                <label className="form-label">责任人</label>
                
                {/* 手动填写表单 */}
                <div className="space-y-2">
                    <div className="relative">
                      <Icon icon="mdi:account" width={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        className="form-input pl-9"
                        placeholder={t('apiKeys.namePlaceholder')}
                        value={createForm.ownerName}
                        onChange={e => setCreateForm(prev => ({ ...prev, ownerName: e.target.value }))}
                      />
                    </div>
                    <div className="relative">
                      <Icon icon="mdi:email-outline" width={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        className="form-input pl-9"
                        placeholder={t('apiKeys.emailPlaceholder')}
                        value={createForm.ownerEmail}
                        onChange={e => setCreateForm(prev => ({ ...prev, ownerEmail: e.target.value }))}
                      />
                    </div>
                    <div className="relative">
                      <Icon icon="mdi:phone-outline" width={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        className="form-input pl-9"
                        placeholder={t('apiKeys.phonePlaceholder')}
                        value={createForm.ownerPhone}
                        onChange={e => setCreateForm(prev => ({ ...prev, ownerPhone: e.target.value }))}
                      />
                    </div>
                </div>
              </div>

              {/* 过期时间 */}
              <div className="form-group">
                <label className="form-label">{t('apiKeys.expiresAt')}</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    className="form-input flex-1"
                    value={createForm.expiresAt}
                    onChange={e => setCreateForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {createForm.expiresAt && (
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => setCreateForm(prev => ({ ...prev, expiresAt: '' }))}
                    >
                      清除
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  留空表示永久有效。{createMode === 'create' && <span className="text-orange-500">注意：这只是本地提醒，OpenAI 不支持设置过期时间</span>}
                </p>
              </div>
            </div>
            <div className="drawer-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
              >
                {t('common.cancel')}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreate}
                disabled={isCreating || !createForm.name || (createMode === 'import' && !createForm.apiKey)}
              >
                {isCreating ? (
                  <>
                    <Icon icon="mdi:loading" width={16} className="animate-spin" />
                    {createMode === 'import' ? '正在验证...' : '正在创建...'}
                  </>
                ) : (
                  <>
                    <Icon icon={createMode === 'import' ? 'mdi:import' : 'mdi:key-plus'} width={16} />
                    {createMode === 'import' ? t('apiKeys.importAndSync') : t('apiKeys.callApiCreate')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 创建成功弹窗 */}
      {showSuccessModal && createdKeyInfo && createPortal(
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            {/* 成功动画头部 */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 px-6 py-8 text-center">
              {/* 背景装饰 */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-white rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-white rounded-full blur-3xl" />
              </div>
              
              {/* 成功图标 */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <Icon icon="mdi:check-bold" width={32} className="text-emerald-500" />
                </div>
              </div>
              
              <h3 className="relative text-xl font-bold text-white mb-1">{t('apiKeys.apiKeyCreatedSuccess')}</h3>
              <p className="relative text-white/80 text-sm">{t('apiKeys.keyShownOnce')}</p>
              
              {/* 关闭按钮 */}
              <button 
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                onClick={() => { setShowSuccessModal(false); setCreatedKeyInfo(null); }}
              >
                <Icon icon="mdi:close" width={18} className="text-white" />
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="p-6 space-y-5">
              {/* Key 名称和平台 */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getPlatformConfig(createdKeyInfo.platform).bgColor}`}>
                  <Icon icon={getPlatformConfig(createdKeyInfo.platform).icon} width={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{createdKeyInfo.name}</div>
                  <div className="text-xs text-gray-500">
                    {getPlatformConfig(createdKeyInfo.platform).name}
                    {createdKeyInfo.projectName && ` · ${createdKeyInfo.projectName}`}
                  </div>
                </div>
              </div>
              
              {/* API Key 展示区 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Icon icon="mdi:key" width={16} className="inline mr-1 text-amber-500" />
                  {t('apiKeys.apiKeyLabel')}
                </label>
                <div className="relative group">
                  <div className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl font-mono text-sm text-emerald-400 break-all leading-relaxed shadow-inner">
                    {createdKeyInfo.apiKey}
                  </div>
                  <button
                    className="absolute top-2 right-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                    onClick={async () => {
                      const success = await copyToClipboardCompat(createdKeyInfo.apiKey);
                      showToast(success ? t('common.copiedToClipboard') : t('common.copyFailed'), success ? 'success' : 'error');
                    }}
                  >
                    <Icon icon="mdi:content-copy" width={14} />
                    复制
                  </button>
                </div>
              </div>
              
              {/* 警告提示 */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Icon icon="mdi:alert-circle" width={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">{t('apiKeys.keepKeySafe')}</p>
                  <p className="text-amber-600">{t('apiKeys.keyShownOnceWarning')}</p>
                </div>
              </div>
            </div>
            
            {/* 底部按钮 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  const success = await copyToClipboardCompat(createdKeyInfo.apiKey);
                  showToast(success ? t('common.copiedToClipboard') : t('common.copyFailed'), success ? 'success' : 'error');
                  setShowSuccessModal(false);
                  setCreatedKeyInfo(null);
                }}
              >
                <Icon icon="mdi:content-copy" width={16} />
                复制并关闭
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && deleteTarget && createPortal(
        <div className="modal-overlay">
          <div className="modal dark:bg-[var(--bg-primary)] dark:border-[var(--border-primary)]" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            {/* 温和的警告头部 */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-[var(--border-primary)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                  <Icon icon="mdi:alert-circle-outline" width={24} className="text-orange-500 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-[var(--text-primary)]">{t('apiKeys.deleteKey')}</h3>
                  <p className="text-sm text-gray-500 dark:text-[var(--text-tertiary)] mt-0.5">{t('apiKeys.confirmDelete')}</p>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[var(--bg-secondary)] rounded-xl mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getPlatformConfig(deleteTarget.platform).bgColor}`}>
                  <Icon icon={getPlatformConfig(deleteTarget.platform).icon} width={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-[var(--text-primary)] truncate">{deleteTarget.name}</div>
                  <div className="text-xs text-gray-500 dark:text-[var(--text-tertiary)]">{getPlatformConfig(deleteTarget.platform).name}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg">
                <Icon icon="mdi:information-outline" width={18} className="text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-[var(--text-secondary)] leading-relaxed">
                  {t('apiKeys.deleteWarning')}
                </p>
              </div>
            </div>
            
            <div className="px-5 py-4 bg-gray-50 dark:bg-[var(--bg-secondary)] border-t border-gray-100 dark:border-[var(--border-primary)] flex justify-end gap-3">
              <button 
                className="btn btn-secondary dark:bg-[var(--bg-tertiary)] dark:text-[var(--text-primary)] dark:border-[var(--border-primary)]" 
                onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
              >
                {t('common.cancel')}
              </button>
              <button 
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2" 
                onClick={confirmDelete}
              >
                <Icon icon="mdi:delete-outline" width={16} />
                {t('apiKeys.deleteKey')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 责任人编辑抽屉 */}
      {showOwnerModal && ownerTarget && createPortal(
        <div className="drawer-overlay" onClick={() => setShowOwnerModal(false)}>
          <div 
            className="drawer" 
            style={{ width: '33.33%', minWidth: '380px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 抽屉头部 */}
            <div className="drawer-header">
              <div>
                <div className="font-semibold text-gray-800">{t('apiKeys.setOwner')}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{ownerTarget.name}</div>
              </div>
              <button 
                className="btn-icon" 
                onClick={() => setShowOwnerModal(false)}
              >
                <Icon icon="mdi:close" width={20} />
              </button>
            </div>
            
            {/* 表单内容 */}
            <div className="drawer-body space-y-4">
              {/* 提示信息 */}
              <div className="flex items-center gap-2 text-blue-600 text-xs bg-blue-50 px-3 py-2 rounded-lg">
                <Icon icon="mdi:information-outline" width={16} />
                <span>{t('apiKeys.selectOwnerFromTeam')}</span>
              </div>
              
              {/* 团队成员选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('apiKeys.selectOwnerRequired')} <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  value={selectedOwnerId}
                  onChange={e => setSelectedOwnerId(e.target.value)}
                  autoFocus
                >
                  <option value="">{t('apiKeys.selectMemberPlaceholder')}</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email} {member.status === 'invited' && t('apiKeys.pendingInvite')}
                    </option>
                  ))}
                </select>
                {teamMembers.length === 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {t('apiKeys.noMembersYet')}
                  </div>
                )}
              </div>
            </div>
            
            {/* 底部按钮 */}
            <div className="drawer-footer justify-between">
              {/* 清除按钮 */}
              <button
                className="btn btn-secondary text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={async () => {
                  setSavingOwner(true);
                  try {
                    // 清除关联的责任人
                    const result1 = await updateLLMApiKeyOwner(ownerTarget.id, null);
                    // 清除联系人信息
                    const result2 = await clearLLMApiKeyOwnerContact(ownerTarget.id);
                    
                    if (result1.success && result2.success) {
                      showToast(t('apiKeys.ownerCleared'), 'success');
                      await loadData(); // 重新加载数据
                      setShowOwnerModal(false);
                    } else {
                      showToast(result1.error || result2.error || t('apiKeys.clearFailed'), 'error');
                    }
                  } finally {
                    setSavingOwner(false);
                  }
                }}
                disabled={savingOwner || (!ownerTarget.owner && !ownerTarget.ownerName)}
              >
                {t('apiKeys.clearOwner')}
              </button>
              
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowOwnerModal(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className={`btn ${
                    selectedOwnerId
                      ? 'btn-primary'
                      : 'btn-secondary opacity-50 cursor-not-allowed'
                  }`}
                  onClick={async () => {
                    if (!selectedOwnerId) return;
                    
                    const selectedMember = teamMembers.find(m => m.id === selectedOwnerId);
                    if (!selectedMember) {
                      showToast('未找到选中的团队成员', 'error');
                      return;
                    }
                    
                    setSavingOwner(true);
                    try {
                      // 使用 updateLLMApiKeyOwner 关联团队成员
                      const result = await updateLLMApiKeyOwner(
                        ownerTarget.id,
                        selectedMember.user_id || null,
                        `责任人: ${selectedMember.name || selectedMember.email}`
                      );
                      
                      if (result.success) {
                        // 同时更新联系人信息（用于显示）
                        if (selectedMember.user_id) {
                          await updateLLMApiKeyOwnerContact(ownerTarget.id, {
                            name: selectedMember.name || selectedMember.email,
                            email: selectedMember.email,
                            phone: undefined // 团队成员表中没有手机号字段
                          });
                        }
                        
                        showToast(t('apiKeys.ownerSetSuccess', { name: selectedMember.name || selectedMember.email }), 'success');
                        await loadData(); // 重新加载数据以更新显示
                        setShowOwnerModal(false);
                      } else {
                        showToast(result.error || t('apiKeys.saveFailed'), 'error');
                      }
                    } finally {
                      setSavingOwner(false);
                    }
                  }}
                  disabled={savingOwner || !selectedOwnerId}
                >
                  {savingOwner ? (
                    <Icon icon="mdi:loading" width={16} className="animate-spin" />
                  ) : (
                    <Icon icon="mdi:check" width={16} />
                  )}
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 批量分配责任人弹窗 */}
      {showBatchOwnerModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowBatchOwnerModal(false)}>
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
                <div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{t('apiKeys.batchAssignOwner')}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t('apiKeys.batchAssignOwnerDesc', { count: selectedKeyIds.size })}</div>
                </div>
                <button 
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors" 
                  onClick={() => setShowBatchOwnerModal(false)}
                >
                  <Icon icon="mdi:close" width={20} className="text-gray-500" />
                </button>
              </div>
              
              {/* 表单内容 */}
              <div className="p-5 space-y-4">
                {/* 提示信息 */}
                <div className="flex items-center gap-2 text-blue-600 text-xs bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                  <Icon icon="mdi:information-outline" width={16} />
                  <span>{t('team.selectMemberHint')}</span>
                </div>
                
                {/* 团队成员选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                    {t('apiKeys.selectOwnerRequired')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full h-10 px-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all"
                    value={selectedOwnerId}
                    onChange={e => setSelectedOwnerId(e.target.value)}
                    autoFocus
                  >
                    <option value="">-- 请选择团队成员 --</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name || member.email} {member.status === 'invited' && '(待接受邀请)'}
                      </option>
                    ))}
                  </select>
                  {teamMembers.length === 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {t('apiKeys.noMembersYet')}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 底部按钮 */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowBatchOwnerModal(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className={`btn ${
                    selectedOwnerId
                      ? 'btn-primary'
                      : 'btn-secondary opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (selectedOwnerId) {
                      handleBatchAssignOwner(selectedOwnerId);
                    }
                  }}
                  disabled={batchAssigning || !selectedOwnerId}
                >
                  {batchAssigning ? (
                    <Icon icon="mdi:loading" width={16} className="animate-spin" />
                  ) : (
                    <Icon icon="mdi:check" width={16} />
                  )}
                  {t('apiKeys.confirmBatchAssign')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* 升级订阅弹窗 */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={upgradeFeature}
      />
    </div>
  );
}
