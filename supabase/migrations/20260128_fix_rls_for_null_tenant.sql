-- 修复 RLS 策略：允许查看 tenant_id 为 NULL 的记录（用于开发环境和导入数据）
-- 这样即使没有注册租户，也能查看导入的平台账号数据

-- 修改 llm_platform_accounts 表的查看策略
DROP POLICY IF EXISTS "Tenant members can view accounts" ON llm_platform_accounts;
CREATE POLICY "Tenant members can view accounts" ON llm_platform_accounts
  FOR SELECT USING (
    -- 允许查看 tenant_id 为 NULL 的记录（导入的数据）
    tenant_id IS NULL 
    -- 或者 tenant_id 匹配当前用户的租户
    OR tenant_id = auth.tenant_id()
  );

-- 同样修改其他相关表的策略（如果需要）
-- llm_api_keys 表
DROP POLICY IF EXISTS "Tenant members can view keys" ON llm_api_keys;
CREATE POLICY IF NOT EXISTS "Tenant members can view keys" ON llm_api_keys
  FOR SELECT USING (
    tenant_id IS NULL 
    OR tenant_id = auth.tenant_id()
  );

