import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { 
  getLLMApiKeys, 
  getLLMPlatformAccounts, 
  type LLMApiKey,
  type LLMPlatformAccount
} from '../services/api';
import { getUsageTrendData, type UsageTrendData } from '../services/charts';
import UsageChart from '../components/Charts/UsageChart';

interface DashboardProps {
  platform: string;
}

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// AI 平台配置
const AI_PLATFORMS: Record<string, { name: string; icon: string; color: string }> = {
  openai: { name: 'OpenAI', icon: 'simple-icons:openai', color: '#10a37f' },
  anthropic: { name: 'Claude', icon: 'simple-icons:anthropic', color: '#d97757' },
  openrouter: { name: 'OpenRouter', icon: 'mdi:routes', color: '#6366f1' },
  aliyun: { name: '通义千问', icon: 'simple-icons:alibabadotcom', color: '#ff6a00' },
  volcengine: { name: '火山引擎', icon: 'mdi:volcano', color: '#ff4d4f' },
  deepseek: { name: 'DeepSeek', icon: 'mdi:brain', color: '#0066ff' },
};

export default function Dashboard({ platform }: DashboardProps) {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<LLMApiKey[]>([]);
  const [platformAccounts, setPlatformAccounts] = useState<LLMPlatformAccount[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [usageTrendData, setUsageTrendData] = useState<UsageTrendData[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    loadData();
  }, [platform]);

  // 加载图表数据
  useEffect(() => {
    const loadChartData = async () => {
      setLoadingChart(true);
      try {
        const data = await getUsageTrendData({
          period: chartPeriod,
          days: chartPeriod === 'day' ? 30 : chartPeriod === 'week' ? 90 : 365,
          platform: platform === 'all' ? undefined : platform,
        });
        setUsageTrendData(data);
      } catch (error) {
        console.error('加载图表数据失败:', error);
      } finally {
        setLoadingChart(false);
      }
    };

    if (dataLoaded) {
      loadChartData();
    }
  }, [platform, chartPeriod, dataLoaded]);

  const loadData = async () => {
    try {
      const [keysData, accountsData] = await Promise.all([
        getLLMApiKeys({ platform: platform !== 'all' ? platform : undefined }),
        getLLMPlatformAccounts()
      ]);
      setKeys(keysData || []);
      setPlatformAccounts(accountsData || []);
      setDataLoaded(true);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  // 根据平台筛选数据
  const filteredKeys = platform === 'all' 
    ? keys 
    : keys.filter(k => k.platform === platform);

  // 统计数据
  const totalKeys = filteredKeys.length;
  const activeKeys = filteredKeys.filter(k => k.status === 'active').length;
  
  // 计算本月总消耗
  const totalUsageThisMonth = filteredKeys.reduce((sum, key) => {
    return sum + (key.usage_this_month_usd || 0);
  }, 0);

  // 计算本月 Tokens
  const monthlyTokens = filteredKeys.reduce((sum, key) => {
    return sum + (key.month_tokens || 0);
  }, 0);

  // 计算平台账号总余额
  const filteredAccounts = platform === 'all'
    ? platformAccounts.filter(a => a.status === 'active')
    : platformAccounts.filter(a => a.platform === platform && a.status === 'active');
  
  // 分别计算美元和人民币余额
  const { usdBalance, cnyBalance } = filteredAccounts.reduce((acc, account) => {
    const balance = account.total_balance || 0;
    // 火山引擎使用人民币，其他平台使用美元
    if (account.platform === 'volcengine') {
      acc.cnyBalance += balance;
    } else {
      acc.usdBalance += balance;
    }
    return acc;
  }, { usdBalance: 0, cnyBalance: 0 });

  // 按平台统计
  const keysByPlatform = filteredKeys.reduce((acc, key) => {
    acc[key.platform] = (acc[key.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 最近添加的 Key
  const recentKeys = [...filteredKeys]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-in">
      {/* 统计卡片 - 顺序：Monthly Usage、Monthly Tokens、Total Keys、Active Keys、Total Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title={t('dashboard.monthlyUsage')}
          value={`$${totalUsageThisMonth.toFixed(2)}`}
          icon="mdi:chart-line"
          color="orange"
        />
        <StatCard
          title={t('dashboard.monthlyTokens')}
          value={formatNumber(monthlyTokens)}
          icon="mdi:message-processing-outline"
          color="indigo"
        />
        <StatCard
          title={t('dashboard.totalKeys')}
          value={totalKeys}
          icon="mdi:key-chain"
          color="blue"
        />
        <StatCard
          title={t('dashboard.activeKeys')}
          value={activeKeys}
          icon="mdi:check-circle-outline"
          color="green"
        />
        {/* Account Balance - 分别显示美元和人民币 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* 美元余额（小字，灰色） */}
              {usdBalance > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">
                  ${usdBalance.toFixed(2)}
                </p>
              )}
              {/* 人民币余额（大字，橙色，突出显示） */}
              {cnyBalance > 0 ? (
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ¥{cnyBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              ) : usdBalance > 0 ? (
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  ${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              ) : (
                <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                  $0.00
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.totalBalance')}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 w-12 h-12 rounded-lg flex items-center justify-center">
              <Icon icon="mdi:wallet-outline" width={22} className="text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 用量趋势图 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('dashboard.usageTrend')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartPeriod('day')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartPeriod === 'day'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('dashboard.day')}
            </button>
            <button
              onClick={() => setChartPeriod('week')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartPeriod === 'week'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('dashboard.week')}
            </button>
            <button
              onClick={() => setChartPeriod('month')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartPeriod === 'month'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('dashboard.month')}
            </button>
          </div>
        </div>
        {loadingChart ? (
          <div className="flex items-center justify-center h-64">
            <Icon icon="mdi:loading" width={24} className="text-gray-400 animate-spin" />
          </div>
        ) : (
          <UsageChart 
            data={usageTrendData.map(item => ({
              date: item.date,
              tokens: item.tokens,
              cost: item.cost,
            }))}
            period={chartPeriod}
            showCost={true}
          />
        )}
      </div>

      {/* 平台分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{t('dashboard.platformDistribution')}</h3>
          <div className="space-y-3">
            {Object.entries(keysByPlatform).map(([platformKey, count]) => {
              const config = AI_PLATFORMS[platformKey];
              const percentage = totalKeys > 0 ? (count / totalKeys) * 100 : 0;
              return (
                <div key={platformKey} className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${config?.color}15` }}
                  >
                    <Icon 
                      icon={config?.icon || 'mdi:help-circle'} 
                      width={18} 
                      style={{ color: config?.color }} 
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{config?.name || platformKey}</span>
                      <span className="text-sm text-gray-500">{count} 个</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: config?.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {!dataLoaded ? (
              <div className="flex items-center justify-center py-8">
                <Icon icon="mdi:loading" width={24} className="text-gray-400 animate-spin" />
              </div>
            ) : Object.keys(keysByPlatform).length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <Icon icon="mdi:key-remove" width={40} className="mx-auto mb-2 opacity-50" />
                <p>{t('dashboard.noKeys')}</p>
              </div>
            )}
          </div>
        </div>

        {/* 最近添加 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{t('dashboard.recentKeys')}</h3>
          <div className="space-y-3">
            {!dataLoaded ? (
              <div className="flex items-center justify-center py-8">
                <Icon icon="mdi:loading" width={24} className="text-gray-400 animate-spin" />
              </div>
            ) : recentKeys.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <Icon icon="mdi:history" width={40} className="mx-auto mb-2 opacity-50" />
                <p>{t('common.noData')}</p>
              </div>
            ) : (
              recentKeys.map(key => {
                const config = AI_PLATFORMS[key.platform];
                return (
                  <div key={key.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${config?.color}15` }}
                    >
                      <Icon 
                        icon={config?.icon || 'mdi:help-circle'} 
                        width={18} 
                        style={{ color: config?.color }} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 truncate">{key.name}</div>
                      <div className="text-xs text-gray-400">
                        {key.api_key_prefix}...{key.api_key_suffix}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-0.5 rounded-full ${
                        key.status === 'active' 
                          ? 'bg-green-50 text-green-600' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {key.status === 'active' ? '正常' : key.status}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 统计卡片组件
function StatCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  icon: string; 
  color: 'blue' | 'green' | 'orange' | 'purple' | 'indigo' 
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-green-50 text-green-500',
    orange: 'bg-orange-50 text-orange-500',
    purple: 'bg-purple-50 text-purple-500',
    indigo: 'bg-indigo-50 text-indigo-500',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon icon={icon} width={24} />
        </div>
      </div>
    </div>
  );
}

