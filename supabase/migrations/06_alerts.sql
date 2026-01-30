-- ============================================
-- 告警系统表结构
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
COMMENT ON COLUMN llm_alert_configs.alert_type IS '告警类型：key_expiring（Key即将过期）、low_balance（余额不足）、high_usage（用量超标）、key_error（Key异常）';

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
COMMENT ON COLUMN llm_alerts.alert_type IS '告警类型：key_expiring（Key即将过期）、low_balance（余额不足）、high_usage（用量超标）、key_error（Key异常）';
COMMENT ON COLUMN llm_alerts.severity IS '严重程度：info（信息）、warning（警告）、error（错误）';
COMMENT ON COLUMN llm_alerts.alert_data IS '告警数据JSON，存储如余额值、过期日期、用量值等额外信息';

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
-- 触发器：自动设置 updated_at
-- ============================================
CREATE TRIGGER trigger_llm_alerts_updated_at
  BEFORE UPDATE ON llm_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_updated_at();

CREATE TRIGGER trigger_llm_alert_configs_updated_at
  BEFORE UPDATE ON llm_alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_updated_at();

-- ============================================
-- 函数：检查并生成告警
-- ============================================
CREATE OR REPLACE FUNCTION check_and_create_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant RECORD;
  v_config RECORD;
  v_key RECORD;
  v_account RECORD;
  v_usage RECORD;
  v_alert_id UUID;
  v_days_until_expiry INTEGER;
BEGIN
  -- 遍历所有租户
  FOR v_tenant IN SELECT DISTINCT tenant_id FROM llm_api_keys WHERE tenant_id IS NOT NULL
  LOOP
    -- 1. 检查 Key 即将过期告警
    FOR v_config IN 
      SELECT * FROM llm_alert_configs 
      WHERE tenant_id = v_tenant.tenant_id 
        AND alert_type = 'key_expiring' 
        AND enabled = true
    LOOP
      FOR v_key IN
        SELECT k.*, 
               CASE 
                 WHEN k.expires_at IS NOT NULL THEN 
                   EXTRACT(DAY FROM (k.expires_at - NOW()))
                 ELSE NULL
               END as days_until_expiry
        FROM llm_api_keys k
        WHERE k.tenant_id = v_tenant.tenant_id
          AND k.status = 'active'
          AND k.expires_at IS NOT NULL
          AND k.expires_at > NOW()
          AND EXTRACT(DAY FROM (k.expires_at - NOW())) <= COALESCE(v_config.threshold_days, 7)
          AND NOT EXISTS (
            SELECT 1 FROM llm_alerts a
            WHERE a.api_key_id = k.id
              AND a.alert_type = 'key_expiring'
              AND a.is_resolved = false
              AND a.created_at > NOW() - INTERVAL '1 day'
          )
      LOOP
        INSERT INTO llm_alerts (
          tenant_id, alert_type, severity, title, message,
          api_key_id, alert_data, created_at
        ) VALUES (
          v_tenant.tenant_id,
          'key_expiring',
          CASE 
            WHEN v_key.days_until_expiry <= 1 THEN 'error'
            WHEN v_key.days_until_expiry <= 3 THEN 'warning'
            ELSE 'info'
          END,
          'API Key 即将过期',
          format('API Key "%s" 将在 %s 天后过期（%s）', 
            v_key.name, 
            v_key.days_until_expiry,
            to_char(v_key.expires_at, 'YYYY-MM-DD HH24:MI:SS')
          ),
          v_key.id,
          jsonb_build_object(
            'key_name', v_key.name,
            'expires_at', v_key.expires_at,
            'days_until_expiry', v_key.days_until_expiry
          ),
          NOW()
        );
      END LOOP;
    END LOOP;

    -- 2. 检查余额不足告警
    FOR v_config IN 
      SELECT * FROM llm_alert_configs 
      WHERE tenant_id = v_tenant.tenant_id 
        AND alert_type = 'low_balance' 
        AND enabled = true
    LOOP
      FOR v_account IN
        SELECT a.*
        FROM llm_platform_accounts a
        WHERE a.tenant_id = v_tenant.tenant_id
          AND a.status = 'active'
          AND a.total_balance IS NOT NULL
          AND a.total_balance <= COALESCE(v_config.threshold_value, 100)
          AND NOT EXISTS (
            SELECT 1 FROM llm_alerts al
            WHERE al.platform_account_id = a.id
              AND al.alert_type = 'low_balance'
              AND al.is_resolved = false
              AND al.created_at > NOW() - INTERVAL '1 day'
          )
      LOOP
        INSERT INTO llm_alerts (
          tenant_id, alert_type, severity, title, message,
          platform_account_id, alert_data, created_at
        ) VALUES (
          v_tenant.tenant_id,
          'low_balance',
          CASE 
            WHEN v_account.total_balance <= COALESCE(v_config.threshold_value, 100) * 0.1 THEN 'error'
            WHEN v_account.total_balance <= COALESCE(v_config.threshold_value, 100) * 0.3 THEN 'warning'
            ELSE 'info'
          END,
          '账户余额不足',
          format('平台账号 "%s" (%s) 余额为 %s，低于阈值 %s', 
            v_account.name,
            v_account.platform,
            CASE 
              WHEN v_account.platform = 'volcengine' THEN format('¥%.2f', v_account.total_balance)
              ELSE format('$%.2f', v_account.total_balance)
            END,
            CASE 
              WHEN v_account.platform = 'volcengine' THEN format('¥%.2f', COALESCE(v_config.threshold_value, 100))
              ELSE format('$%.2f', COALESCE(v_config.threshold_value, 100))
            END
          ),
          v_account.id,
          jsonb_build_object(
            'account_name', v_account.name,
            'platform', v_account.platform,
            'balance', v_account.total_balance,
            'threshold', v_config.threshold_value
          ),
          NOW()
        );
      END LOOP;
    END LOOP;

    -- 3. 检查 Key 异常状态告警
    FOR v_key IN
      SELECT k.*
      FROM llm_api_keys k
      WHERE k.tenant_id = v_tenant.tenant_id
        AND k.status IN ('error', 'disabled', 'expired')
        AND NOT EXISTS (
          SELECT 1 FROM llm_alerts a
          WHERE a.api_key_id = k.id
            AND a.alert_type = 'key_error'
            AND a.is_resolved = false
            AND a.created_at > NOW() - INTERVAL '1 day'
        )
    LOOP
      INSERT INTO llm_alerts (
        tenant_id, alert_type, severity, title, message,
        api_key_id, alert_data, created_at
      ) VALUES (
        v_tenant.tenant_id,
        'key_error',
        'error',
        'API Key 状态异常',
        format('API Key "%s" 状态为：%s', v_key.name, v_key.status),
        v_key.id,
        jsonb_build_object(
          'key_name', v_key.name,
          'status', v_key.status,
          'platform', v_key.platform
        ),
        NOW()
      );
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION check_and_create_alerts IS '检查并生成告警的函数，检查 Key 过期、余额不足、Key 异常等条件';

