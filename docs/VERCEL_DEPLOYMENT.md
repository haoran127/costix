# Vercel 部署指南

本文档说明如何将 Costix 应用部署到 Vercel，包括前端和 serverless API functions。

## 前置要求

1. Vercel 账号（https://vercel.com）
2. GitHub/GitLab/Bitbucket 账号（用于连接代码仓库）
3. Supabase 项目已配置完成

## 部署步骤

### 1. 准备环境变量

在 Vercel 项目设置中添加以下环境变量：

#### 必需的环境变量

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 可选的环境变量

```
VITE_AUTH_MODE=supabase
VITE_SKIP_AUTH=false
VITE_API_BASE_URL=/api
```

**注意**：
- `VITE_SUPABASE_SERVICE_ROLE_KEY` 用于 serverless functions 访问数据库
- 在生产环境中，`VITE_SKIP_AUTH` 应设置为 `false` 或删除
- `VITE_API_BASE_URL` 默认为 `/api`，如果使用自定义域名，可以设置为完整 URL

### 2. 连接代码仓库

1. 登录 Vercel Dashboard
2. 点击 "Add New Project"
3. 选择你的代码仓库（GitHub/GitLab/Bitbucket）
4. 选择项目根目录

### 3. 配置构建设置

Vercel 会自动检测项目类型，但请确保以下设置：

- **Framework Preset**: Vite
- **Root Directory**: `./`（项目根目录）
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4. 部署

1. 点击 "Deploy" 开始部署
2. 等待构建完成
3. 部署成功后，Vercel 会提供一个预览 URL

## API Routes 说明

所有 API routes 位于 `api/` 目录下：

### OpenAI API Routes

- `POST /api/openai/create-key` - 创建 OpenAI API Key
- `POST /api/openai/delete-key` - 删除 OpenAI API Key
- `POST /api/openai/list-keys` - 列出 OpenAI API Keys
- `POST /api/openai/list-projects` - 列出 OpenAI Projects
- `POST /api/openai/sync-usage` - 同步 OpenAI 用量数据

### Claude API Routes

- `POST /api/claude/manage-keys` - 管理 Claude API Keys（import/delete/update/verify）
- `POST /api/claude/sync-data` - 同步 Claude 数据（keys/workspaces/usage）

### OpenRouter API Routes

- `POST /api/openrouter/manage-keys` - 管理 OpenRouter API Keys（list/create/delete/update）

## 本地开发

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

前端会在 `http://localhost:5173` 运行。

### 测试 API Routes（本地）

Vercel CLI 可以模拟 serverless functions：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目根目录运行
vercel dev
```

这会启动一个本地服务器，可以测试 API routes。

## 环境变量配置

### 开发环境

在项目根目录创建 `.env.local` 文件：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_AUTH_MODE=supabase
VITE_SKIP_AUTH=true
VITE_API_BASE_URL=http://localhost:3000/api
```

### 生产环境

在 Vercel Dashboard 的 Project Settings > Environment Variables 中配置。

## 注意事项

1. **Serverless Function 超时**：
   - 默认超时时间为 10 秒（Hobby 计划）
   - Pro 计划可以设置为 60 秒
   - `sync-usage` API 可能需要较长时间，已在 `vercel.json` 中配置为 60 秒

2. **环境变量**：
   - 所有 `VITE_*` 前缀的环境变量会在构建时注入到前端代码
   - `VITE_SUPABASE_SERVICE_ROLE_KEY` 只在 serverless functions 中使用，不会暴露到前端

3. **API 路由**：
   - 所有 API routes 使用 POST 方法
   - 请求体为 JSON 格式
   - 响应为 JSON 格式

4. **CORS**：
   - Vercel 自动处理 CORS
   - 如果使用自定义域名，确保域名已添加到 Vercel 项目

## 故障排查

### API Routes 返回 404

- 检查 `vercel.json` 配置是否正确
- 确认 API 文件路径与路由匹配
- 检查 Vercel 部署日志

### 环境变量未生效

- 确认环境变量名称以 `VITE_` 开头（前端使用）
- 在 Vercel Dashboard 重新部署项目
- 检查 `.env.local` 文件是否在 `.gitignore` 中

### Serverless Function 超时

- 检查 `vercel.json` 中的 `maxDuration` 设置
- 考虑优化 API 逻辑或使用 Vercel Pro 计划

## 相关文档

- [Vercel 文档](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Supabase 文档](https://supabase.com/docs)

