/**
 * 用量趋势图组件
 * 显示 Token 使用量的趋势
 */

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

export interface UsageDataPoint {
  date: string;
  tokens: number;
  cost?: number;
}

interface UsageChartProps {
  data: UsageDataPoint[];
  period: 'day' | 'week' | 'month';
  showCost?: boolean;
}

export default function UsageChart({ data, period, showCost = false }: UsageChartProps) {
  const { t } = useTranslation();

  // 格式化数据
  const chartData = useMemo(() => {
    return data.map(item => ({
      date: formatDate(item.date, period),
      tokens: item.tokens,
      cost: item.cost || 0,
      tokensFormatted: formatNumber(item.tokens),
      costFormatted: item.cost ? `$${item.cost.toFixed(2)}` : '$0.00',
    }));
  }, [data, period]);

  // 格式化日期
  function formatDate(dateString: string, period: 'day' | 'week' | 'month'): string {
    const date = new Date(dateString);
    if (period === 'day') {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    } else if (period === 'week') {
      return `W${getWeekNumber(date)}`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short' });
    }
  }

  // 获取周数
  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // 格式化数字
  function formatNumber(num: number): string {
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
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <p>{t('common.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => formatNumber(value)}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
          formatter={(value: number, name: string) => {
            if (name === 'tokens') {
              return [formatNumber(value), t('dashboard.monthlyTokens')];
            } else if (name === 'cost') {
              return [`$${value.toFixed(2)}`, t('dashboard.monthlyUsage')];
            }
            return [value, name];
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="tokens" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={{ r: 4 }}
          name={t('dashboard.monthlyTokens')}
        />
        {showCost && (
          <Line 
            type="monotone" 
            dataKey="cost" 
            stroke="#f59e0b" 
            strokeWidth={2}
            dot={{ r: 4 }}
            name={t('dashboard.monthlyUsage')}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

