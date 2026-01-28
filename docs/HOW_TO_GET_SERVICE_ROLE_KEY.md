# 如何获取 Supabase Service Role Key

## 步骤

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 使用你的账号登录

2. **选择项目**
   - 在项目列表中找到你的项目：`kstwkcdmqzvhzjhnaopw`
   - 点击进入项目

3. **进入 API 设置**
   - 在左侧菜单中找到 **Settings**（设置）
   - 点击 **Settings** > **API**

4. **复制 Service Role Key**
   - 在 API 设置页面中，找到 **Project API keys** 部分
   - 找到 **`service_role`** 这一行（注意：不是 `anon` 或 `public`）
   - 点击右侧的 **Reveal**（显示）或 **Copy**（复制）按钮
   - 复制完整的 key（通常以 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 开头）

## 重要提示

⚠️ **安全警告**：
- Service Role Key 拥有**完整数据库权限**，可以绕过所有 RLS（Row Level Security）策略
- **绝对不要**将 Service Role Key 提交到 Git 仓库
- **绝对不要**在前端代码中使用 Service Role Key
- Service Role Key 只在**服务器端**（如 Vercel Serverless Functions）使用

## 配置位置

### 开发环境
将 Service Role Key 添加到 `.env.local` 文件：
```env
VITE_SUPABASE_SERVICE_ROLE_KEY=你的service_role_key
```

### 生产环境（Vercel）
1. 登录 Vercel Dashboard
2. 进入你的项目
3. 点击 **Settings** > **Environment Variables**
4. 添加环境变量：
   - **Name**: `VITE_SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: 你的 service_role_key
   - **Environment**: Production, Preview, Development（根据需要选择）

## 验证配置

在 Vercel Serverless Functions 中，可以通过以下方式验证：
```typescript
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Service Role Key 未配置');
}
```

