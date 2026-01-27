-- ============================================
-- 添加唯一约束支持 API 同步时的 upsert 操作
-- ============================================

-- 为 llm_api_keys 添加 platform + platform_key_id 的唯一约束
-- 这样从 Claude/OpenAI API 同步 Keys 时可以使用 upsert
CREATE UNIQUE INDEX IF NOT EXISTS llm_api_keys_platform_key_unique 
ON llm_api_keys (platform, platform_key_id) 
WHERE platform_key_id IS NOT NULL;

-- 添加注释
COMMENT ON INDEX llm_api_keys_platform_key_unique IS '平台 + 平台 Key ID 唯一约束，用于 API 同步时的 upsert 操作';
