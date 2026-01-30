/**
 * 告警检测 API
 * 调用数据库函数检查并生成告警
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../_lib/auth.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 验证用户身份
    const userInfo = await getUserFromRequest(req);
    if (!userInfo) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('[alerts/check-alerts] 开始检查告警，用户:', userInfo.userId);

    // 调用数据库函数检查并生成告警
    const { data, error } = await supabaseAdmin.rpc('check_and_create_alerts');

    if (error) {
      console.error('[alerts/check-alerts] 检查告警失败:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || '检查告警失败' 
      });
    }

    console.log('[alerts/check-alerts] 告警检查完成');

    return res.status(200).json({
      success: true,
      message: '告警检查完成'
    });
  } catch (error) {
    console.error('[alerts/check-alerts] 错误:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误'
    });
  }
}

