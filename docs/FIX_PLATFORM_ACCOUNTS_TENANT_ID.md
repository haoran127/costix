# 修复平台账号查询问题

## 问题原因

RLS (Row Level Security) 策略要求查询 `llm_platform_accounts` 表时，数据的 `tenant_id` 必须与当前用户的 `tenant_id` 匹配。

导入的数据可能：
1. `tenant_id` 为 `NULL`
2. `tenant_id` 与当前用户不匹配

## 解决方案

### 方案 1：更新数据的 tenant_id（推荐）

在 Supabase SQL Editor 中执行：

```sql
-- 1. 查看当前用户的 tenant_id
SELECT id, email, tenant_id FROM auth.users WHERE email = 'your-email@example.com';

-- 2. 查看平台账号数据的 tenant_id
SELECT id, name, platform, tenant_id FROM llm_platform_accounts;

-- 3. 更新平台账号的 tenant_id（替换 YOUR_TENANT_ID 为实际的 tenant_id）
UPDATE llm_platform_accounts 
SET tenant_id = 'YOUR_TENANT_ID'::uuid
WHERE tenant_id IS NULL;

-- 或者更新所有记录到当前用户的 tenant_id
UPDATE llm_platform_accounts 
SET tenant_id = (
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1
)
WHERE tenant_id IS NULL;
```

### 方案 2：临时禁用 RLS（仅用于调试，不推荐）

```sql
-- 临时禁用 RLS
ALTER TABLE llm_platform_accounts DISABLE ROW LEVEL SECURITY;

-- 查询数据确认
SELECT * FROM llm_platform_accounts;

-- 重新启用 RLS
ALTER TABLE llm_platform_accounts ENABLE ROW LEVEL SECURITY;
```

### 方案 3：修改 RLS 策略允许查看 NULL tenant_id（临时方案）

```sql
-- 修改查看策略，允许查看 tenant_id 为 NULL 的记录
DROP POLICY IF EXISTS "Tenant members can view accounts" ON llm_platform_accounts;
CREATE POLICY "Tenant members can view accounts" ON llm_platform_accounts
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id = auth.tenant_id()
  );
```

## 推荐操作步骤

1. 先执行方案 1，更新数据的 `tenant_id`
2. 刷新前端页面，应该能看到数据了
3. 如果还有问题，检查浏览器控制台的错误信息

