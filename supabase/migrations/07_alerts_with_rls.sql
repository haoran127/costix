-- ============================================
-- 告警系统表结构 + RLS 策略
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================

-- ============================================
-- 1. 告警配置表
-- ============================================
CREATE TABLE IF NOT EXISTS llm_alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  
  -- 告警类型
  alert_type VARCHAR(50) NOT NULL, -- 'key_expiring', 'low_balance', 'high_usage', 'key_error'
  
  -- 配置项
  enabled BOOLEAN DEFAULT true,
  threshold_value NUMERIC(12, 4), -- 阈值（余额、用量等）
  threshold_days INTEGER, -- 阈值天数（过期提醒）
  
  -- 通知渠道
  notify_in_app BOOLEAN DEFAULT true, -- 页面内通知
  notify_email BOOLEAN DEFAULT false, -- 邮件通知
  notify_webhook BOOLEAN DEFAULT false, -- Webhook 通知
  webhook_url TEXT, -- Webhook URL
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一约束：每个租户每种告警类型只能有一个配置
  UNIQUE(tenant_id, alert_type)
);

COMMENT ON TABLE llm_alert_configs IS '告警配置表，存储告警规则和通知设置';

-- ============================================
-- 2. 告警记录表
-- ============================================
CREATE TABLE IF NOT EXISTS llm_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  
  -- 告警信息
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning', -- 'info', 'warning', 'error'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- 关联对象
  api_key_id UUID REFERENCES llm_api_keys(id) ON DELETE CASCADE,
  platform_account_id UUID REFERENCES llm_platform_accounts(id) ON DELETE CASCADE,
  
  -- 告警数据（用于显示详情）
  alert_data JSONB, -- 存储额外的告警数据，如余额值、过期日期等
  
  -- 状态
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE llm_alerts IS '告警记录表，存储所有生成的告警';

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_llm_alerts_tenant_id ON llm_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_llm_alerts_alert_type ON llm_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_llm_alerts_api_key_id ON llm_alerts(api_key_id);
CREATE INDEX IF NOT EXISTS idx_llm_alerts_is_read ON llm_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_llm_alerts_created_at ON llm_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_alert_configs_tenant_id ON llm_alert_configs(tenant_id);

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE llm_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_alert_configs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- llm_alerts RLS 策略
-- ============================================
DROP POLICY IF EXISTS "Users can view their own alerts" ON llm_alerts;
CREATE POLICY "Users can view their own alerts" ON llm_alerts
  FOR SELECT USING (
    tenant_id IS NULL 
    OR tenant_id = public.tenant_id()
  );

DROP POLICY IF EXISTS "Users can insert alerts" ON llm_alerts;
CREATE POLICY "Users can insert alerts" ON llm_alerts
  FOR INSERT WITH CHECK (
    tenant_id IS NULL 
    OR tenant_id = public.tenant_id()
  );

DROP POLICY IF EXISTS "Users can update their own alerts" ON llm_alerts;
CREATE POLICY "Users can update their own alerts" ON llm_alerts
  FOR UPDATE USING (
    tenant_id IS NULL 
    OR tenant_id = public.tenant_id()
  );

DROP POLICY IF EXISTS "Users can delete their own alerts" ON llm_alerts;
CREATE POLICY "Users can delete their own alerts" ON llm_alerts
  FOR DELETE USING (
    tenant_id IS NULL 
    OR tenant_id = public.tenant_id()
  );

-- ============================================
-- llm_alert_configs RLS 策略
-- ============================================
DROP POLICY IF EXISTS "Users can view their own alert configs" ON llm_alert_configs;
CREATE POLICY "Users can view their own alert configs" ON llm_alert_configs
  FOR SELECT USING (
    tenant_id IS NULL 
    OR tenant_id = public.tenant_id()
  );

DROP POLICY IF EXISTS "Users can insert alert configs" ON llm_alert_configs;
CREATE POLICY "Users can insert alert configs" ON llm_alert_configs
  FOR INSERT WITH CHECK (
    tenant_id IS NULL 
    OR tenant_id = public.tenant_id()
  );

DROP POLICY IF EXISTS "Users can update their own alert configs" ON llm_alert_configs;
CREATE POLICY "Users can update their own alert configs" ON llm_alert_configs
  FOR UPDATE USING (
    tenant_id IS NULL 
    OR tenant_id = public.tenant_id()
  );

DROP POLICY IF EXISTS "Users can delete their own alert configs" ON llm_alert_configs;
CREATE POLICY "Users can delete their own alert configs" ON llm_alert_configs
  FOR DELETE USING (
    tenant_id IS NULL 
    OR tenant_id = public.tenant_id()
  );

-- ============================================
-- 触发器：自动设置 updated_at
-- ============================================
DROP TRIGGER IF EXISTS trigger_llm_alerts_updated_at ON llm_alerts;
CREATE TRIGGER trigger_llm_alerts_updated_at
  BEFORE UPDATE ON llm_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_updated_at();

DROP TRIGGER IF EXISTS trigger_llm_alert_configs_updated_at ON llm_alert_configs;
CREATE TRIGGER trigger_llm_alert_configs_updated_at
  BEFORE UPDATE ON llm_alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_updated_at();

-- ============================================
-- 完成
-- ============================================
SELECT 'Alerts tables created successfully!' as result;

