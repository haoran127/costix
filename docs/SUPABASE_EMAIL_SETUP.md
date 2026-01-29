# Supabase 邮件服务配置指南

## 问题说明

注册用户时，如果没有配置邮件服务，Supabase 无法发送验证邮件。

## 解决方案

### 方案一：配置 SMTP 服务器（生产环境推荐）

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择你的项目

2. **进入 Authentication → Settings → SMTP Settings**

3. **配置 SMTP 服务器**

   可以使用以下邮件服务商：

   #### 使用 Gmail（免费）
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: your-email@gmail.com
   SMTP Password: [应用专用密码，不是 Gmail 密码]
   Sender Email: your-email@gmail.com
   Sender Name: KeyPilot
   ```

   **获取 Gmail 应用专用密码：**
   - 登录 Google 账号
   - 进入：https://myaccount.google.com/apppasswords
   - 生成应用专用密码（如果启用了两步验证）

   #### 使用 SendGrid（推荐，免费额度 100 封/天）
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Password: [SendGrid API Key]
   Sender Email: noreply@yourdomain.com
   Sender Name: KeyPilot
   ```

   #### 使用阿里云邮件推送（国内推荐）
   ```
   SMTP Host: smtpdm.aliyun.com
   SMTP Port: 80 或 465
   SMTP User: [阿里云邮件推送账号]
   SMTP Password: [阿里云邮件推送密码]
   Sender Email: noreply@yourdomain.com
   Sender Name: KeyPilot
   ```

   #### 使用腾讯企业邮箱
   ```
   SMTP Host: smtp.exmail.qq.com
   SMTP Port: 465
   SMTP User: your-email@yourdomain.com
   SMTP Password: [企业邮箱密码]
   Sender Email: your-email@yourdomain.com
   Sender Name: KeyPilot
   ```

4. **测试邮件发送**
   - 配置完成后，点击 "Send test email"
   - 检查是否能收到测试邮件

5. **配置邮件模板（可选）**
   - 进入 Authentication → Email Templates
   - 可以自定义验证邮件的模板

### 方案二：禁用邮箱验证（仅开发环境）

如果只是开发测试，可以暂时禁用邮箱验证：

1. **在 Supabase Dashboard**
   - 进入 Authentication → Settings → Auth
   - 找到 "Enable email confirmations"
   - **关闭**邮箱验证

2. **修改代码（可选）**

   如果禁用了邮箱验证，注册后应该直接登录。可以修改 `src/lib/auth.ts`：

   ```typescript
   // 检查是否需要邮箱验证
   if (!authData.session) {
     // 如果禁用了邮箱验证，但仍然没有 session，可能是其他问题
     console.warn('注册成功但未创建 session，可能需要邮箱验证');
   }
   ```

### 方案三：使用 Supabase 内置邮件服务（需要升级）

Supabase 提供内置邮件服务，但需要：
- Pro 计划或以上
- 配置自定义域名

## 验证邮件配置是否生效

1. **注册新用户**
2. **检查邮箱**（包括垃圾邮件文件夹）
3. **查看 Supabase Dashboard → Authentication → Users**
   - 查看用户状态是否为 "Unconfirmed"
   - 如果配置正确，应该会发送邮件

## 常见问题

### Q: 为什么收不到邮件？
- 检查垃圾邮件文件夹
- 确认 SMTP 配置正确
- 检查 Supabase Dashboard 的 Logs 查看错误信息
- 确认发送方邮箱地址正确

### Q: 开发环境如何测试？
- 方案一：使用真实的 SMTP 服务器（如 Gmail）
- 方案二：禁用邮箱验证（仅开发环境）
- 方案三：使用 Supabase CLI 本地开发（会使用 Inbucket 邮件测试工具）

### Q: 如何自定义邮件模板？
- 进入 Authentication → Email Templates
- 可以自定义：
  - 确认邮件模板
  - 密码重置邮件模板
  - 魔法链接邮件模板

## 推荐配置（生产环境）

1. **使用 SendGrid**（免费额度足够小项目使用）
2. **配置自定义域名**（提升邮件送达率）
3. **设置 SPF 和 DKIM 记录**（防止邮件被标记为垃圾邮件）

## 参考链接

- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [SMTP 配置文档](https://supabase.com/docs/guides/auth/auth-smtp)
- [邮件模板文档](https://supabase.com/docs/guides/auth/auth-email-templates)

