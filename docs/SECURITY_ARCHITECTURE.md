# Costix 安全架构

## 📋 目录

- [Supabase 密钥说明](#supabase-密钥说明)
- [RLS 安全机制](#rls-安全机制)
- [数据访问控制](#数据访问控制)
- [安全配置清单](#安全配置清单)

---

## Supabase 密钥说明

Supabase 提供两种密钥，它们的用途完全不同：

| 密钥类型 | 安全级别 | 用途 | 是否可公开 |
|----------|----------|------|------------|
| **anon_key** | 🟢 公开 | 前端使用，受 RLS 限制 | ✅ 可以 |
| **service_role_key** | 🔴 机密 | 后端使用，绕过 RLS | ❌ 绝对不能 |

### anon_key（公开密钥）

```
特点：
- 设计为可以公开（会嵌入前端代码）
- 受 RLS 策略完全限制
- 只能执行数据库允许的操作
- 泄露风险：低（本来就是公开的）
```

### service_role_key（服务密钥）

```
特点：
- 绝对不能暴露到前端
- 完全绕过 RLS，拥有管理员权限
- 只能在后端/服务器使用
- 泄露风险：极高（可访问所有数据）
```

---

## RLS 安全机制

### 什么是 RLS？

**Row Level Security（行级安全策略）** 是 PostgreSQL 的安全特性，在数据库层面控制数据访问。

### RLS 工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                        用户请求流程                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  前端应用                                                    │
│     │                                                       │
│     ▼                                                       │
│  ┌─────────────┐                                           │
│  │  anon_key   │ ← 公开密钥，嵌入前端                        │
│  └──────┬──────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐                                           │
│  │  JWT Token  │ ← 用户登录后获取，包含 user_id             │
│  └──────┬──────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────┐               │
│  │          Supabase PostgREST             │               │
│  │  ┌─────────────────────────────────┐    │               │
│  │  │       RLS 策略检查              │    │               │
│  │  │                                 │    │               │
│  │  │  WHERE tenant_id = user的租户   │    │               │
│  │  │    OR created_by = user_id      │    │               │
│  │  └─────────────────────────────────┘    │               │
│  └──────────────────┬──────────────────────┘               │
│                     │                                       │
│                     ▼                                       │
│  ┌─────────────────────────────────────────┐               │
│  │              PostgreSQL                  │               │
│  │                                          │               │
│  │  只返回 RLS 策略允许的数据行              │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### anon_key 泄露时的安全性

| 攻击场景 | 结果 | 原因 |
|----------|------|------|
| 未登录用户使用 anon_key 查询数据 | ❌ 无法访问 | 没有 JWT，RLS 策略 `auth.uid()` 返回 NULL |
| 使用伪造的 JWT | ❌ 无法访问 | JWT 由 Supabase 签名，无法伪造 |
| 已登录用户 A 查询用户 B 的数据 | ❌ 无法访问 | RLS 策略限制只能访问自己租户的数据 |
| 已登录用户查询自己的数据 | ✅ 可以访问 | RLS 策略允许 |

---

## 数据访问控制

### 当前 RLS 策略设计

#### profiles（用户信息）

| 操作 | 权限规则 |
|------|----------|
| SELECT | 只能查看自己的 profile，或同租户成员 |
| UPDATE | 只能更新自己的 profile |

#### llm_api_keys（API 密钥）

| 操作 | 权限规则 |
|------|----------|
| SELECT | 同租户成员可查看，或自己创建的 |
| INSERT | 已认证用户可创建 |
| UPDATE | 同租户成员可更新 |
| DELETE | 只有创建者或管理员 |

#### llm_platform_accounts（平台账号）

| 操作 | 权限规则 |
|------|----------|
| SELECT | 同租户成员可查看 |
| INSERT/UPDATE/DELETE | 只有管理员 |

#### llm_api_key_usage（用量统计）

| 操作 | 权限规则 |
|------|----------|
| SELECT | 关联到用户可访问的 key |
| INSERT | 通过 service_role（n8n 同步） |

### 多租户隔离

```sql
-- 每个请求都会自动添加租户过滤
SELECT * FROM llm_api_keys
WHERE tenant_id = auth.tenant_id()  -- RLS 自动添加
```

---

## 安全配置清单

### ✅ 必须完成的配置

| 步骤 | 状态 | 说明 |
|------|------|------|
| 启用 RLS | ⬜ 待执行 | 执行 `20260127_enable_rls.sql` |
| 前端移除 service_role_key | ⬜ 待检查 | 前端只能使用 anon_key |
| n8n 使用环境变量 | ⬜ 待配置 | 不要硬编码 service_role_key |

### 执行 RLS 迁移

**方式 1：Supabase Dashboard**

1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 进入项目 → SQL Editor
3. 粘贴 `supabase/migrations/20260127_enable_rls.sql` 内容
4. 点击 Run

**方式 2：Supabase CLI**

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 关联项目
supabase link --project-ref your-project-id

# 执行迁移
supabase db push
```

### 验证 RLS 是否生效

```sql
-- 在 Supabase SQL Editor 中执行
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
  'llm_api_keys', 
  'llm_platform_accounts', 
  'profiles'
);

-- 期望结果：rowsecurity = true
```

### 测试 RLS 策略

```sql
-- 1. 以匿名用户身份查询（应返回空）
SET ROLE anon;
SELECT * FROM llm_api_keys;  -- 期望：0 行

-- 2. 重置角色
RESET ROLE;
```

---

## 常见问题

### Q: anon_key 泄露了怎么办？

**A**: 如果已正确配置 RLS，anon_key 泄露是**没有风险的**。因为：
- 未认证用户无法访问任何数据
- 已认证用户只能访问自己的数据

如果担心，可以在 Supabase Dashboard 重新生成 anon_key。

### Q: service_role_key 泄露了怎么办？

**A**: 这是严重的安全事故！立即：
1. 在 Supabase Dashboard 重新生成密钥
2. 更新所有使用该密钥的服务（n8n、后端等）
3. 审计数据库操作日志

### Q: 为什么前端不能使用 service_role_key？

**A**: service_role_key 绕过所有 RLS 策略，相当于数据库管理员权限。放在前端 = 把数据库密码公开。

### Q: RLS 会影响性能吗？

**A**: 影响很小。PostgreSQL 的 RLS 在执行计划阶段就会优化，几乎等同于 WHERE 子句。

