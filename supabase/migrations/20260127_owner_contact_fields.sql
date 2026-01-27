-- ============================================
-- 为 API Key 添加直接联系人字段
-- 改为填写姓名、手机号、邮箱，而非关联员工
-- ============================================

-- 添加联系人字段到 llm_api_keys 表
ALTER TABLE llm_api_keys 
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);

-- 添加注释
COMMENT ON COLUMN llm_api_keys.owner_name IS '责任人姓名（直接填写）';
COMMENT ON COLUMN llm_api_keys.owner_phone IS '责任人手机号';
COMMENT ON COLUMN llm_api_keys.owner_email IS '责任人邮箱';

-- 为联系人字段创建索引（方便搜索）
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_owner_email ON llm_api_keys(owner_email);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_owner_phone ON llm_api_keys(owner_phone);

DO $$
BEGIN
  RAISE NOTICE '✅ 已为 llm_api_keys 表添加联系人字段: owner_name, owner_phone, owner_email';
END $$;

