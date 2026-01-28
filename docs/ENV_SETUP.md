# 环境变量配置指南

## 必需的环境变量

在项目根目录创建 `.env.local` 文件（此文件不会被提交到 Git），并添加以下内容：

```env
# Supabase 配置（新项目）
VITE_SUPABASE_URL=https://kstwkcdmqzvhzjhnaopw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_a4OgtF849KzkuxtncWrLxg_cBQJv0-I
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# 认证模式
VITE_AUTH_MODE=supabase

# 开发模式（可选）
VITE_SKIP_AUTH=false

# API Base URL（可选，默认为 /api）
VITE_API_BASE_URL=/api
```

## 重要提示

1. **`.env.local` 文件优先级最高**：如果存在 `.env.local`，Vite 会优先使用它
2. **重启开发服务器**：修改环境变量后，需要重启 `npm run dev`
3. **清除浏览器缓存**：如果还是连接到旧的 Supabase，请清除浏览器缓存或使用无痕模式
4. **检查控制台**：打开浏览器控制台，查看实际使用的 Supabase URL

## 验证配置

在浏览器控制台中运行以下代码，检查当前使用的 Supabase URL：

```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

## 获取 Service Role Key

1. 登录 Supabase Dashboard: https://supabase.com/dashboard
2. 选择你的项目
3. 进入 Settings > API
4. 复制 `service_role` key（注意：这个 key 有完整权限，不要暴露到前端）

## 部署到 Vercel

在 Vercel Dashboard 中设置环境变量：
1. 进入项目设置 > Environment Variables
2. 添加所有 `VITE_*` 开头的环境变量
3. 重新部署项目

