# Resend SMTP 配置指南

## Resend 简介

Resend 是一个现代化的邮件服务，支持自定义域名，非常适合 Supabase 的邮件发送需求。

## 在 Supabase 中配置 Resend SMTP

### 步骤 1：获取 Resend SMTP 信息

1. **登录 Resend Dashboard**
   - 访问：https://resend.com/
   - 登录你的账号

2. **获取 API Key**
   - 进入 Settings → API Keys
   - 创建新的 API Key（如果还没有）
   - 复制 API Key（只显示一次，请保存好）

3. **确认域名已验证**
   - 进入 Domains
   - 确认 `costix.net` 已添加并验证
   - 确认 DNS 记录已正确配置

### 步骤 2：在 Supabase 中配置 SMTP

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择你的项目

2. **进入 SMTP 设置**
   - 导航到：Authentication → Settings → SMTP Settings
   - 或者直接访问：`https://supabase.com/dashboard/project/[你的项目ID]/settings/auth`

3. **填写 SMTP 配置**

   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 587 (推荐) 或 465
   SMTP User: resend
   SMTP Password: [你的 Resend API Key]
   Sender Email: noreply@costix.net (或你验证过的其他邮箱)
   Sender Name: KeyPilot (可选)
   ```

   **重要说明：**
   - `SMTP User` 固定为 `resend`
   - `SMTP Password` 是你的 Resend API Key（不是邮箱密码）
   - `Sender Email` 必须是你在 Resend 中验证过的域名邮箱（如 `noreply@costix.net`）

4. **测试邮件发送**
   - 点击 "Send test email"
   - 输入你的邮箱地址
   - 检查是否能收到测试邮件

### 步骤 3：启用邮箱验证（如果之前禁用了）

1. **进入 Auth 设置**
   - Authentication → Settings → Auth
   - 找到 "Enable email confirmations"
   - **启用**邮箱验证

2. **配置邮件模板（可选）**
   - Authentication → Email Templates
   - 可以自定义验证邮件的模板

## Resend SMTP 配置参数

| 参数 | 值 |
|------|-----|
| SMTP Host | `smtp.resend.com` |
| SMTP Port | `587` (TLS) 或 `465` (SSL) |
| SMTP User | `resend` |
| SMTP Password | `[你的 Resend API Key]` |
| Sender Email | `noreply@costix.net` (必须是验证过的域名) |
| Sender Name | `KeyPilot` (可选) |

## 验证配置是否成功

1. **测试注册流程**
   - 在前端注册一个新用户
   - 检查邮箱（包括垃圾邮件文件夹）
   - 应该收到验证邮件

2. **检查 Supabase Logs**
   - 进入 Logs → Auth Logs
   - 查看是否有邮件发送的错误

3. **检查 Resend Dashboard**
   - 进入 Emails
   - 查看邮件发送记录和状态

## 常见问题

### Q: 为什么收不到邮件？
- 检查垃圾邮件文件夹
- 确认 `Sender Email` 是验证过的域名邮箱
- 检查 Resend Dashboard 中的邮件发送状态
- 查看 Supabase Logs 中的错误信息

### Q: SMTP 连接失败？
- 确认 SMTP Port 正确（587 或 465）
- 确认 API Key 正确（不是邮箱密码）
- 确认 `SMTP User` 是 `resend`（固定值）

### Q: 邮件被标记为垃圾邮件？
- 在 Resend 中配置 SPF 和 DKIM 记录
- 使用验证过的域名邮箱作为发件人
- 避免使用 `noreply@` 等常见垃圾邮件关键词（可选）

### Q: 如何自定义邮件模板？
- 在 Supabase Dashboard → Authentication → Email Templates
- 可以自定义 HTML 模板
- 支持变量替换（如 `{{ .ConfirmationURL }}`）

## Resend 的优势

- ✅ 现代化 API，性能优秀
- ✅ 支持自定义域名
- ✅ 详细的发送日志和统计
- ✅ 良好的送达率
- ✅ 免费额度：每月 3,000 封邮件
- ✅ 简单易用的 Dashboard

## 参考链接

- [Resend 文档](https://resend.com/docs)
- [Resend SMTP 文档](https://resend.com/docs/send-with-smtp)
- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)

