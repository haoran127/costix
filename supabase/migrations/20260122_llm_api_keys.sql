-- ============================================
-- 大模型 API Key 管理 - 数据库表结构
-- 支持 OpenAI, Anthropic, Google AI, 阿里通义千问, 火山引擎, DeepSeek 等
-- ============================================

-- ============================================
-- 1. 大模型 API Key 主表 (llm_api_keys)
-- ============================================
CREATE TABLE IF NOT EXISTS llm_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基础信息
  name VARCHAR(255) NOT NULL,                    -- Key 名称，如 "GPT-4 生产环境"
  platform VARCHAR(50) NOT NULL,                 -- 平台: openai, anthropic, google, aliyun, volcengine, deepseek
  
  -- API Key 存储（敏感信息）
  api_key_encrypted TEXT NOT NULL,               -- 加密存储的完整 API Key
  api_key_prefix VARCHAR(20),                    -- Key 前缀，用于显示（如 sk-proj-）
  api_key_suffix VARCHAR(10),                    -- Key 后缀，用于显示（如 ...1234）
  
  -- 平台返回的 Key ID（用于调用平台 API 管理 Key）
  platform_key_id VARCHAR(100),                  -- 平台返回的 Key ID，如 OpenAI 的 key_abc
  
  -- 平台账号凭证（部分平台需要额外信息）
  organization_id VARCHAR(100),                  -- OpenAI Organization ID
  project_id VARCHAR(100),                       -- 项目 ID（如有）
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active',           -- active: 正常, expired: 已过期, disabled: 已禁用, error: 异常
  
  -- 业务信息
  business VARCHAR(255),                         -- 业务用途，如 "AI 客服助手"
  description TEXT,                              -- 详细描述
  tags JSONB DEFAULT '[]'::jsonb,                -- 标签，如 ["生产", "客服"]
  
  -- 时间
  expires_at TIMESTAMPTZ,                        -- 过期时间，NULL 表示永久有效
  last_used_at TIMESTAMPTZ,                      -- 最后使用时间
  last_synced_at TIMESTAMPTZ,                    -- 最后同步时间（从平台 API 拉取数据）
  last_verified_at TIMESTAMPTZ,                  -- 最后验证时间（验证 Key 是否有效）
  
  -- 创建信息
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,  -- 创建者
  creation_method VARCHAR(20) DEFAULT 'manual',  -- 创建方式: api（通过API自动创建）, manual（手动添加）
  
  -- 错误信息
  error_message TEXT,                            -- 最近的错误信息
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_platform ON llm_api_keys(platform);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_status ON llm_api_keys(status);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_created_by ON llm_api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_expires_at ON llm_api_keys(expires_at);

COMMENT ON TABLE llm_api_keys IS '大模型 API Key 主表，存储各平台的 API 密钥信息';
COMMENT ON COLUMN llm_api_keys.platform IS '平台类型: openai, anthropic, google, aliyun, volcengine, deepseek';
COMMENT ON COLUMN llm_api_keys.api_key_encrypted IS 'API Key 加密存储，使用 pgcrypto 加密';
COMMENT ON COLUMN llm_api_keys.creation_method IS '创建方式: api-通过平台API创建, manual-手动添加已有Key';


-- ============================================
-- 2. Key 用量统计表 (llm_api_key_usage)
-- 存储从各平台 API 同步来的用量数据
-- 设计为每次同步插入新记录，便于追踪历史
-- ============================================
CREATE TABLE IF NOT EXISTS llm_api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联
  api_key_id UUID NOT NULL REFERENCES llm_api_keys(id) ON DELETE CASCADE,
  
  -- 账户余额（美元）
  balance DECIMAL(12, 4),                        -- 当前余额
  credit_limit DECIMAL(12, 4),                   -- 信用额度上限
  
  -- 消费统计（美元）
  total_usage DECIMAL(12, 4),                    -- 总消费
  monthly_usage DECIMAL(12, 4),                  -- 本月消费
  daily_usage DECIMAL(12, 4),                    -- 今日消费
  
  -- Token 用量统计
  token_usage_total BIGINT,                      -- 总 Token 使用量
  token_usage_monthly BIGINT,                    -- 本月 Token 使用量
  token_usage_daily BIGINT,                      -- 今日 Token 使用量
  
  -- 按类型细分（部分平台提供）
  prompt_tokens_total BIGINT,                    -- 输入 Token 总量
  completion_tokens_total BIGINT,                -- 输出 Token 总量
  
  -- 速率限制（从 API 获取）
  rate_limit_rpm INTEGER,                        -- Requests Per Minute 限制
  rate_limit_tpm INTEGER,                        -- Tokens Per Minute 限制
  rate_limit_rpd INTEGER,                        -- Requests Per Day 限制
  
  -- 统计周期
  period_start DATE,                             -- 统计周期开始
  period_end DATE,                               -- 统计周期结束
  
  -- 原始数据
  raw_response JSONB,                            -- 平台 API 返回的原始数据
  
  -- 同步信息
  synced_at TIMESTAMPTZ DEFAULT NOW(),           -- 同步时间
  sync_status VARCHAR(20) DEFAULT 'success',     -- success, failed, partial
  sync_error TEXT,                               -- 同步错误信息
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_llm_api_key_usage_key_id ON llm_api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_usage_synced_at ON llm_api_key_usage(synced_at DESC);

-- 用于快速查询最新用量的视图
CREATE OR REPLACE VIEW llm_api_key_latest_usage AS
SELECT DISTINCT ON (api_key_id) *
FROM llm_api_key_usage
ORDER BY api_key_id, synced_at DESC;

COMMENT ON TABLE llm_api_key_usage IS 'API Key 用量统计表，存储从平台同步的用量数据';
COMMENT ON VIEW llm_api_key_latest_usage IS '每个 Key 的最新用量数据视图';


-- ============================================
-- 3. Key 责任人绑定表 (llm_api_key_owners)
-- 一个 Key 可以有多个责任人
-- ============================================
CREATE TABLE IF NOT EXISTS llm_api_key_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联
  api_key_id UUID NOT NULL REFERENCES llm_api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 责任人类型
  role VARCHAR(20) DEFAULT 'owner',              -- owner: 责任人, viewer: 查看者, admin: 管理员
  is_primary BOOLEAN DEFAULT false,              -- 是否主要责任人（页面上显示的那个）
  
  -- 分配信息
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,  -- 谁分配的
  assigned_at TIMESTAMPTZ DEFAULT NOW(),         -- 分配时间
  notes TEXT,                                    -- 备注
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一约束：一个 Key 下同一用户只能有一条记录
  UNIQUE(api_key_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_llm_api_key_owners_key_id ON llm_api_key_owners(api_key_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_owners_user_id ON llm_api_key_owners(user_id);

COMMENT ON TABLE llm_api_key_owners IS 'API Key 责任人绑定表，支持一个 Key 多个责任人';
COMMENT ON COLUMN llm_api_key_owners.is_primary IS '主要责任人，列表页面显示此人';


-- ============================================
-- 4. Key 操作日志表 (llm_api_key_logs)
-- 记录所有对 Key 的操作，便于审计
-- ============================================
CREATE TABLE IF NOT EXISTS llm_api_key_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联
  api_key_id UUID NOT NULL REFERENCES llm_api_keys(id) ON DELETE CASCADE,
  
  -- 操作信息
  action VARCHAR(50) NOT NULL,                   -- create, update, delete, sync, verify, assign_owner, remove_owner, enable, disable
  action_by UUID REFERENCES users(id) ON DELETE SET NULL,  -- 操作人
  
  -- 变更详情
  old_values JSONB,                              -- 旧值
  new_values JSONB,                              -- 新值
  
  -- 结果
  status VARCHAR(20) DEFAULT 'success',          -- success, failed
  error_message TEXT,                            -- 错误信息
  
  -- 请求信息
  ip_address VARCHAR(50),                        -- 操作者 IP
  user_agent TEXT,                               -- 浏览器信息
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_llm_api_key_logs_key_id ON llm_api_key_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_logs_action ON llm_api_key_logs(action);
CREATE INDEX IF NOT EXISTS idx_llm_api_key_logs_created_at ON llm_api_key_logs(created_at DESC);

COMMENT ON TABLE llm_api_key_logs IS 'API Key 操作日志表，记录所有操作便于审计';


-- ============================================
-- 5. 平台账号表 (llm_platform_accounts)
-- 存储各平台的账号信息（用于通过 API 创建 Key）
-- ============================================
CREATE TABLE IF NOT EXISTS llm_platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基础信息
  name VARCHAR(255) NOT NULL,                    -- 账号名称，如 "公司主账号"
  platform VARCHAR(50) NOT NULL,                 -- 平台: openai, anthropic, google, aliyun, volcengine, deepseek
  
  -- 认证信息（根据平台不同）
  admin_api_key_encrypted TEXT,                  -- 管理员 API Key（用于创建子 Key）
  organization_id VARCHAR(100),                  -- Organization ID
  project_id VARCHAR(100),                       -- Project ID
  
  -- OAuth 相关（部分平台）
  oauth_client_id VARCHAR(255),
  oauth_client_secret_encrypted TEXT,
  oauth_refresh_token_encrypted TEXT,
  oauth_access_token_encrypted TEXT,
  oauth_expires_at TIMESTAMPTZ,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active',           -- active, expired, error, disabled
  last_verified_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- 统计（缓存）
  keys_count INTEGER DEFAULT 0,                  -- 下属 Key 数量
  total_balance DECIMAL(12, 4),                  -- 账号总余额
  
  -- 责任人
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_llm_platform_accounts_platform ON llm_platform_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_llm_platform_accounts_owner ON llm_platform_accounts(owner_id);

-- 关联 llm_api_keys 到 platform_accounts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'llm_api_keys' AND column_name = 'platform_account_id') THEN
    ALTER TABLE llm_api_keys ADD COLUMN platform_account_id UUID REFERENCES llm_platform_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON TABLE llm_platform_accounts IS '大模型平台账号表，存储用于管理和创建 Key 的账号凭证';


-- ============================================
-- 6. 同步任务表 (llm_sync_tasks)
-- 记录定时同步任务
-- ============================================
CREATE TABLE IF NOT EXISTS llm_sync_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 任务信息
  task_type VARCHAR(50) NOT NULL,                -- sync_usage, sync_balance, verify_key, create_key
  target_type VARCHAR(20) NOT NULL,              -- key, account, platform
  target_id UUID,                                -- 目标 ID（可以是 key_id 或 account_id）
  platform VARCHAR(50),                          -- 目标平台
  
  -- 调度
  schedule_type VARCHAR(20) DEFAULT 'manual',    -- manual, hourly, daily, weekly
  cron_expression VARCHAR(50),                   -- Cron 表达式
  next_run_at TIMESTAMPTZ,                       -- 下次执行时间
  
  -- 执行信息
  status VARCHAR(20) DEFAULT 'pending',          -- pending, running, success, failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- 结果
  result JSONB,                                  -- 执行结果
  error_message TEXT,                            -- 错误信息
  retry_count INTEGER DEFAULT 0,                 -- 重试次数
  
  -- 系统字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_llm_sync_tasks_status ON llm_sync_tasks(status);
CREATE INDEX IF NOT EXISTS idx_llm_sync_tasks_next_run ON llm_sync_tasks(next_run_at);

COMMENT ON TABLE llm_sync_tasks IS '大模型数据同步任务表';


-- ============================================
-- 7. 函数：获取 Key 详情（包含最新用量和责任人）
-- ============================================
CREATE OR REPLACE FUNCTION get_llm_api_key_details(p_key_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'key', row_to_json(k.*),
    'latest_usage', row_to_json(u.*),
    'owners', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'user_id', o.user_id,
        'role', o.role,
        'is_primary', o.is_primary,
        'user', jsonb_build_object(
          'id', usr.id,
          'nick_name', usr.nick_name,
          'email', usr.email,
          'icon', usr.icon,
          'status', usr.status,
          'position', usr.position,
          'department', usr.department
        )
      ))
      FROM llm_api_key_owners o
      JOIN users usr ON usr.id = o.user_id
      WHERE o.api_key_id = p_key_id
    )
  )
  INTO v_result
  FROM llm_api_keys k
  LEFT JOIN llm_api_key_latest_usage u ON u.api_key_id = k.id
  WHERE k.id = p_key_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_llm_api_key_details IS '获取 API Key 完整详情，包含最新用量和所有责任人';


-- ============================================
-- 8. 函数：获取 Key 列表（带分页和筛选）
-- ============================================
CREATE OR REPLACE FUNCTION get_llm_api_keys(
  p_platform VARCHAR DEFAULT NULL,
  p_status VARCHAR DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_items JSONB;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- 统计总数
  SELECT COUNT(*) INTO v_total
  FROM llm_api_keys k
  LEFT JOIN llm_api_key_owners o ON o.api_key_id = k.id AND o.is_primary = true
  WHERE (p_platform IS NULL OR k.platform = p_platform)
    AND (p_status IS NULL OR k.status = p_status)
    AND (p_owner_id IS NULL OR o.user_id = p_owner_id)
    AND (p_search IS NULL OR k.name ILIKE '%' || p_search || '%' OR k.business ILIKE '%' || p_search || '%');
  
  -- 获取列表
  SELECT jsonb_agg(item ORDER BY created_at DESC)
  INTO v_items
  FROM (
    SELECT jsonb_build_object(
      'id', k.id,
      'name', k.name,
      'platform', k.platform,
      'api_key_prefix', k.api_key_prefix,
      'api_key_suffix', k.api_key_suffix,
      'status', k.status,
      'business', k.business,
      'expires_at', k.expires_at,
      'last_used_at', k.last_used_at,
      'last_synced_at', k.last_synced_at,
      'created_at', k.created_at,
      'latest_usage', (
        SELECT jsonb_build_object(
          'balance', u.balance,
          'total_usage', u.total_usage,
          'monthly_usage', u.monthly_usage,
          'token_usage_monthly', u.token_usage_monthly,
          'rate_limit_rpm', u.rate_limit_rpm,
          'rate_limit_tpm', u.rate_limit_tpm,
          'synced_at', u.synced_at
        )
        FROM llm_api_key_usage u
        WHERE u.api_key_id = k.id
        ORDER BY u.synced_at DESC
        LIMIT 1
      ),
      'primary_owner', (
        SELECT jsonb_build_object(
          'id', usr.id,
          'nick_name', usr.nick_name,
          'email', usr.email,
          'icon', usr.icon,
          'status', usr.status
        )
        FROM llm_api_key_owners o
        JOIN users usr ON usr.id = o.user_id
        WHERE o.api_key_id = k.id AND o.is_primary = true
        LIMIT 1
      )
    ) as item,
    k.created_at
    FROM llm_api_keys k
    LEFT JOIN llm_api_key_owners o ON o.api_key_id = k.id AND o.is_primary = true
    WHERE (p_platform IS NULL OR k.platform = p_platform)
      AND (p_status IS NULL OR k.status = p_status)
      AND (p_owner_id IS NULL OR o.user_id = p_owner_id)
      AND (p_search IS NULL OR k.name ILIKE '%' || p_search || '%' OR k.business ILIKE '%' || p_search || '%')
    ORDER BY k.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) sub;
  
  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(v_total::DECIMAL / p_page_size)
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_llm_api_keys IS '获取 API Key 列表，支持平台、状态、责任人筛选和搜索';


-- ============================================
-- 9. 函数：获取平台统计
-- ============================================
CREATE OR REPLACE FUNCTION get_llm_platform_stats(p_platform VARCHAR DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(stats)
    FROM (
      SELECT jsonb_build_object(
        'platform', k.platform,
        'total_keys', COUNT(*),
        'active_keys', COUNT(*) FILTER (WHERE k.status = 'active'),
        'total_balance', COALESCE(SUM(u.balance), 0),
        'total_monthly_usage', COALESCE(SUM(u.monthly_usage), 0),
        'total_monthly_tokens', COALESCE(SUM(u.token_usage_monthly), 0)
      ) as stats
      FROM llm_api_keys k
      LEFT JOIN llm_api_key_latest_usage u ON u.api_key_id = k.id
      WHERE (p_platform IS NULL OR k.platform = p_platform)
      GROUP BY k.platform
      ORDER BY k.platform
    ) sub
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_llm_platform_stats IS '获取各平台的统计数据';


-- ============================================
-- 10. 触发器：自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_llm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加触发器
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


-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ 大模型 API Key 管理表结构创建完成！';
  RAISE NOTICE '';
  RAISE NOTICE '新增表:';
  RAISE NOTICE '  - llm_api_keys (API Key 主表)';
  RAISE NOTICE '  - llm_api_key_usage (用量统计表)';
  RAISE NOTICE '  - llm_api_key_owners (责任人绑定表)';
  RAISE NOTICE '  - llm_api_key_logs (操作日志表)';
  RAISE NOTICE '  - llm_platform_accounts (平台账号表)';
  RAISE NOTICE '  - llm_sync_tasks (同步任务表)';
  RAISE NOTICE '';
  RAISE NOTICE '新增视图:';
  RAISE NOTICE '  - llm_api_key_latest_usage (最新用量视图)';
  RAISE NOTICE '';
  RAISE NOTICE '新增函数:';
  RAISE NOTICE '  - get_llm_api_key_details(key_id) - 获取 Key 完整详情';
  RAISE NOTICE '  - get_llm_api_keys(...) - 获取 Key 列表(带分页筛选)';
  RAISE NOTICE '  - get_llm_platform_stats(platform) - 获取平台统计';
END $$;
