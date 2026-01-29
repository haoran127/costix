-- ============================================
-- KeyPilot 数据库表结构
-- 创建所有必要的表
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

COMMENT ON TABLE profiles IS '用户信息表，扩展 Supabase Auth 用户信息';

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

COMMENT ON TABLE llm_api_keys IS '大模型 API Key 主表，存储各平台的 API 密钥信息';
COMMENT ON COLUMN llm_api_keys.platform IS '平台类型: openai, anthropic, openrouter, volcengine, deepseek';
COMMENT ON COLUMN llm_api_keys.creation_method IS '创建方式: api-通过平台API创建, manual-手动添加已有Key';

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

COMMENT ON TABLE llm_api_key_usage IS 'API Key 用量统计表，存储从平台同步的用量数据';

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

COMMENT ON TABLE llm_api_key_owners IS 'API Key 责任人绑定表，支持一个 Key 多个责任人';
COMMENT ON COLUMN llm_api_key_owners.is_primary IS '主要责任人，列表页面显示此人';

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

COMMENT ON TABLE llm_api_key_logs IS 'API Key 操作日志表，记录所有操作便于审计';

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

COMMENT ON TABLE llm_platform_accounts IS '大模型平台账号表，存储用于管理和创建 Key 的账号凭证';
COMMENT ON COLUMN llm_platform_accounts.total_monthly_tokens IS '平台账号的月度 Token 使用量统计（缓存）';

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

COMMENT ON TABLE llm_sync_tasks IS '大模型数据同步任务表';

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

COMMENT ON TABLE teams IS '团队表';

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

COMMENT ON TABLE team_members IS '团队成员表，支持邀请和角色管理';

-- ============================================
-- 10. 视图：最新用量
-- ============================================
CREATE OR REPLACE VIEW llm_api_key_latest_usage AS
SELECT DISTINCT ON (api_key_id) *
FROM llm_api_key_usage
ORDER BY api_key_id, synced_at DESC;

COMMENT ON VIEW llm_api_key_latest_usage IS '每个 Key 的最新用量数据视图';

