-- 为 llm_platform_accounts 表添加 total_monthly_tokens 字段
-- 用于存储平台账号的月度 Token 使用量统计

DO $$
BEGIN
  -- 检查字段是否存在，如果不存在则添加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'llm_platform_accounts' 
      AND column_name = 'total_monthly_tokens'
  ) THEN
    ALTER TABLE llm_platform_accounts 
    ADD COLUMN total_monthly_tokens BIGINT DEFAULT 0;
    
    COMMENT ON COLUMN llm_platform_accounts.total_monthly_tokens IS '平台账号的月度 Token 使用量统计（缓存）';
  END IF;
END $$;

