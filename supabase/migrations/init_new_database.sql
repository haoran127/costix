-- ============================================
-- Costix 数据库初始化脚本
-- 用于在新 Supabase 项目中创建所有表结构
-- ============================================

-- ============================================
-- 1. 用户 profiles 表（Supabase Auth 扩展）
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  full_name VARCHAR(255),
  avatar_url TEXT,
  
  -- 多租户支持
  tenant_id UUID,
  role VARCHAR(50) DEFAULT 'member',  -- admin, member, viewer
  
  -- 团队支持
  current_team_id UUID,
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 大模型 API Key 主表
-- ============================================
CREATE TABLE IF NOT EXISTS llm_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基础信息
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  
  -- API Key 存储（敏感信息）
  api_key_encrypted TEXT,
  api_key_prefix VARCHAR(20),
  api_key_suffix VARCHAR(10),
  
  -- 平台返回的 Key ID
  platform_key_id VARCHAR(100),
  platform_account_id UUID,
  
  -- 平台账号凭证
  organization_id VARCHAR(100),
  project_id VARCHAR(100),
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active',
  
  -- 业务信息
  business VARCHAR(255),
  description TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- 责任人联系信息（直接存储）
  owner_name VARCHAR(100),
  owner_phone VARCHAR(50),
  owner_email VARCHAR(255),
  
  -- 时间
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  
  -- 创建信息
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creation_method VARCHAR(20) DEFAULT 'manual',
  
  -- 多租户支持
  tenant_id UUID,
  
  -- 错误信息
  error_message TEXT,
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Key 用量统计表
-- ============================================
CREATE TABLE IF NOT EXISTS llm_api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  api_key_id UUID NOT NULL REFERENCES llm_api_keys(id) ON DELETE CASCADE,
  
  -- 账户余额（美元）
  balance DECIMAL(12, 4),
  credit_limit DECIMAL(12, 4),
  
  -- 消费统计（美元）
  total_usage DECIMAL(12, 4),
  monthly_usage DECIMAL(12, 4),
  daily_usage DECIMAL(12, 4),
  
  -- Token 用量统计
  token_usage_total BIGINT,
  token_usage_monthly BIGINT,
  token_usage_daily BIGINT,
  
  -- 按类型细分
  prompt_tokens_total BIGINT,
  completion_tokens_total BIGINT,
  
  -- 速率限制
  rate_limit_rpm INTEGER,
  rate_limit_tpm INTEGER,
  rate_limit_rpd INTEGER,
  
  -- 统计周期
  period_start DATE,
  period_end DATE,
  
  -- 原始数据
  raw_response JSONB,
  
  -- 同步信息
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status VARCHAR(20) DEFAULT 'success',
  sync_error TEXT,
  
  -- 多租户支持
  tenant_id UUID,
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. Key 责任人绑定表
-- ============================================
CREATE TABLE IF NOT EXISTS llm_api_key_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  api_key_id UUID NOT NULL REFERENCES llm_api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role VARCHAR(20) DEFAULT 'owner',
  is_primary BOOLEAN DEFAULT false,
  
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(api_key_id, user_id)
);

-- ============================================
-- 5. Key 操作日志表
-- ============================================
CREATE TABLE IF NOT EXISTS llm_api_key_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  api_key_id UUID NOT NULL REFERENCES llm_api_keys(id) ON DELETE CASCADE,
  
  action VARCHAR(50) NOT NULL,
  action_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  old_values JSONB,
  new_values JSONB,
  
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  tenant_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. 平台账号表
-- ============================================
CREATE TABLE IF NOT EXISTS llm_platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  
  admin_api_key_encrypted TEXT,
  admin_api_key_prefix VARCHAR(20),
  organization_id VARCHAR(100),
  project_id VARCHAR(100),
  
  -- OAuth 相关
  oauth_client_id VARCHAR(255),
  oauth_client_secret_encrypted TEXT,
  oauth_refresh_token_encrypted TEXT,
  oauth_access_token_encrypted TEXT,
  oauth_expires_at TIMESTAMPTZ,
  
  status VARCHAR(20) DEFAULT 'active',
  last_verified_at TIMESTAMPTZ,
  error_message TEXT,
  
  keys_count INTEGER DEFAULT 0,
  total_balance DECIMAL(12, 4),
  total_monthly_tokens BIGINT DEFAULT 0,  -- 月度 Token 使用量统计（缓存）
  
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. 同步任务表
-- ============================================
CREATE TABLE IF NOT EXISTS llm_sync_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  task_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id UUID,
  platform VARCHAR(50),
  
  schedule_type VARCHAR(20) DEFAULT 'manual',
  cron_expression VARCHAR(50),
  next_run_at TIMESTAMPTZ,
  
  status VARCHAR(20) DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. 团队表
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  settings JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. 团队成员表
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  
  role VARCHAR(20) DEFAULT 'member',
  status VARCHAR(20) DEFAULT 'invited',
  
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_id, email)
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_platform ON llm_api_keys(platform);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_status ON llm_api_keys(status);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_created_by ON llm_api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_expires_at ON llm_api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_tenant ON llm_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_owner_email ON llm_api_keys(owner_email);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_owner_phone ON llm_api_keys(owner_phone);
CREATE UNIQUE INDEX IF NOT EXISTS llm_api_keys_platform_key_unique 
  ON llm_api_keys (platform, platform_key_id) 
  WHERE platform_key_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_llm_api_key_usage_key_id ON llm_api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_usage_synced_at ON llm_api_key_usage(synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_api_key_owners_key_id ON llm_api_key_owners(api_key_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_owners_user_id ON llm_api_key_owners(user_id);

CREATE INDEX IF NOT EXISTS idx_llm_api_key_logs_key_id ON llm_api_key_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_logs_action ON llm_api_key_logs(action);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_logs_created_at ON llm_api_key_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_platform_accounts_platform ON llm_platform_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_llm_platform_accounts_owner ON llm_platform_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_llm_platform_accounts_tenant ON llm_platform_accounts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_llm_sync_tasks_status ON llm_sync_tasks(status);
CREATE INDEX IF NOT EXISTS idx_llm_sync_tasks_next_run ON llm_sync_tasks(next_run_at);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- ============================================
-- 视图
-- ============================================
CREATE OR REPLACE VIEW llm_api_key_latest_usage AS
SELECT DISTINCT ON (api_key_id) *
FROM llm_api_key_usage
ORDER BY api_key_id, synced_at DESC;

-- ============================================
-- 函数和触发器
-- ============================================

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_llm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 新用户自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 新用户自动创建团队
CREATE OR REPLACE FUNCTION create_team_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- 创建个人团队
  INSERT INTO teams (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || ' 的团队', NEW.id)
  RETURNING id INTO new_team_id;
  
  -- 添加为团队 owner
  INSERT INTO team_members (team_id, user_id, email, name, role, status, joined_at)
  VALUES (
    new_team_id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'owner',
    'active',
    NOW()
  );
  
  -- 更新 profile 的当前团队
  UPDATE profiles SET current_team_id = new_team_id WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取 tenant_id（在 public schema 中）
CREATE OR REPLACE FUNCTION public.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 自动设置 tenant_id
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 邀请成员
CREATE OR REPLACE FUNCTION invite_team_member(
  p_team_id UUID,
  p_email VARCHAR,
  p_name VARCHAR DEFAULT NULL,
  p_role VARCHAR DEFAULT 'member'
)
RETURNS JSONB AS $$
DECLARE
  v_existing_user UUID;
  v_member_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', '该邮箱已在团队中');
  END IF;
  
  SELECT id INTO v_existing_user FROM auth.users WHERE email = p_email;
  
  INSERT INTO team_members (team_id, user_id, email, name, role, status, invited_by)
  VALUES (
    p_team_id,
    v_existing_user,
    p_email,
    p_name,
    p_role,
    CASE WHEN v_existing_user IS NOT NULL THEN 'active' ELSE 'invited' END,
    auth.uid()
  )
  RETURNING id INTO v_member_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'status', CASE WHEN v_existing_user IS NOT NULL THEN 'active' ELSE 'invited' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取团队成员
CREATE OR REPLACE FUNCTION get_my_team_members()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  name VARCHAR,
  role VARCHAR,
  status VARCHAR,
  user_id UUID,
  avatar_url TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ
) AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT current_team_id INTO v_team_id FROM profiles WHERE id = auth.uid();
  
  IF v_team_id IS NULL THEN
    SELECT tm.team_id INTO v_team_id 
    FROM team_members tm 
    WHERE tm.user_id = auth.uid() 
    LIMIT 1;
  END IF;
  
  RETURN QUERY
  SELECT 
    tm.id,
    tm.email,
    tm.name,
    tm.role,
    tm.status,
    tm.user_id,
    p.avatar_url,
    tm.invited_at,
    tm.joined_at
  FROM team_members tm
  LEFT JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = v_team_id
  ORDER BY 
    CASE tm.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'member' THEN 3 
      ELSE 4 
    END,
    tm.joined_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 触发器
-- ============================================
DROP TRIGGER IF EXISTS trigger_llm_api_keys_updated_at ON llm_api_keys;
CREATE TRIGGER trigger_llm_api_keys_updated_at
  BEFORE UPDATE ON llm_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_llm_updated_at();

DROP TRIGGER IF EXISTS trigger_llm_api_key_owners_updated_at ON llm_api_key_owners;
CREATE TRIGGER trigger_llm_api_key_owners_updated_at
  BEFORE UPDATE ON llm_api_key_owners
  FOR EACH ROW EXECUTE FUNCTION update_llm_updated_at();

DROP TRIGGER IF EXISTS trigger_llm_platform_accounts_updated_at ON llm_platform_accounts;
CREATE TRIGGER trigger_llm_platform_accounts_updated_at
  BEFORE UPDATE ON llm_platform_accounts
  FOR EACH ROW EXECUTE FUNCTION update_llm_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_team ON auth.users;
CREATE TRIGGER on_auth_user_created_team
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_team_for_new_user();

DROP TRIGGER IF EXISTS trigger_set_tenant_id_api_keys ON llm_api_keys;
CREATE TRIGGER trigger_set_tenant_id_api_keys
  BEFORE INSERT ON llm_api_keys
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

DROP TRIGGER IF EXISTS trigger_set_tenant_id_accounts ON llm_platform_accounts;
CREATE TRIGGER trigger_set_tenant_id_accounts
  BEFORE INSERT ON llm_platform_accounts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_api_key_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_api_key_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_sync_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 策略
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Tenant members can view each other" ON profiles;
CREATE POLICY "Tenant members can view each other" ON profiles
  FOR SELECT USING (
    tenant_id IS NOT NULL AND tenant_id = public.tenant_id()
  );

-- llm_api_keys
DROP POLICY IF EXISTS "Tenant members can view keys" ON llm_api_keys;
CREATE POLICY "Tenant members can view keys" ON llm_api_keys
  FOR SELECT USING (
    tenant_id = public.tenant_id()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Authenticated users can create keys" ON llm_api_keys;
CREATE POLICY "Authenticated users can create keys" ON llm_api_keys
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Tenant members can update keys" ON llm_api_keys;
CREATE POLICY "Tenant members can update keys" ON llm_api_keys
  FOR UPDATE USING (
    tenant_id = public.tenant_id()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Creators and admins can delete keys" ON llm_api_keys;
CREATE POLICY "Creators and admins can delete keys" ON llm_api_keys
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND tenant_id = llm_api_keys.tenant_id
    )
  );

-- llm_platform_accounts
DROP POLICY IF EXISTS "Tenant members can view accounts" ON llm_platform_accounts;
CREATE POLICY "Tenant members can view accounts" ON llm_platform_accounts
  FOR SELECT USING (tenant_id = public.tenant_id());

DROP POLICY IF EXISTS "Only admins can manage accounts" ON llm_platform_accounts;
CREATE POLICY "Only admins can manage accounts" ON llm_platform_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND tenant_id = llm_platform_accounts.tenant_id
    )
  );

-- llm_api_key_usage
DROP POLICY IF EXISTS "Users can view usage of accessible keys" ON llm_api_key_usage;
CREATE POLICY "Users can view usage of accessible keys" ON llm_api_key_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_usage.api_key_id
      AND (tenant_id = public.tenant_id() OR created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Service can insert usage" ON llm_api_key_usage;
CREATE POLICY "Service can insert usage" ON llm_api_key_usage
  FOR INSERT WITH CHECK (true);

-- llm_api_key_logs
DROP POLICY IF EXISTS "Tenant members can view logs" ON llm_api_key_logs;
CREATE POLICY "Tenant members can view logs" ON llm_api_key_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_logs.api_key_id
      AND (tenant_id = public.tenant_id() OR created_by = auth.uid())
    )
  );

-- llm_api_key_owners
DROP POLICY IF EXISTS "Tenant members can view owners" ON llm_api_key_owners;
CREATE POLICY "Tenant members can view owners" ON llm_api_key_owners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_owners.api_key_id
      AND (tenant_id = public.tenant_id() OR created_by = auth.uid())
    )
  );

-- teams
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
CREATE POLICY "Users can view their teams" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Team owners can update" ON teams;
CREATE POLICY "Team owners can update" ON teams
  FOR UPDATE USING (owner_id = auth.uid());

-- team_members
DROP POLICY IF EXISTS "Team members can view members" ON team_members;
CREATE POLICY "Team members can view members" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage members" ON team_members;
CREATE POLICY "Admins can manage members" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Costix 数据库初始化完成！';
  RAISE NOTICE '';
  RAISE NOTICE '📋 已创建的表:';
  RAISE NOTICE '  - profiles (用户信息)';
  RAISE NOTICE '  - llm_api_keys (API 密钥)';
  RAISE NOTICE '  - llm_api_key_usage (用量统计)';
  RAISE NOTICE '  - llm_api_key_owners (责任人绑定)';
  RAISE NOTICE '  - llm_api_key_logs (操作日志)';
  RAISE NOTICE '  - llm_platform_accounts (平台账号)';
  RAISE NOTICE '  - llm_sync_tasks (同步任务)';
  RAISE NOTICE '  - teams (团队)';
  RAISE NOTICE '  - team_members (团队成员)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 RLS (Row Level Security) 已启用';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ 自动触发器:';
  RAISE NOTICE '  - 新用户注册时自动创建 profile';
  RAISE NOTICE '  - 新用户注册时自动创建个人团队';
  RAISE NOTICE '  - 自动设置 tenant_id';
END $$;

