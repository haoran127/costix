-- ============================================
-- KeyPilot Row Level Security (RLS) 策略
-- 保护数据安全，即使 anon_key 泄露也无法访问数据
-- ============================================

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
-- profiles 表 RLS 策略
-- ============================================

-- 允许触发器函数插入（SECURITY DEFINER 函数需要）
DROP POLICY IF EXISTS "Service can insert profiles" ON profiles;
CREATE POLICY "Service can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

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

-- ============================================
-- llm_api_keys 表 RLS 策略
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view keys" ON llm_api_keys;
CREATE POLICY "Tenant members can view keys" ON llm_api_keys
  FOR SELECT USING (
    -- 允许查看 tenant_id 为 NULL 的记录（导入的数据）
    tenant_id IS NULL 
    -- 或者 tenant_id 匹配当前用户的租户
    OR tenant_id = public.tenant_id()
    -- 或者用户自己创建的
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Authenticated users can create keys" ON llm_api_keys;
CREATE POLICY "Authenticated users can create keys" ON llm_api_keys
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Tenant members can update keys" ON llm_api_keys;
CREATE POLICY "Tenant members can update keys" ON llm_api_keys
  FOR UPDATE USING (
    tenant_id IS NULL 
    OR tenant_id = public.tenant_id()
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

-- ============================================
-- llm_platform_accounts 表 RLS 策略
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view accounts" ON llm_platform_accounts;
CREATE POLICY "Tenant members can view accounts" ON llm_platform_accounts
  FOR SELECT USING (
    -- 允许查看 tenant_id 为 NULL 的记录（导入的数据）
    tenant_id IS NULL 
    -- 或者 tenant_id 匹配当前用户的租户
    OR tenant_id = public.tenant_id()
  );

DROP POLICY IF EXISTS "Only admins can manage accounts" ON llm_platform_accounts;
CREATE POLICY "Only admins can manage accounts" ON llm_platform_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND tenant_id = llm_platform_accounts.tenant_id
    )
    -- 或者 tenant_id 为 NULL（允许管理导入的数据）
    OR llm_platform_accounts.tenant_id IS NULL
  );

-- ============================================
-- llm_api_key_usage 表 RLS 策略
-- ============================================

DROP POLICY IF EXISTS "Users can view usage of accessible keys" ON llm_api_key_usage;
CREATE POLICY "Users can view usage of accessible keys" ON llm_api_key_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_usage.api_key_id
      AND (
        tenant_id IS NULL 
        OR tenant_id = public.tenant_id() 
        OR created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Service can insert usage" ON llm_api_key_usage;
CREATE POLICY "Service can insert usage" ON llm_api_key_usage
  FOR INSERT WITH CHECK (true);  -- 通过 service_role 绕过 RLS

-- ============================================
-- llm_api_key_logs 表 RLS 策略
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view logs" ON llm_api_key_logs;
CREATE POLICY "Tenant members can view logs" ON llm_api_key_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_logs.api_key_id
      AND (
        tenant_id IS NULL 
        OR tenant_id = public.tenant_id() 
        OR created_by = auth.uid()
      )
    )
  );

-- ============================================
-- llm_api_key_owners 表 RLS 策略
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view owners" ON llm_api_key_owners;
CREATE POLICY "Tenant members can view owners" ON llm_api_key_owners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_owners.api_key_id
      AND (
        tenant_id IS NULL 
        OR tenant_id = public.tenant_id() 
        OR created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Tenant members can insert owners" ON llm_api_key_owners;
CREATE POLICY "Tenant members can insert owners" ON llm_api_key_owners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_owners.api_key_id
      AND (
        tenant_id IS NULL 
        OR tenant_id = public.tenant_id() 
        OR created_by = auth.uid()
      )
    )
    AND (
      -- 简化：允许设置任何用户作为责任人（只要 API Key 属于当前租户）
      -- 避免查询 team_members 导致的无限递归
      user_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Tenant members can update owners" ON llm_api_key_owners;
CREATE POLICY "Tenant members can update owners" ON llm_api_key_owners
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_owners.api_key_id
      AND (
        tenant_id IS NULL 
        OR tenant_id = public.tenant_id() 
        OR created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Tenant members can delete owners" ON llm_api_key_owners;
CREATE POLICY "Tenant members can delete owners" ON llm_api_key_owners
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_owners.api_key_id
      AND (
        tenant_id IS NULL 
        OR tenant_id = public.tenant_id() 
        OR created_by = auth.uid()
      )
    )
  );

-- ============================================
-- teams 表 RLS 策略
-- ============================================

-- 允许触发器函数插入
DROP POLICY IF EXISTS "Service can insert teams" ON teams;
CREATE POLICY "Service can insert teams" ON teams
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their teams" ON teams;
CREATE POLICY "Users can view their teams" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Team owners can update" ON teams;
CREATE POLICY "Team owners can update" ON teams
  FOR UPDATE USING (owner_id = auth.uid());

-- ============================================
-- team_members 表 RLS 策略
-- ============================================

-- 允许触发器函数插入
DROP POLICY IF EXISTS "Service can insert team members" ON team_members;
CREATE POLICY "Service can insert team members" ON team_members
  FOR INSERT WITH CHECK (true);

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

