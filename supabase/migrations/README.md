# KeyPilot 数据库迁移文件

## 文件结构

迁移文件按逻辑顺序组织，使用数字前缀确保执行顺序：

0. **00_drop_all.sql** - 清理脚本（删除所有旧表、函数、触发器等）⚠️ 会删除所有数据！
1. **01_tables.sql** - 创建所有表结构
2. **02_indexes.sql** - 创建所有索引
3. **03_functions.sql** - 创建所有函数
4. **04_triggers.sql** - 创建所有触发器
5. **05_rls_policies.sql** - 创建所有 RLS 策略

## 使用方法

### 在 Supabase Dashboard 中执行

#### 方式一：完全重建（推荐，如果数据库中有旧数据）

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. **先执行 `00_drop_all.sql`**（⚠️ 这会删除所有数据！）
4. 然后按顺序执行：
   - `01_tables.sql`
   - `02_indexes.sql`
   - `03_functions.sql`
   - `04_triggers.sql`
   - `05_rls_policies.sql`

#### 方式二：增量更新（如果数据库是空的或需要保留数据）

1. 跳过 `00_drop_all.sql`
2. 直接按顺序执行 `01-05` 文件（使用 `CREATE TABLE IF NOT EXISTS` 等安全语句）

### 使用 Supabase CLI

```bash
# 确保已安装 Supabase CLI
supabase db reset

# 或者单独执行迁移
supabase migration up
```

## 数据库结构概览

### 核心表

- **profiles** - 用户信息表（扩展 Supabase Auth）
- **llm_api_keys** - API Key 主表
- **llm_api_key_usage** - Key 用量统计表
- **llm_api_key_owners** - Key 责任人绑定表
- **llm_api_key_logs** - Key 操作日志表
- **llm_platform_accounts** - 平台账号表
- **llm_sync_tasks** - 同步任务表
- **teams** - 团队表
- **team_members** - 团队成员表

### 关键功能

- **多租户支持** - 通过 `tenant_id` 字段实现数据隔离
- **RLS 安全** - Row Level Security 确保数据安全
- **自动触发器** - 新用户注册时自动创建 profile 和团队
- **自动设置 tenant_id** - 插入数据时自动关联租户

## 注意事项

1. **⚠️ 重要：`00_drop_all.sql` 会删除所有数据！** 执行前请确保已备份重要数据
2. **执行顺序很重要** - 如果使用清理脚本，先执行 `00_drop_all.sql`，然后按 01-05 顺序执行
3. **RLS 策略** - 允许查看 `tenant_id` 为 `NULL` 的记录（用于导入的历史数据）
4. **函数依赖** - `public.tenant_id()` 函数用于 RLS 策略中获取当前用户的租户 ID
5. **触发器** - 新用户注册时会自动创建 profile 和个人团队

## 故障排查

如果遇到问题：

1. 检查是否按顺序执行了所有文件
2. 确认 Supabase 项目已启用 Auth
3. 检查 RLS 策略是否正确应用
4. 查看 Supabase Dashboard 的日志

