-- ============================================
-- KeyPilot 数据库索引
-- 创建所有必要的索引以优化查询性能
-- ============================================

-- ============================================
-- llm_api_keys 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_platform ON llm_api_keys(platform);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_status ON llm_api_keys(status);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_created_by ON llm_api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_expires_at ON llm_api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_tenant ON llm_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_owner_email ON llm_api_keys(owner_email);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_owner_phone ON llm_api_keys(owner_phone);

-- 平台 + 平台 Key ID 唯一约束（用于 API 同步时的 upsert）
CREATE UNIQUE INDEX IF NOT EXISTS llm_api_keys_platform_key_unique 
  ON llm_api_keys (platform, platform_key_id) 
  WHERE platform_key_id IS NOT NULL;

COMMENT ON INDEX llm_api_keys_platform_key_unique IS '平台 + 平台 Key ID 唯一约束，用于 API 同步时的 upsert 操作';

-- ============================================
-- llm_api_key_usage 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_llm_api_key_usage_key_id ON llm_api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_usage_synced_at ON llm_api_key_usage(synced_at DESC);

-- 唯一约束：每个 Key 每个周期只能有一条用量记录（用于 upsert）
CREATE UNIQUE INDEX IF NOT EXISTS llm_api_key_usage_key_period_unique 
  ON llm_api_key_usage (api_key_id, period_start) 
  WHERE period_start IS NOT NULL;

COMMENT ON INDEX llm_api_key_usage_key_period_unique IS '每个 Key 每个周期只能有一条用量记录，用于 upsert 操作';

-- ============================================
-- llm_api_key_owners 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_llm_api_key_owners_key_id ON llm_api_key_owners(api_key_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_owners_user_id ON llm_api_key_owners(user_id);

-- ============================================
-- llm_api_key_logs 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_llm_api_key_logs_key_id ON llm_api_key_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_logs_action ON llm_api_key_logs(action);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_logs_created_at ON llm_api_key_logs(created_at DESC);

-- ============================================
-- llm_platform_accounts 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_llm_platform_accounts_platform ON llm_platform_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_llm_platform_accounts_owner ON llm_platform_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_llm_platform_accounts_tenant ON llm_platform_accounts(tenant_id);

-- ============================================
-- llm_sync_tasks 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_llm_sync_tasks_status ON llm_sync_tasks(status);
CREATE INDEX IF NOT EXISTS idx_llm_sync_tasks_next_run ON llm_sync_tasks(next_run_at);

-- ============================================
-- profiles 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);

-- ============================================
-- team_members 表索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

