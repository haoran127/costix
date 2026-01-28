# 新 Supabase 数据库设置指南

## 数据库信息

- **Project URL**: `https://kstwkcdmqzvhzjhnaopw.supabase.co`
- **Publishable API Key**: `sb_publishable_a4OgtF849KzkuxtncWrLxg_cBQJv0-I`

## 设置步骤

### 1. 在 Supabase Dashboard 中执行 SQL 脚本

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择项目 `kstwkcdmqzvhzjhnaopw`
3. 进入 **SQL Editor**
4. 打开文件 `supabase/migrations/init_new_database.sql`
5. 复制全部内容并执行

### 2. 获取 Service Role Key

1. 在 Supabase Dashboard 中，进入 **Settings** > **API**
2. 找到 **service_role** key（⚠️ 保密，不要泄露）
3. 复制该 key

### 3. 更新环境变量

更新 `.env` 文件（或创建新的）：

```env
# Supabase 配置
VITE_SUPABASE_URL=https://kstwkcdmqzvhzjhnaopw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_a4OgtF849KzkuxtncWrLxg_cBQJv0-I
VITE_SUPABASE_SERVICE_ROLE_KEY=<你的 service_role key>

# 认证模式
VITE_AUTH_MODE=supabase

# 开发模式（可选）
VITE_SKIP_AUTH=false
```

### 4. 更新 n8n 工作流配置

如果使用 n8n 工作流，需要更新以下配置：

- 所有 Supabase 节点中的：
  - **Project URL**: `https://kstwkcdmqzvhzjhnaopw.supabase.co`
  - **Service Role Key**: 使用新的 service_role key

### 5. 验证设置

1. 重启开发服务器：`npm run dev`
2. 测试注册/登录功能
3. 测试创建 API Key 功能
4. 检查数据库表是否正确创建

## 数据库表结构

### 核心表

- **profiles** - 用户信息表
- **llm_api_keys** - API Key 主表
- **llm_api_key_usage** - 用量统计表
- **llm_platform_accounts** - 平台账号表
- **teams** - 团队表
- **team_members** - 团队成员表

### 安全特性

- ✅ Row Level Security (RLS) 已启用
- ✅ 所有表都有 RLS 策略保护
- ✅ 多租户支持（tenant_id）
- ✅ 自动触发器设置

## 注意事项

1. **Service Role Key** 具有完全访问权限，请妥善保管
2. **Anon Key** 是公开的，但受 RLS 保护
3. 新用户注册时会自动创建个人团队
4. 所有数据操作都受 RLS 策略限制

## 故障排查

### 问题：无法创建表

- 检查是否有足够的数据库权限
- 确认 SQL 脚本语法正确

### 问题：RLS 策略阻止访问

- 检查用户是否已登录
- 确认 RLS 策略是否正确配置
- 使用 Service Role Key 的服务端操作不受 RLS 限制

### 问题：触发器未执行

- 检查触发器是否正确创建
- 确认函数权限设置正确

## 迁移旧数据（可选）

如果需要从旧数据库迁移数据：

1. 导出旧数据库数据
2. 使用 Supabase Dashboard 的 **Database** > **Import** 功能
3. 或编写迁移脚本

## 联系支持

如有问题，请检查：
- Supabase Dashboard 的日志
- 浏览器控制台错误
- 网络请求状态

