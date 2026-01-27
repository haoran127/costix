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
  fetchOpenAIUsageDirect,
  getLLMPlatformAccounts,
  createOpenAIKey,
  getOpenAIProjects,
  listClaudeKeys,
  syncClaudeUsage,
  updateClaudeKey,
  listOpenRouterKeys,
  createOpenRouterKey,
  deleteOpenRouterKey,
  getOpenRouterCredits,
  syncOpenRouterKeys,
  updatePlatformAccountBalance,
  type LLMApiKey,
} from '../services/api';
import { getTeamMembers, type TeamMember } from '../services/team';

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

// Mock Mind 用户列表
const MOCK_MIND_USERS = [
  { id: 'user1', name: '张三', email: 'zhangsan@company.com', avatar: null, status: 'active' as const },
  { id: 'user2', name: '李四', email: 'lisi@company.com', avatar: null, status: 'active' as const },
  { id: 'user3', name: '王五', email: 'wangwu@company.com', avatar: null, status: 'resigned' as const }, // 离职
  { id: 'user4', name: '赵六', email: 'zhaoliu@company.com', avatar: null, status: 'active' as const },
  { id: 'user5', name: '钱七', email: 'qianqi@company.com', avatar: null, status: 'resigned' as const }, // 离职
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
  balance: number;
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
function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2);
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} 分钟前`;
    }
    return `${hours} 小时前`;
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days} 天前`;
  }
  return date.toLocaleDateString('zh-CN');
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
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>(platform || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
  // 责任人联系信息表单
  const [ownerContactForm, setOwnerContactForm] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [autoSyncing, setAutoSyncing] = useState(false);  // 自动同步状态
  const [platformAccounts, setPlatformAccounts] = useState<Array<{ id: string; platform: string; total_balance: number | null; status: string }>>([]);  // 平台账号数据
  
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
  });
  const [isCreating, setIsCreating] = useState(false);
  
  // 团队成员选择
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ownerSelectMode, setOwnerSelectMode] = useState<'team' | 'manual'>('team');
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const ownerDropdownRef = useRef<HTMLDivElement>(null);
  
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
    return {
      id: key.id,
      name: key.name,
      platform: key.platform as PlatformKey,
      projectId: key.project_id,
      platformKeyId: key.platform_key_id,  // 平台 Key ID（用于调用平台 API）
      apiKey: key.api_key_encrypted || '', // 完整 Key（用于复制）
      maskedKey: `${key.api_key_prefix || '***'}****${key.api_key_suffix || '***'}`,
      status: key.status as 'active' | 'inactive' | 'low_balance' | 'expired',
      balance: key.balance ?? 0, // 从数据库获取余额
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

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [keysData, accountsData] = await Promise.all([
        getLLMApiKeys({ platform: platformFilter }),
        getLLMPlatformAccounts()
      ]);
      
      setApiKeys(keysData.map(convertToApiKeyItem));
      setPlatformAccounts(accountsData.map(a => ({
        id: a.id,
        platform: a.platform,
        total_balance: a.total_balance ?? null,
        status: a.status
      })));
    } catch (err) {
      console.error('加载数据失败:', err);
      showToast('加载数据失败', 'error');
      // 如果 API 失败，回退到 Mock 数据
      setApiKeys(MOCK_API_KEYS as ApiKeyItem[]);
    } finally {
      setIsLoading(false);
    }
  }, [platformFilter, convertToApiKeyItem]);

  // 初始化加载 + 自动同步
  useEffect(() => {
    const initLoad = async () => {
      // 先加载数据
      await loadData();
      
      // 加载团队成员
      try {
        const members = await getTeamMembers();
        setTeamMembers(members);
      } catch (err) {
        console.error('加载团队成员失败:', err);
      }
      
      // 然后静默同步 OpenAI 用量（不阻塞页面显示）
      setAutoSyncing(true);
      try {
        const accounts = await getLLMPlatformAccounts();
        const openaiAccount = accounts.find(a => a.platform === 'openai' && a.status === 'active');
        
        if (openaiAccount?.admin_api_key_encrypted) {
          const result = await fetchOpenAIUsageDirect(openaiAccount.admin_api_key_encrypted);
          if (result.success) {
            // 同步成功后重新加载数据以获取最新用量
            await loadData();
            console.log('[自动同步] OpenAI 用量同步完成');
          }
        }
      } catch (err) {
        console.warn('[自动同步] 同步失败:', err);
      } finally {
        setAutoSyncing(false);
      }
    };
    
    initLoad();
  }, []);

  // 显示 Toast 函数需要在 loadData 之前定义
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 筛选后的数据
  const filteredKeys = useMemo(() => {
    return apiKeys.filter(key => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = key.name.toLowerCase().includes(query);
        const matchBusiness = key.business.toLowerCase().includes(query);
        const matchOwner = key.owner?.name.toLowerCase().includes(query);
        const matchKey = key.maskedKey.toLowerCase().includes(query);
        if (!matchName && !matchBusiness && !matchOwner && !matchKey) {
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
      return true;
    });
  }, [apiKeys, searchQuery, platformFilter, statusFilter]);

  // 统计数据 - 根据当前选中的平台计算
  const stats = useMemo(() => {
    const keysToCount = platformFilter === 'all' 
      ? apiKeys 
      : apiKeys.filter(k => k.platform === platformFilter);
    const total = keysToCount.length;
    const active = keysToCount.filter(k => k.status === 'active').length;
    
    // 使用平台账号的 total_balance 来计算账户余额
    // 如果是筛选特定平台，只计算该平台账号的余额
    // 如果是全部平台，计算所有活跃平台账号的余额总和
    const accountsToCount = platformFilter === 'all'
      ? platformAccounts.filter(a => a.status === 'active')
      : platformAccounts.filter(a => a.platform === platformFilter && a.status === 'active');
    const totalBalance = accountsToCount.reduce((sum, a) => sum + (a.total_balance || 0), 0);
    
    const monthlyUsage = keysToCount.reduce((sum, k) => sum + k.monthlyUsage, 0);
    const monthlyTokens = keysToCount.reduce((sum, k) => sum + k.tokenUsage.monthly, 0);
    return { total, active, totalBalance, monthlyUsage, monthlyTokens };
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
    showToast(targetPlatform === 'all' ? t('apiKeys.syncingAll') : t('apiKeys.syncingPlatform', { platform: AI_PLATFORMS[targetPlatform as PlatformKey]?.name || targetPlatform }), 'info');
    
    try {
      const accounts = await getLLMPlatformAccounts();
      
      // OpenAI 用量同步
      if (targetPlatform === 'openai' || targetPlatform === 'all') {
        const openaiAccount = accounts.find(a => a.platform === 'openai' && a.status === 'active');
        
        if (openaiAccount?.admin_api_key_encrypted) {
          const result = await fetchOpenAIUsageDirect(openaiAccount.admin_api_key_encrypted);
          
          if (result.success) {
            setUsageData({
              today_tokens: result.today_tokens,
              month_tokens: result.month_tokens,
              by_project: result.by_project,
              last_synced: new Date().toISOString()
            });
            
            await loadData();
            showToast(`OpenAI 用量同步完成！本月: ${formatNumber(result.month_tokens)} tokens`, 'success');
          } else {
            showToast(`OpenAI 同步失败: ${result.error}`, 'error');
          }
        } else if (targetPlatform === 'openai') {
          showToast(t('apiKeys.noAdminKey', { platform: 'OpenAI' }), 'error');
        }
      }
      
      // Claude (Anthropic) 同步 - Keys 列表 + 用量数据
      if (targetPlatform === 'anthropic' || targetPlatform === 'all') {
        const claudeAccount = accounts.find(a => a.platform === 'anthropic' && a.status === 'active');
        
        if (claudeAccount?.admin_api_key_encrypted) {
          const adminKey = claudeAccount.admin_api_key_encrypted;
          const messages: string[] = [];
          
          // 1. 获取并保存 Keys 列表
          const keysResult = await listClaudeKeys(adminKey);
          if (keysResult.success) {
            const keyCount = keysResult.total || (keysResult.keys?.length || 0);
            messages.push(`${keyCount} 个 Keys`);
          } else {
            console.error('Claude Keys 同步失败:', keysResult.error);
          }
          
          // 2. 同步每月用量数据
          const monthResult = await syncClaudeUsage(adminKey, { range: 'month' });
          if (monthResult.success && monthResult.summary) {
            const totalTokens = monthResult.summary.total_tokens || 0;
            messages.push(`本月 ${formatNumber(totalTokens)} tokens`);
          } else {
            console.error('Claude 每月用量同步失败:', monthResult.error);
          }
          
          // 3. 同步今日用量数据
          const todayResult = await syncClaudeUsage(adminKey, { range: 'today' });
          if (todayResult.success && todayResult.summary) {
            const todayTokens = todayResult.summary.total_tokens || 0;
            messages.push(`今日 ${formatNumber(todayTokens)} tokens`);
          } else {
            console.error('Claude 今日用量同步失败:', todayResult.error);
          }
          
          await loadData();
          
          if (messages.length > 0) {
            showToast(`Claude 同步完成！${messages.join('，')}`, 'success');
          } else {
            showToast(t('apiKeys.syncFailed', { platform: 'Claude' }), 'error');
          }
        } else if (targetPlatform === 'anthropic') {
          showToast(t('apiKeys.noAdminKey', { platform: 'Claude' }), 'error');
        }
      }
      
      // OpenRouter 同步 - Keys 列表 + 余额
      if (targetPlatform === 'openrouter' || targetPlatform === 'all') {
        const openrouterAccount = accounts.find(a => a.platform === 'openrouter' && a.status === 'active');
        
        if (openrouterAccount?.admin_api_key_encrypted) {
          const adminKey = openrouterAccount.admin_api_key_encrypted;
          const messages: string[] = [];
          
          // 1. 获取 Keys 列表和用量
          const keysResult = await syncOpenRouterKeys(adminKey, openrouterAccount.id);
          if (keysResult.success) {
            const keyCount = keysResult.keys_count || 0;
            messages.push(`${keyCount} 个 Keys`);
          } else {
            console.error('OpenRouter Keys 同步失败:', keysResult.error);
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
          }
          
          await loadData();
          
          if (messages.length > 0) {
            showToast(`OpenRouter 同步完成！${messages.join('，')}`, 'success');
          } else {
            showToast(t('apiKeys.syncFailed', { platform: 'OpenRouter' }), 'error');
          }
        } else if (targetPlatform === 'openrouter') {
          showToast(t('apiKeys.noAdminKey', { platform: 'OpenRouter' }), 'error');
        }
      }
      
      // 其他平台暂不支持
      if (targetPlatform !== 'openai' && targetPlatform !== 'anthropic' && targetPlatform !== 'openrouter' && targetPlatform !== 'all') {
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
        showToast(t('apiKeys.cannotCopyKey') + '（已复制显示的部分）', 'warning');
      } else {
        showToast(t('common.copyFailed'), 'error');
      }
      return;
    }
    
    // 如果都没有，提示无法复制
    showToast(t('apiKeys.cannotCopyKey'), 'error');
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
    // 加载现有联系人信息到表单
    setOwnerContactForm({
      name: key.ownerName || '',
      phone: key.ownerPhone || '',
      email: key.ownerEmail || ''
    });
    setShowOwnerModal(true);
  };


  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(event.target as Node)) {
        setOwnerDropdownOpen(false);
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
      
      const result = await getOpenAIProjects(openaiAccount.admin_api_key_encrypted);
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
        // API 创建模式：通过 n8n 调用平台 API 创建 Key
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
      setCreateForm({ name: '', platform: 'openai', apiKey: '', business: '', ownerName: '', ownerEmail: '', ownerPhone: '', expiresAt: '', projectId: '' });
      setCreateMode('import');
      setOpenaiProjects([]);
      setOwnerSelectMode('team');
      setSelectedTeamMember(null);
      setOwnerSearchQuery('');
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
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <Icon icon={toast.type === 'success' ? 'mdi:check-circle' : toast.type === 'error' ? 'mdi:close-circle' : 'mdi:information'} width={20} />
          {toast.message}
        </div>
      )}

      {/* 统计卡片 - 根据选中平台显示不同样式 */}
      <div className="grid grid-cols-5 gap-4">
        {/* 平台标识卡片 */}
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
          {/* 同步按钮 */}
          <button
            className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            onClick={() => syncPlatformData(platformFilter)}
            disabled={syncing !== null || autoSyncing}
            title={autoSyncing ? '自动同步中...' : `同步${currentPlatformConfig?.name || '所有'}数据`}
          >
            <Icon 
              icon="mdi:sync" 
              width={16} 
              className={`${(syncing === platformFilter || autoSyncing) ? 'animate-spin' : ''} ${currentPlatformConfig ? 'text-gray-600' : 'text-gray-400'}`} 
            />
          </button>
          {/* 自动同步提示 */}
          {autoSyncing && (
            <div className="absolute bottom-1 right-1 text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
              自动同步中
            </div>
          )}
        </div>

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
              } : { backgroundColor: 'rgb(243 232 255)' }}
            >
              <Icon 
                icon="mdi:wallet-outline" 
                width={20} 
                style={currentPlatformConfig ? { color: currentPlatformConfig.color } : { color: 'rgb(147 51 234)' }}
              />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.totalBalance)}</div>
              <div className="stat-label">{t('apiKeys.accountBalance')}</div>
            </div>
          </div>
        </div>

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
              } : { backgroundColor: 'rgb(255 237 213)' }}
            >
              <Icon 
                icon="mdi:chart-line" 
                width={20} 
                style={currentPlatformConfig ? { color: currentPlatformConfig.color } : { color: 'rgb(234 88 12)' }}
              />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.monthlyUsage)}</div>
              <div className="stat-label">{t('apiKeys.monthlySpend')}</div>
            </div>
          </div>
        </div>

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
      </div>

      {/* 操作栏 */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('apiKeys.keyList')}</h2>
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
              <option value="expired">已过期</option>
            </select>
            {/* 创建按钮 */}
            <button className="btn btn-primary whitespace-nowrap" onClick={() => setIsCreateOpen(true)}>
              <Icon icon="mdi:plus" width={18} />
              {t('apiKeys.createApiKey')}
            </button>
          </div>
        </div>

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
                <th>{t('apiKeys.namePlatform')}</th>
                <th>{t('apiKeys.apiKeyLabel')}</th>
                <th>{t('apiKeys.status')}</th>
                <th>{t('apiKeys.balanceUsage')}</th>
                <th>{t('apiKeys.tokensUsage')}</th>
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
                return (
                  <tr 
                    key={key.id} 
                    className={`${
                      key.owner?.status === 'resigned' 
                        ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-400' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${platform.bgColor}`}
                          style={{ boxShadow: `0 2px 8px ${platform.color}40` }}
                        >
                          <Icon icon={platform.icon} width={22} className="text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{key.name}</div>
                          <div className="text-xs text-gray-500">{platform.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 dark:bg-[var(--bg-tertiary)] px-2 py-1 rounded font-mono text-gray-600 dark:text-[var(--text-primary)]">
                          {key.maskedKey}
                        </code>
                        <button 
                          className={`btn-icon ${!key.apiKey || key.apiKey.length <= 20 ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => copyApiKey(key)}
                          title={key.apiKey && key.apiKey.length > 20 ? t('apiKeys.copyApiKey') : t('apiKeys.cannotCopyKey')}
                          disabled={!key.apiKey || key.apiKey.length <= 20}
                        >
                          <Icon 
                            icon={copiedId === key.id ? 'mdi:check' : 'mdi:content-copy'} 
                            width={16} 
                            className={copiedId === key.id ? 'text-green-500' : ''} 
                          />
                        </button>
                        {(!key.apiKey || key.apiKey.length <= 20) && (
                          <Icon 
                            icon="mdi:alert-circle-outline" 
                            width={14} 
                            className="text-orange-500 dark:text-orange-400"
                            title={t('apiKeys.cannotCopyKey')}
                          />
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
                          {formatCurrency(key.balance)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('apiKeys.thisMonth')} {formatCurrency(key.monthlyUsage)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {t('apiKeys.thisMonth')} {formatNumber(key.tokenUsage.monthly)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('apiKeys.today')} {formatNumber(key.tokenUsage.daily)}
                        </div>
                      </div>
                    </td>
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
                                已过期
                              </span>
                            ) : (
                              formatDate(key.expiresAt)
                            )}
                          </div>
                          {new Date(key.expiresAt) > new Date() && new Date(key.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                            <div className="text-xs text-orange-500">
                              {Math.ceil((new Date(key.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))} 天后过期
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
                            !selectedKey.apiKey || selectedKey.apiKey.length <= 20 ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          onClick={() => copyApiKey(selectedKey)}
                          title={selectedKey.apiKey && selectedKey.apiKey.length > 20 ? t('apiKeys.copyApiKey') : t('apiKeys.cannotCopyKey')}
                          disabled={!selectedKey.apiKey || selectedKey.apiKey.length <= 20}
                        >
                          <Icon icon={copiedId === selectedKey.id ? 'mdi:check' : 'mdi:content-copy'} width={14} />
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
                    <div className="info-value">{new Date(selectedKey.createdAt).toLocaleString('zh-CN')}</div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">{t('apiKeys.lastUsed')}</div>
                    <div className="info-value">{formatDate(selectedKey.lastUsedAt)}</div>
                  </div>
                  {selectedKey.expiresAt && (
                    <div className="info-row">
                      <div className="info-label">{t('apiKeys.expiresAt')}</div>
                      <div className="info-value text-orange-600">
                        {new Date(selectedKey.expiresAt).toLocaleString('zh-CN')}
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
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(selectedKey.balance)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-4">
                    <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">{t('apiKeys.monthlySpend')}</div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(selectedKey.monthlyUsage)}</div>
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
                
                {/* 选择模式切换 */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      ownerSelectMode === 'team'
                        ? 'bg-blue-50 border-blue-500 text-blue-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setOwnerSelectMode('team');
                      setCreateForm(prev => ({ ...prev, ownerName: '', ownerEmail: '', ownerPhone: '' }));
                    }}
                  >
                    <Icon icon="mdi:account-group" width={16} />
                    从团队选择
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      ownerSelectMode === 'manual'
                        ? 'bg-blue-50 border-blue-500 text-blue-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setOwnerSelectMode('manual');
                      setSelectedTeamMember(null);
                    }}
                  >
                    <Icon icon="mdi:pencil" width={16} />
                    手动填写
                  </button>
                </div>

                {ownerSelectMode === 'team' ? (
                  /* 团队成员选择器 */
                  <div className="relative" ref={ownerDropdownRef}>
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg flex items-center justify-between hover:border-gray-300 transition-colors"
                      onClick={() => setOwnerDropdownOpen(!ownerDropdownOpen)}
                    >
                      {selectedTeamMember ? (
                        <div className="flex items-center gap-2">
                          {selectedTeamMember.avatar_url ? (
                            <img src={selectedTeamMember.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                              {(selectedTeamMember.name || selectedTeamMember.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-gray-800">{selectedTeamMember.name || selectedTeamMember.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">选择团队成员...</span>
                      )}
                      <Icon icon="mdi:chevron-down" width={18} className={`text-gray-400 transition-transform ${ownerDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {ownerDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
                        {/* 搜索框 */}
                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                          <div className="relative">
                            <Icon icon="mdi:magnify" width={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              placeholder={t('apiKeys.searchMember')}
                              value={ownerSearchQuery}
                              onChange={e => setOwnerSearchQuery(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        {/* 成员列表 */}
                        <div className="py-1">
                          {teamMembers.length === 0 ? (
                            <div className="px-3 py-4 text-center text-gray-500 text-sm">
                              <Icon icon="mdi:account-group-outline" width={24} className="mx-auto mb-2 text-gray-300" />
                              <p>暂无团队成员</p>
                              <p className="text-xs text-gray-400 mt-1">去「成员管理」邀请成员</p>
                            </div>
                          ) : (
                            teamMembers
                              .filter(m => m.status === 'active')
                              .filter(m => {
                                if (!ownerSearchQuery) return true;
                                const q = ownerSearchQuery.toLowerCase();
                                return (m.name?.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
                              })
                              .map(member => (
                                <button
                                  key={member.id}
                                  type="button"
                                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                                    selectedTeamMember?.id === member.id ? 'bg-blue-50' : ''
                                  }`}
                                  onClick={() => {
                                    setSelectedTeamMember(member);
                                    setCreateForm(prev => ({
                                      ...prev,
                                      ownerName: member.name || '',
                                      ownerEmail: member.email,
                                      ownerPhone: '',
                                    }));
                                    setOwnerDropdownOpen(false);
                                    setOwnerSearchQuery('');
                                  }}
                                >
                                  {member.avatar_url ? (
                                    <img src={member.avatar_url} className="w-7 h-7 rounded-full" alt="" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs">
                                      {(member.name || member.email).charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-800 truncate">
                                      {member.name || member.email.split('@')[0]}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">{member.email}</div>
                                  </div>
                                  {selectedTeamMember?.id === member.id && (
                                    <Icon icon="mdi:check" width={16} className="text-blue-500" />
                                  )}
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 手动填写表单 */
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
                )}
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
                取消
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
                <div className="font-semibold text-gray-800">设置责任人</div>
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
              {/* 姓名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder={t('apiKeys.ownerNamePlaceholder')}
                  value={ownerContactForm.name}
                  onChange={e => setOwnerContactForm(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
              </div>
              
              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  手机号 <span className="text-gray-400 text-xs font-normal">（手机号和邮箱至少填一项）</span>
                </label>
                <input
                  type="tel"
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder={t('apiKeys.ownerPhonePlaceholder')}
                  value={ownerContactForm.phone}
                  onChange={e => setOwnerContactForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              
              {/* 邮箱 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  邮箱 <span className="text-gray-400 text-xs font-normal">（手机号和邮箱至少填一项）</span>
                </label>
                <input
                  type="email"
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder={t('apiKeys.ownerEmailPlaceholder')}
                  value={ownerContactForm.email}
                  onChange={e => setOwnerContactForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              
              {/* 验证提示 */}
              {ownerContactForm.name && !ownerContactForm.phone && !ownerContactForm.email && (
                <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 px-3 py-2 rounded-lg">
                  <Icon icon="mdi:alert-circle-outline" width={16} />
                  <span>手机号和邮箱至少需要填写一项</span>
                </div>
              )}
            </div>
            
            {/* 底部按钮 */}
            <div className="drawer-footer justify-between">
              {/* 清除按钮 */}
              <button
                className="btn btn-secondary text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={async () => {
                  setSavingOwner(true);
                  try {
                    const result = await clearLLMApiKeyOwnerContact(ownerTarget.id);
                    if (result.success) {
                      showToast('已清除责任人信息', 'success');
                      setApiKeys(prev => prev.map(k => 
                        k.id === ownerTarget.id 
                          ? { ...k, ownerName: undefined, ownerPhone: undefined, ownerEmail: undefined }
                          : k
                      ));
                      setShowOwnerModal(false);
                    } else {
                      showToast(result.error || '清除失败', 'error');
                    }
                  } finally {
                    setSavingOwner(false);
                  }
                }}
                disabled={savingOwner || (!ownerTarget.ownerName && !ownerTarget.ownerPhone && !ownerTarget.ownerEmail)}
              >
                清除责任人
              </button>
              
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowOwnerModal(false)}
                >
                  取消
                </button>
                <button
                  className={`btn ${
                    ownerContactForm.name && (ownerContactForm.phone || ownerContactForm.email)
                      ? 'btn-primary'
                      : 'btn-secondary opacity-50 cursor-not-allowed'
                  }`}
                  onClick={async () => {
                    if (!ownerContactForm.name || (!ownerContactForm.phone && !ownerContactForm.email)) return;
                    
                    setSavingOwner(true);
                    try {
                      const result = await updateLLMApiKeyOwnerContact(ownerTarget.id, {
                        name: ownerContactForm.name,
                        phone: ownerContactForm.phone || undefined,
                        email: ownerContactForm.email || undefined
                      });
                      if (result.success) {
                        showToast(`已设置责任人: ${ownerContactForm.name}`, 'success');
                        setApiKeys(prev => prev.map(k => 
                          k.id === ownerTarget.id 
                            ? { 
                                ...k, 
                                ownerName: ownerContactForm.name,
                                ownerPhone: ownerContactForm.phone || undefined,
                                ownerEmail: ownerContactForm.email || undefined
                              }
                            : k
                        ));
                        setShowOwnerModal(false);
                      } else {
                        showToast(result.error || '保存失败', 'error');
                      }
                    } finally {
                      setSavingOwner(false);
                    }
                  }}
                  disabled={savingOwner || !ownerContactForm.name || (!ownerContactForm.phone && !ownerContactForm.email)}
                >
                  {savingOwner ? (
                    <Icon icon="mdi:loading" width={16} className="animate-spin" />
                  ) : (
                    <Icon icon="mdi:check" width={16} />
                  )}
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
