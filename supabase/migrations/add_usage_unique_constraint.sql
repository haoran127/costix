-- ============================================
-- 添加 llm_api_key_usage 表的唯一约束
-- 用于支持 upsert 操作（onConflict: 'api_key_id,period_start'）
-- ============================================

-- 删除可能存在的重复数据（保留最新的记录）
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- 检查是否有重复数据
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT api_key_id, period_start, COUNT(*) as cnt
    FROM llm_api_key_usage
    WHERE period_start IS NOT NULL
    GROUP BY api_key_id, period_start
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE '发现 % 组重复数据，正在清理...', duplicate_count;
    
    -- 删除重复数据，只保留 synced_at 最新的记录
    DELETE FROM llm_api_key_usage u1
    WHERE EXISTS (
      SELECT 1
      FROM llm_api_key_usage u2
      WHERE u2.api_key_id = u1.api_key_id
        AND u2.period_start = u1.period_start
        AND u2.period_start IS NOT NULL
        AND u2.synced_at > u1.synced_at
    );
    
    RAISE NOTICE '重复数据清理完成';
  ELSE
    RAISE NOTICE '未发现重复数据';
  END IF;
END $$;

-- 创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS llm_api_key_usage_key_period_unique 
  ON llm_api_key_usage (api_key_id, period_start) 
  WHERE period_start IS NOT NULL;

COMMENT ON INDEX llm_api_key_usage_key_period_unique IS '每个 Key 每个周期只能有一条用量记录，用于 upsert 操作';

