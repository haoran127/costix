/**
 * Public Stats Service
 * Fetches marketing statistics from backend
 */

import { supabase } from '../lib/supabase';

export interface PublicStats {
  signups: number;
  total_developers: number;
  monthly_upgrades: number;
  pro_percentage: number;
}

// Cache stats to avoid excessive API calls
let cachedStats: PublicStats | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Get public statistics for marketing display
 */
export async function getPublicStats(): Promise<PublicStats> {
  // Return cached if fresh
  if (cachedStats && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedStats;
  }

  // Default fallback stats (in case API fails)
  const fallbackStats: PublicStats = {
    signups: 30000,
    total_developers: 80000,
    monthly_upgrades: 1200,
    pro_percentage: 67,
  };

  if (!supabase) {
    return fallbackStats;
  }

  try {
    const { data, error } = await supabase.rpc('get_public_stats');
    
    if (error) {
      console.warn('Failed to fetch public stats:', error);
      return fallbackStats;
    }

    cachedStats = data as PublicStats;
    cacheTime = Date.now();
    
    return cachedStats;
  } catch (err) {
    console.warn('Error fetching public stats:', err);
    return fallbackStats;
  }
}

