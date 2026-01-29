-- ============================================
-- 添加 workspace_id 字段到 llm_api_keys 表
-- 用于 Claude 费用同步时匹配费用到 Key
-- ============================================

-- 添加 workspace_id 字段（Claude 平台使用）
ALTER TABLE llm_api_keys 
ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(100);

-- 添加索引以优化查询
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_workspace_id 
ON llm_api_keys(workspace_id) 
WHERE workspace_id IS NOT NULL;

COMMENT ON COLUMN llm_api_keys.workspace_id IS 'Claude 平台的 workspace_id，用于费用同步时匹配费用到 Key';

