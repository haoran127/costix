-- 修复 llm_api_key_owners 表的 RLS 策略
-- 添加 INSERT、UPDATE、DELETE 策略

-- ============================================
-- llm_api_key_owners 表 RLS 策略
-- ============================================

-- INSERT 策略：允许租户成员插入责任人
DROP POLICY IF EXISTS "Tenant members can insert owners" ON llm_api_key_owners;
CREATE POLICY "Tenant members can insert owners" ON llm_api_key_owners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_owners.api_key_id
      AND (
        tenant_id IS NULL 
        OR tenant_id = public.tenant_id() 
        OR created_by = auth.uid()
      )
    )
    AND (
      -- 简化：允许设置任何用户作为责任人（只要 API Key 属于当前租户）
      -- 避免查询 team_members 导致的无限递归
      user_id IS NOT NULL
    )
  );

-- UPDATE 策略：允许租户成员更新责任人
DROP POLICY IF EXISTS "Tenant members can update owners" ON llm_api_key_owners;
CREATE POLICY "Tenant members can update owners" ON llm_api_key_owners
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_owners.api_key_id
      AND (
        tenant_id IS NULL 
        OR tenant_id = public.tenant_id() 
        OR created_by = auth.uid()
      )
    )
  );

-- DELETE 策略：允许租户成员删除责任人
DROP POLICY IF EXISTS "Tenant members can delete owners" ON llm_api_key_owners;
CREATE POLICY "Tenant members can delete owners" ON llm_api_key_owners
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM llm_api_keys 
      WHERE id = llm_api_key_owners.api_key_id
      AND (
        tenant_id IS NULL 
        OR tenant_id = public.tenant_id() 
        OR created_by = auth.uid()
      )
    )
  );

