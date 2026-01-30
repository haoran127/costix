/**
 * 图表数据服务
 * 获取用量和费用趋势数据
 */

import { supabase } from '../lib/supabase';

export interface UsageTrendData {
  date: string;
  tokens: number;
  cost: number;
}

/**
 * 获取用量趋势数据
 */
export async function getUsageTrendData(params: {
  period: 'day' | 'week' | 'month';
  days?: number;
  platform?: string;
}): Promise<UsageTrendData[]> {
  if (!supabase) return [];

  try {
    const { period, days = 30, platform } = params;
    
    // 计算开始日期
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 构建查询
    let query = supabase
      .from('llm_api_key_usage')
      .select(`
        period_start,
        token_usage_monthly,
        month_cost,
        llm_api_keys!inner(platform)
      `)
      .gte('period_start', startDate.toISOString())
      .lte('period_start', endDate.toISOString())
      .not('token_usage_monthly', 'is', null);

    // 如果指定了平台，添加过滤
    if (platform && platform !== 'all') {
      query = query.eq('llm_api_keys.platform', platform);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 按日期聚合数据
    const groupedData = new Map<string, { tokens: number; cost: number }>();

    data?.forEach((item: any) => {
      const date = new Date(item.period_start).toISOString().split('T')[0];
      const existing = groupedData.get(date) || { tokens: 0, cost: 0 };
      
      groupedData.set(date, {
        tokens: existing.tokens + (item.token_usage_monthly || 0),
        cost: existing.cost + (parseFloat(item.month_cost || '0') || 0),
      });
    });

    // 转换为数组并按日期排序
    const result: UsageTrendData[] = Array.from(groupedData.entries())
      .map(([date, values]) => ({
        date,
        tokens: values.tokens,
        cost: values.cost,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  } catch (err) {
    console.error('获取用量趋势数据失败:', err);
    return [];
  }
}

