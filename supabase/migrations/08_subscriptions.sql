-- ============================================
-- KeyPilot 订阅系统表结构
-- ============================================

-- ============================================
-- 1. 订阅计划表
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,      -- free, pro, team, enterprise
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- 价格
  price_monthly DECIMAL(10, 2) DEFAULT 0,
  price_yearly DECIMAL(10, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'CNY',
  
  -- 限制
  max_keys INTEGER DEFAULT 1,             -- 最大 Key 数量
  max_team_members INTEGER DEFAULT 1,     -- 最大团队成员数
  max_platform_accounts INTEGER DEFAULT 1,-- 最大平台账号数
  
  -- 功能开关
  features JSONB DEFAULT '{
    "export": false,
    "batch_operations": false,
    "alerts": false,
    "api_access": false,
    "priority_support": false,
    "custom_branding": false
  }'::jsonb,
  
  -- 排序和状态
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,       -- 是否推荐
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE subscription_plans IS '订阅计划表';

-- ============================================
-- 2. 用户订阅表
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- 订阅状态
  status VARCHAR(20) DEFAULT 'active',    -- active, trialing, cancelled, expired, past_due
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
  
  -- 订阅周期
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- 支付信息
  payment_provider VARCHAR(50),           -- lemonsqueezy, paddle, stripe, alipay
  payment_customer_id VARCHAR(255),       -- 支付平台客户 ID
  payment_subscription_id VARCHAR(255),   -- 支付平台订阅 ID
  
  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 每个用户只能有一个活跃订阅
  UNIQUE(user_id)
);

COMMENT ON TABLE user_subscriptions IS '用户订阅表';

-- ============================================
-- 3. 支付记录表
-- ============================================
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 支付信息
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CNY',
  status VARCHAR(20) DEFAULT 'pending',   -- pending, succeeded, failed, refunded
  
  -- 支付方式
  payment_provider VARCHAR(50),
  payment_intent_id VARCHAR(255),
  payment_method VARCHAR(50),             -- card, alipay, wechat
  
  -- 发票信息
  invoice_id VARCHAR(255),
  invoice_url TEXT,
  receipt_url TEXT,
  
  -- 描述
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- 时间
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payment_records IS '支付记录表';

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_subscription_id ON payment_records(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 策略
-- ============================================

-- subscription_plans: 所有人可读
CREATE POLICY "Anyone can view plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- user_subscriptions: 用户只能看自己的订阅
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own subscription" ON user_subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- 系统可以创建订阅（通过 service role 或触发器）
CREATE POLICY "Service can manage subscriptions" ON user_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- payment_records: 用户只能看自己的支付记录
CREATE POLICY "Users can view own payments" ON payment_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can manage payments" ON payment_records
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 初始化订阅计划数据
-- ============================================
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, currency, max_keys, max_team_members, max_platform_accounts, features, sort_order, is_active, is_popular) VALUES
(
  'free',
  'Free',
  'Perfect for trying out',
  0,
  0,
  'USD',
  1,      -- 1 Key
  1,      -- 1 member
  1,      -- 1 platform account
  '{
    "export": false,
    "batch_operations": false,
    "alerts": false,
    "api_access": false,
    "priority_support": false,
    "custom_branding": false
  }'::jsonb,
  1,
  true,
  false
),
(
  'pro',
  'Pro',
  'For developers and small teams',
  9,
  90,     -- ~17% off yearly
  'USD',
  50,     -- 50 Keys
  5,      -- 5 members
  5,      -- 5 platform accounts
  '{
    "export": true,
    "batch_operations": true,
    "alerts": true,
    "api_access": true,
    "priority_support": false,
    "custom_branding": false
  }'::jsonb,
  2,
  true,
  true    -- Popular
),
(
  'team',
  'Team',
  'For growing teams',
  49,
  490,    -- ~17% off yearly
  'USD',
  200,    -- 200 Keys
  20,     -- 20 members
  20,     -- 20 platform accounts
  '{
    "export": true,
    "batch_operations": true,
    "alerts": true,
    "api_access": true,
    "priority_support": true,
    "custom_branding": false
  }'::jsonb,
  3,
  true,
  false
),
(
  'enterprise',
  'Enterprise',
  'For large organizations',
  0,      -- Contact sales
  0,
  'USD',
  -1,     -- Unlimited
  -1,     -- Unlimited
  -1,     -- Unlimited
  '{
    "export": true,
    "batch_operations": true,
    "alerts": true,
    "api_access": true,
    "priority_support": true,
    "custom_branding": true
  }'::jsonb,
  4,
  true,
  false
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_keys = EXCLUDED.max_keys,
  max_team_members = EXCLUDED.max_team_members,
  max_platform_accounts = EXCLUDED.max_platform_accounts,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  is_popular = EXCLUDED.is_popular,
  updated_at = NOW();

-- ============================================
-- 函数：获取用户当前订阅计划
-- ============================================
CREATE OR REPLACE FUNCTION get_user_subscription()
RETURNS TABLE (
  subscription_id UUID,
  plan_name VARCHAR,
  plan_display_name VARCHAR,
  status VARCHAR,
  max_keys INTEGER,
  max_team_members INTEGER,
  max_platform_accounts INTEGER,
  features JSONB,
  current_period_end TIMESTAMPTZ,
  is_trial BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id as subscription_id,
    sp.name as plan_name,
    sp.display_name as plan_display_name,
    us.status,
    sp.max_keys,
    sp.max_team_members,
    sp.max_platform_accounts,
    sp.features,
    us.current_period_end,
    (us.status = 'trialing') as is_trial
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = auth.uid()
    AND us.status IN ('active', 'trialing')
  LIMIT 1;
  
  -- 如果没有订阅，返回免费计划
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::UUID as subscription_id,
      sp.name as plan_name,
      sp.display_name as plan_display_name,
      'active'::VARCHAR as status,
      sp.max_keys,
      sp.max_team_members,
      sp.max_platform_accounts,
      sp.features,
      NULL::TIMESTAMPTZ as current_period_end,
      false as is_trial
    FROM subscription_plans sp
    WHERE sp.name = 'free'
    LIMIT 1;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_user_subscription IS '获取当前用户的订阅计划信息';

-- ============================================
-- 函数：检查用户是否可以添加更多 Key
-- ============================================
CREATE OR REPLACE FUNCTION can_add_more_keys()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_keys INTEGER;
  v_current_keys INTEGER;
BEGIN
  -- 获取用户的 Key 限制
  SELECT COALESCE(
    (SELECT sp.max_keys 
     FROM user_subscriptions us 
     JOIN subscription_plans sp ON sp.id = us.plan_id 
     WHERE us.user_id = auth.uid() AND us.status IN ('active', 'trialing')),
    (SELECT max_keys FROM subscription_plans WHERE name = 'free')
  ) INTO v_max_keys;
  
  -- -1 表示无限制
  IF v_max_keys = -1 THEN
    RETURN true;
  END IF;
  
  -- 获取当前 Key 数量
  SELECT COUNT(*) INTO v_current_keys
  FROM llm_api_keys
  WHERE created_by = auth.uid() OR tenant_id = public.tenant_id();
  
  RETURN v_current_keys < v_max_keys;
END;
$$;

COMMENT ON FUNCTION can_add_more_keys IS '检查用户是否可以添加更多 API Key';

-- ============================================
-- 函数：检查用户是否有某个功能权限
-- ============================================
CREATE OR REPLACE FUNCTION has_feature(feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_features JSONB;
BEGIN
  -- 获取用户的功能列表
  SELECT COALESCE(
    (SELECT sp.features 
     FROM user_subscriptions us 
     JOIN subscription_plans sp ON sp.id = us.plan_id 
     WHERE us.user_id = auth.uid() AND us.status IN ('active', 'trialing')),
    (SELECT features FROM subscription_plans WHERE name = 'free')
  ) INTO v_features;
  
  RETURN COALESCE((v_features->>feature_name)::BOOLEAN, false);
END;
$$;

COMMENT ON FUNCTION has_feature IS '检查用户是否有某个功能的访问权限';

-- ============================================
-- 触发器：新用户自动创建免费订阅
-- ============================================
CREATE OR REPLACE FUNCTION create_free_subscription_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  -- 获取免费计划 ID
  SELECT id INTO v_free_plan_id FROM subscription_plans WHERE name = 'free';
  
  -- 创建免费订阅
  INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle)
  VALUES (NEW.id, v_free_plan_id, 'active', 'monthly')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 在 profiles 表上创建触发器（新用户注册时）
DROP TRIGGER IF EXISTS trigger_create_free_subscription ON profiles;
CREATE TRIGGER trigger_create_free_subscription
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription_for_new_user();

-- ============================================
-- 为现有用户创建免费订阅
-- ============================================
DO $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_free_plan_id FROM subscription_plans WHERE name = 'free';
  
  INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle)
  SELECT p.id, v_free_plan_id, 'active', 'monthly'
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id
  );
  
  RAISE NOTICE '已为现有用户创建免费订阅';
END $$;

-- ============================================
-- 完成
-- ============================================
SELECT '订阅系统表创建完成！' as result;

