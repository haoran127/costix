# 同步数据失败排查指南

## 常见问题

### 1. 认证失败（401 Unauthorized）

**症状：**
- 同步时返回 401 错误
- 控制台显示 "未授权：请提供有效的认证 token"

**原因：**
- 用户未登录或 session 过期
- Authorization header 未正确传递

**解决方案：**
1. 确认用户已登录
2. 刷新页面重新获取 session
3. 检查浏览器控制台的 Network 标签，查看请求的 Headers 中是否有 `Authorization: Bearer ...`

### 2. 平台账号未配置

**症状：**
- 提示 "未找到平台账号" 或 "未配置 Admin Key"

**原因：**
- 没有在 Platform Accounts 页面配置平台账号
- 平台账号状态不是 `active`

**解决方案：**
1. 进入 Platform Accounts 页面
2. 添加对应平台的账号配置
3. 确保 Admin API Key 正确
4. 确保账号状态为 `active`

### 3. API 端点不存在（404）

**症状：**
- 返回 404 错误
- 提示 "同步服务未启用"

**原因：**
- Vercel Serverless Function 未部署
- API 路径错误

**解决方案：**
1. 确认已部署到 Vercel
2. 检查 `api/` 目录下的文件是否存在
3. 检查 `vercel.json` 配置

### 4. Admin Key 无效

**症状：**
- 返回 400/401 错误
- 提示 "Admin Key 无效" 或 "认证失败"

**原因：**
- Admin API Key 错误或已过期
- Key 权限不足

**解决方案：**
1. 检查 Admin Key 是否正确
2. 确认 Key 有足够的权限
3. 重新生成 Admin Key 并更新配置

### 5. 网络错误

**症状：**
- 请求超时
- CORS 错误
- 网络连接失败

**原因：**
- 网络问题
- Vercel 服务不可用
- 防火墙阻止

**解决方案：**
1. 检查网络连接
2. 检查 Vercel 服务状态
3. 检查浏览器控制台的错误信息

## 排查步骤

### 步骤 1：检查浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 进入 Network 标签
3. 点击同步按钮
4. 查看失败的请求：
   - 状态码（401/404/500 等）
   - 响应内容
   - 请求 Headers

### 步骤 2：检查平台账号配置

1. 进入 Platform Accounts 页面
2. 确认已配置对应平台的账号
3. 确认账号状态为 `active`
4. 确认 Admin API Key 正确

### 步骤 3：检查用户登录状态

1. 确认用户已登录
2. 检查 localStorage 中是否有 session
3. 尝试刷新页面重新登录

### 步骤 4：检查 API 端点

确认以下 API 端点存在：
- `/api/openai/sync-usage`
- `/api/openai/sync-costs`
- `/api/claude/sync-data`
- `/api/claude/sync-costs`
- `/api/volcengine/sync-data`

### 步骤 5：检查 Vercel 部署

1. 确认代码已部署到 Vercel
2. 检查 Vercel Dashboard 中的 Functions 日志
3. 查看是否有错误信息

## 各平台同步要求

### OpenAI
- ✅ 需要 Admin Key
- ✅ 需要 Project ID（可选，如果账号配置了）
- ✅ 需要用户认证

### Claude (Anthropic)
- ✅ 需要 Admin Key
- ✅ 需要用户认证

### OpenRouter
- ✅ 需要 Admin Key
- ✅ 需要用户认证

### Volcengine
- ✅ 需要 AccessKeyId 和 SecretAccessKey（格式：`AK:SK`）
- ✅ 需要用户认证

## 调试技巧

### 1. 查看详细错误信息

在浏览器控制台查看完整的错误堆栈：
```javascript
// 在控制台执行
localStorage.getItem('supabase.auth.token')
```

### 2. 测试 API 端点

使用 curl 或 Postman 测试 API：
```bash
curl -X POST https://your-domain.vercel.app/api/openai/sync-usage \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"admin_key": "YOUR_ADMIN_KEY"}'
```

### 3. 检查 Vercel 日志

1. 登录 Vercel Dashboard
2. 进入项目 → Functions
3. 查看同步 API 的日志
4. 查找错误信息

## 常见错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| 401 | 未授权 | 检查用户登录状态 |
| 404 | 未找到 | 检查 API 端点是否存在 |
| 400 | 请求错误 | 检查请求参数是否正确 |
| 500 | 服务器错误 | 查看 Vercel 日志 |
| 429 | 请求过多 | 等待后重试 |

## 参考链接

- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [Vercel Functions 文档](https://vercel.com/docs/functions)
- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)

