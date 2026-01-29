# 清理未激活用户指南

## 问题说明

当用户注册后没有验证邮箱，会在数据库中留下未激活的记录。这些记录会占用空间，需要定期清理。

## 数据库结构

Supabase Auth 的用户数据存储在：
- `auth.users` - 用户认证信息（Supabase 管理）
- `profiles` - 用户扩展信息（我们创建的表）

这两个表通过 `id` 关联，`profiles.id` 外键引用 `auth.users.id`。

## 清理步骤

### 步骤 1：查看未激活的用户

在 Supabase SQL Editor 中执行：

```sql
-- 查看未激活的用户
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  CASE WHEN p.id IS NOT NULL THEN '有 profile' ELSE '无 profile' END as profile_status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email_confirmed_at IS NULL
ORDER BY u.created_at DESC;
```

### 步骤 2：删除未激活的用户

**⚠️ 重要：删除 `auth.users` 中的记录会级联删除 `profiles` 中的记录**

```sql
-- 删除 7 天前注册的未激活用户（安全做法）
DELETE FROM auth.users 
WHERE email_confirmed_at IS NULL 
AND created_at < NOW() - INTERVAL '7 days';
```

**或者删除所有未激活用户（谨慎使用）：**

```sql
-- 删除所有未激活用户
DELETE FROM auth.users 
WHERE email_confirmed_at IS NULL;
```

### 步骤 3：清理孤立的记录

如果手动删除了 `profiles` 但没有删除 `auth.users`，需要清理孤立的记录：

```sql
-- 清理孤立的 profiles 记录
DELETE FROM profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- 清理孤立的团队记录
DELETE FROM teams
WHERE id NOT IN (
  SELECT DISTINCT team_id 
  FROM team_members 
  WHERE team_id IS NOT NULL
)
AND owner_id NOT IN (SELECT id FROM auth.users);
```

## 使用清理脚本

已创建清理脚本：`supabase/migrations/cleanup_inactive_users.sql`

1. **先查看未激活用户**
   - 执行脚本中的查询语句
   - 确认要删除的用户

2. **执行清理**
   - 取消注释删除语句
   - 根据需要调整时间条件
   - 执行删除

3. **清理孤立记录**
   - 执行清理孤立的 profiles 和 teams 记录

## 最佳实践

### 1. 定期清理

建议每周或每月清理一次未激活用户：

```sql
-- 删除 7 天前注册的未激活用户
DELETE FROM auth.users 
WHERE email_confirmed_at IS NULL 
AND created_at < NOW() - INTERVAL '7 days';
```

### 2. 保留最近注册的用户

不要删除最近注册的用户，给用户时间验证邮箱：

```sql
-- 只删除 7 天前的未激活用户
AND created_at < NOW() - INTERVAL '7 days'
```

### 3. 备份重要数据

删除前可以导出数据：

```sql
-- 导出未激活用户列表
COPY (
  SELECT id, email, created_at 
  FROM auth.users 
  WHERE email_confirmed_at IS NULL
) TO '/tmp/inactive_users.csv' WITH CSV HEADER;
```

### 4. 使用 Supabase Dashboard

也可以通过 Supabase Dashboard 手动删除：

1. 进入 Authentication → Users
2. 筛选未验证的用户
3. 批量删除

## 注意事项

### ⚠️ 级联删除

删除 `auth.users` 中的记录会：
- ✅ 自动删除 `profiles` 中的记录（因为有外键约束 `ON DELETE CASCADE`）
- ✅ 自动删除 `team_members` 中的记录
- ✅ 自动删除其他关联数据

### ⚠️ 数据一致性

如果手动删除了 `profiles` 但没有删除 `auth.users`：
- 会导致数据不一致
- 需要使用清理脚本清理孤立的记录

### ⚠️ 无法恢复

删除后无法恢复，建议：
- 删除前先备份
- 只删除确定不需要的用户
- 保留最近注册的用户

## 自动化清理（可选）

如果需要自动化清理，可以创建定时任务：

```sql
-- 创建清理函数
CREATE OR REPLACE FUNCTION cleanup_inactive_users()
RETURNS void AS $$
BEGIN
  -- 删除 7 天前注册的未激活用户
  DELETE FROM auth.users 
  WHERE email_confirmed_at IS NULL 
  AND created_at < NOW() - INTERVAL '7 days';
  
  -- 清理孤立的 profiles
  DELETE FROM profiles
  WHERE id NOT IN (SELECT id FROM auth.users);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 使用 pg_cron 定时执行（需要安装扩展）
-- SELECT cron.schedule('cleanup-inactive-users', '0 2 * * 0', 'SELECT cleanup_inactive_users()');
```

## 参考链接

- [Supabase Auth Users](https://supabase.com/docs/guides/auth)
- [PostgreSQL DELETE](https://www.postgresql.org/docs/current/sql-delete.html)

