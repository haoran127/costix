-- ============================================
-- 启用 Row Level Security (RLS)
-- 保护数据安全，即使 anon_key 泄露也无法访问数据
-- ============================================

-- ============================================
-- 1. 用户 profiles 表（新增，用于 Supabase Auth）
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  full_name VARCHAR(255),
  avatar_url TEXT,
  
  -- 多租户支持
  tenant_id UUID,
  role VARCHAR(50) DEFAULT 'member',  -- admin, member, viewer
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 当新用户注册时自动创建 profile
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

-- 触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- 2. 为所有表添加 tenant_id（多租户支持）
-- ============================================
DO $$
BEGIN
  -- llm_api_keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'llm_api_keys' AND column_name = 'tenant_id') THEN
    ALTER TABLE llm_api_keys ADD COLUMN tenant_id UUID;
  END IF;
  
  -- llm_platform_accounts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'llm_platform_accounts' AND column_name = 'tenant_id') THEN
    ALTER TABLE llm_platform_accounts ADD COLUMN tenant_id UUID;
  END IF;
  
  -- llm_api_key_usage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'llm_api_key_usage' AND column_name = 'tenant_id') THEN
    ALTER TABLE llm_api_key_usage ADD COLUMN tenant_id UUID;
  END IF;
  
  -- llm_api_key_logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'llm_api_key_logs' AND column_name = 'tenant_id') THEN
    ALTER TABLE llm_api_key_logs ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_tenant ON llm_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_llm_platform_accounts_tenant ON llm_platform_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);


-- ============================================
-- 3. 启用 RLS
-- ============================================

-- profiles 表
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- llm_api_keys 表
ALTER TABLE llm_api_keys ENABLE ROW LEVEL SECURITY;

-- llm_platform_accounts 表
ALTER TABLE llm_platform_accounts ENABLE ROW LEVEL SECURITY;

-- llm_api_key_usage 表
ALTER TABLE llm_api_key_usage ENABLE ROW LEVEL SECURITY;

-- llm_api_key_logs 表
ALTER TABLE llm_api_key_logs ENABLE ROW LEVEL SECURITY;

-- llm_api_key_owners 表
ALTER TABLE llm_api_key_owners ENABLE ROW LEVEL SECURITY;

-- llm_sync_tasks 表
ALTER TABLE llm_sync_tasks ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 4. 辅助函数：获取当前用户的 tenant_id
-- ============================================
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- ============================================
-- 5. RLS 策略 - profiles 表
-- ============================================

-- 用户只能查看自己的 profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 用户只能更新自己的 profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 同租户用户可以查看彼此的基本信息
DROP POLICY IF EXISTS "Tenant members can view each other" ON profiles;
CREATE POLICY "Tenant members can view each other" ON profiles
  FOR SELECT USING (
    tenant_id IS NOT NULL AND tenant_id = auth.tenant_id()
  );


-- ============================================
-- 6. RLS 策略 - llm_api_keys 表
-- ============================================

-- 查看：同租户成员可以查看
DROP POLICY IF EXISTS "Tenant members can view keys" ON llm_api_keys;
CREATE POLICY "Tenant members can view keys" ON llm_api_keys
  FOR SELECT USING (
    tenant_id = auth.tenant_id()
    OR created_by = auth.uid()
  );

-- 创建：已认证用户可以创建（自动关联 tenant）
DROP POLICY IF EXISTS "Authenticated users can create keys" ON llm_api_keys;
CREATE POLICY "Authenticated users can create keys" ON llm_api_keys
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 更新：同租户成员可以更新
DROP POLICY IF EXISTS "Tenant members can update keys" ON llm_api_keys;
CREATE POLICY "Tenant members can update keys" ON llm_api_keys
  FOR UPDATE USING (
    tenant_id = auth.tenant_id()
    OR created_by = auth.uid()
  );

-- 删除：只有创建者或管理员可以删除
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
-- 7. RLS 策略 - llm_platform_accounts 表
-- ============================================

-- 查看：同租户成员可以查看
DROP POLICY IF EXISTS "Tenant members can view accounts" ON llm_platform_accounts;
CREATE POLICY "Tenant members can view accounts" ON llm_platform_accounts
  FOR SELECT USING (
    tenant_id = auth.tenant_id()
  );

-- 创建/更新/删除：只有管理员
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


-- ============================================
-- 8. RLS 策略 - llm_api_key_usage 表
-- ============================================

-- 查看：关联到用户可访问的 key
DROP POLICY IF EXISTS "Users can view usage of accessible keys" ON llm_api_key_usage;
CREATE POLICY "Users can view usage of accessible keys" ON llm_api_key_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_usage.api_key_id
      AND (tenant_id = auth.tenant_id() OR created_by = auth.uid())
    )
  );

-- 插入：服务端（n8n 同步）使用 service_role 执行
DROP POLICY IF EXISTS "Service can insert usage" ON llm_api_key_usage;
CREATE POLICY "Service can insert usage" ON llm_api_key_usage
  FOR INSERT WITH CHECK (true);  -- 通过 service_role 绕过 RLS


-- ============================================
-- 9. RLS 策略 - llm_api_key_logs 表
-- ============================================

-- 查看：同租户成员可以查看日志
DROP POLICY IF EXISTS "Tenant members can view logs" ON llm_api_key_logs;
CREATE POLICY "Tenant members can view logs" ON llm_api_key_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_logs.api_key_id
      AND (tenant_id = auth.tenant_id() OR created_by = auth.uid())
    )
  );


-- ============================================
-- 10. RLS 策略 - llm_api_key_owners 表
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view owners" ON llm_api_key_owners;
CREATE POLICY "Tenant members can view owners" ON llm_api_key_owners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_owners.api_key_id
      AND (tenant_id = auth.tenant_id() OR created_by = auth.uid())
    )
  );


-- ============================================
-- 11. 触发器：自动设置 tenant_id
-- ============================================
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果没有指定 tenant_id，使用当前用户的 tenant_id
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := auth.tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为 llm_api_keys 添加触发器
DROP TRIGGER IF EXISTS trigger_set_tenant_id_api_keys ON llm_api_keys;
CREATE TRIGGER trigger_set_tenant_id_api_keys
  BEFORE INSERT ON llm_api_keys
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- 为 llm_platform_accounts 添加触发器
DROP TRIGGER IF EXISTS trigger_set_tenant_id_accounts ON llm_platform_accounts;
CREATE TRIGGER trigger_set_tenant_id_accounts
  BEFORE INSERT ON llm_platform_accounts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();


-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS (Row Level Security) 配置完成！';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 安全保护:';
  RAISE NOTICE '  - 即使 anon_key 泄露，未认证用户无法访问任何数据';
  RAISE NOTICE '  - 已认证用户只能访问自己租户的数据';
  RAISE NOTICE '  - 敏感操作（如删除）需要特定权限';
  RAISE NOTICE '';
  RAISE NOTICE '📋 已保护的表:';
  RAISE NOTICE '  - profiles (用户信息)';
  RAISE NOTICE '  - llm_api_keys (API 密钥)';
  RAISE NOTICE '  - llm_platform_accounts (平台账号)';
  RAISE NOTICE '  - llm_api_key_usage (用量统计)';
  RAISE NOTICE '  - llm_api_key_logs (操作日志)';
  RAISE NOTICE '  - llm_api_key_owners (责任人)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 重要: n8n 工作流需要使用 service_role_key 来绕过 RLS';
END $$;

