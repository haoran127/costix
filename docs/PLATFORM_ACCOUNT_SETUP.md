# 平台账号配置指南

> 配置 OpenAI、Claude、OpenRouter 等平台的账号信息，用于通过 API 创建和管理 Key

## 📋 概述

为了通过 API 创建和管理 AI 平台的 API Key，您需要先配置平台的**管理员账号信息**。这些信息存储在租户级别，只有管理员可以配置。

---

## 🔑 OpenAI 平台配置

### 所需信息

1. **Admin API Key**（必需）
   - 用于调用 OpenAI API 创建和管理 Service Account
   - 需要具有 `api.management.write` 权限
   - 获取方式：
     - 登录 [OpenAI Platform](https://platform.openai.com/)
     - 进入 **Settings** > **API keys**
     - 创建新的 API Key，确保勾选 **Management API** 权限
     - 复制完整的 Key（格式：`sk-...`）

2. **Organization ID**（可选）
   - OpenAI 组织 ID
   - 如果您的账号属于某个组织，需要填写
   - 获取方式：
     - 登录 OpenAI Platform
     - 在页面右上角查看组织名称
     - 或在 API 调用响应中获取

3. **Project ID**（必需）
   - OpenAI Project ID
   - 用于指定在哪个 Project 下创建 Service Account
   - 获取方式：
     - 登录 OpenAI Platform
     - 进入 **Projects** 页面
     - 选择或创建一个 Project
     - 在 Project 设置中查看 Project ID

### 配置步骤

1. 进入 **设置** > **平台账号配置**
2. 选择 **OpenAI** 平台
3. 填写：
   - **账号名称**：如 "公司主账号"、"开发环境账号"
   - **Admin API Key**：完整的 API Key
   - **Organization ID**：如有组织，填写组织 ID
   - **Project ID**：项目 ID
4. 点击 **保存并验证**
5. 系统会自动验证配置是否正确

### 权限要求

Admin API Key 需要以下权限：
- ✅ `api.management.write` - 创建和管理 Service Account
- ✅ `api.management.read` - 读取项目信息
- ✅ `api.organization.read` - 读取组织信息（如使用组织）

---

## 🤖 Claude (Anthropic) 平台配置

### 所需信息

1. **Admin API Key**（必需）
   - Anthropic API Key
   - 需要具有创建和管理 Key 的权限
   - 获取方式：
     - 登录 [Anthropic Console](https://console.anthropic.com/)
     - 进入 **API Keys**
     - 创建新的 API Key
     - 复制完整的 Key（格式：`sk-ant-...`）

2. **Organization ID**（可选）
   - Anthropic 组织 ID（如适用）

### 配置步骤

1. 进入 **设置** > **平台账号配置**
2. 选择 **Claude (Anthropic)** 平台
3. 填写：
   - **账号名称**：如 "Claude 主账号"
   - **Admin API Key**：完整的 API Key
   - **Organization ID**：如有组织，填写组织 ID
4. 点击 **保存并验证**

---

## 🌐 OpenRouter 平台配置

### 所需信息

1. **Admin API Key**（必需）
   - OpenRouter API Key
   - 获取方式：
     - 登录 [OpenRouter](https://openrouter.ai/)
     - 进入 **Keys** 页面
     - 创建新的 API Key
     - 复制完整的 Key

### 配置步骤

1. 进入 **设置** > **平台账号配置**
2. 选择 **OpenRouter** 平台
3. 填写：
   - **账号名称**：如 "OpenRouter 账号"
   - **Admin API Key**：完整的 API Key
4. 点击 **保存并验证**

---

## 🔒 安全说明

### 数据存储

- ✅ **加密存储**：所有 Admin API Key 均加密存储在数据库中
- ✅ **租户隔离**：每个租户的配置相互隔离，无法访问其他租户的配置
- ✅ **权限控制**：只有租户管理员可以配置和查看平台账号信息

### 最佳实践

1. **使用专用 Key**：为 Costix 平台创建专用的 Admin API Key，不要使用生产环境的 Key
2. **定期轮换**：建议每 3-6 个月轮换一次 Admin API Key
3. **最小权限**：只授予必要的权限，避免过度授权
4. **监控使用**：定期检查 Admin Key 的使用情况，发现异常及时处理

---

## ❓ 常见问题

### Q1: 为什么需要配置平台账号？

**A:** 通过配置平台账号，Costix 可以：
- 自动创建新的 API Key（无需手动操作）
- 同步用量和余额信息
- 管理 Key 的生命周期
- 提供统一的 Key 管理界面

### Q2: Admin API Key 和普通 API Key 有什么区别？

**A:** 
- **Admin API Key**：用于管理操作（创建 Key、查询项目等），权限更高
- **普通 API Key**：用于调用 AI 模型，权限较低

### Q3: 配置后如何验证是否成功？

**A:** 系统会自动验证：
- 检查 API Key 是否有效
- 验证权限是否足够
- 测试是否可以访问项目/组织
- 验证通过后，状态会显示为 "已激活"

### Q4: 可以配置多个平台账号吗？

**A:** 可以。每个平台可以配置多个账号，例如：
- OpenAI 开发环境账号
- OpenAI 生产环境账号
- Claude 主账号
- Claude 测试账号

创建 Key 时，可以选择使用哪个账号来创建。

### Q5: 配置失败怎么办？

**A:** 常见错误及解决方法：

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| API Key 无效 | Key 格式错误或已过期 | 检查 Key 是否正确，重新生成 |
| 权限不足 | Key 缺少必要权限 | 确保 Key 有 `api.management.write` 权限 |
| 项目不存在 | Project ID 错误 | 检查 Project ID 是否正确 |
| 组织不存在 | Organization ID 错误 | 检查 Organization ID 是否正确 |

### Q6: 配置信息会泄露吗？

**A:** 不会。所有敏感信息：
- ✅ 加密存储在数据库中
- ✅ 只有租户管理员可以查看
- ✅ 不会在前端显示完整 Key
- ✅ 符合数据安全标准

---

## 📝 配置示例

### OpenAI 配置示例

```json
{
  "name": "公司主账号",
  "platform": "openai",
  "admin_api_key": "sk-proj-xxxxxxxxxxxxx",
  "organization_id": "org-xxxxxxxxxxxxx",
  "project_id": "proj_xxxxxxxxxxxxx"
}
```

### Claude 配置示例

```json
{
  "name": "Claude 主账号",
  "platform": "anthropic",
  "admin_api_key": "sk-ant-xxxxxxxxxxxxx"
}
```

### OpenRouter 配置示例

```json
{
  "name": "OpenRouter 账号",
  "platform": "openrouter",
  "admin_api_key": "sk-or-xxxxxxxxxxxxx"
}
```

---

*最后更新：2026-01-28*

