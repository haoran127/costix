# 从 store-console 迁移功能对比

## 📋 概述

本文档对比了 `store-console` 和 `keypilot` 两个项目中 LLM Key 管理功能的差异，列出了需要迁移的功能。

---

## 🔍 功能对比

### ✅ 已实现的功能

| 功能 | store-console | keypilot | 状态 |
|------|--------------|----------|------|
| OpenAI Key 创建 | ✅ | ✅ | 已迁移 |
| OpenAI Key 删除 | ✅ | ✅ | 已迁移 |
| OpenAI Key 列表 | ✅ | ✅ | 已迁移 |
| OpenAI 项目列表 | ✅ | ✅ | 已迁移 |
| OpenAI 用量同步 | ✅ | ✅ | 已迁移 |
| Claude Key 管理 | ✅ | ✅ | 已迁移 |
| Claude 数据同步 | ✅ | ✅ | 已迁移 |
| OpenRouter Key 管理 | ✅ | ✅ | 已迁移 |
| 平台账号配置 | ✅ | ✅ | 已迁移 |

### ❌ 缺失的功能

| 功能 | store-console | keypilot | 优先级 |
|------|--------------|----------|--------|
| **费用同步（Costs Sync）** | ✅ | ❌ | 🔴 高 |
| - OpenAI 费用同步 | ✅ | ❌ | 🔴 高 |
| - Claude 费用同步 | ✅ | ❌ | 🔴 高 |
| **火山引擎（Volcengine）支持** | ✅ | ❌ | 🟡 中 |
| - 创建 AccessKey | ✅ | ❌ | 🟡 中 |
| - 删除 AccessKey | ✅ | ❌ | 🟡 中 |
| - 列出 AccessKeys | ✅ | ❌ | 🟡 中 |
| - 同步余额和用量 | ✅ | ❌ | 🟡 中 |
| **数据库视图优化** | ✅ | ⚠️ | 🟢 低 |
| - `llm_api_key_latest_usage` 视图 | ✅ | ⚠️ | 🟢 低 |

---

## 🚀 需要迁移的功能详情

### 1. 费用同步功能（Costs Sync）

#### 1.1 OpenAI 费用同步

**功能描述**：
- 同步 OpenAI 组织级别的费用数据
- 按项目（Project）汇总费用
- 匹配数据库中的 Keys 并更新费用

**API 端点**：
- store-console: `POST /api/openai/sync-costs` (通过 n8n)
- keypilot: 需要创建 `api/openai/sync-costs.ts`

**返回数据**：
```typescript
{
  success: boolean;
  summary?: {
    total_cost_usd: string;
    month_cost_usd: string;
    today_cost_usd: string;
  };
  matched_keys?: Array<{
    project_id: string;
    project_name: string;
    name: string;
    db_id: string;
    month_cost: string;
    today_cost: string;
    keys_in_project: number;
  }>;
  synced_at?: string;
  error?: string;
}
```

**实现位置**：
- store-console: `src/services/api.ts` - `syncOpenAICosts()`
- store-console: `n8n-workflows/llm-api-keys/openai-sync-costs.json`
- store-console: `src/pages/ApiKeys.tsx` - `syncCostsData()`

#### 1.2 Claude 费用同步

**功能描述**：
- 同步 Claude 组织级别的费用数据
- 按工作空间（Workspace）汇总费用
- 匹配数据库中的 Keys 并更新费用

**API 端点**：
- store-console: `POST /api/claude/sync-costs` (通过 n8n)
- keypilot: 需要创建 `api/claude/sync-costs.ts`

**返回数据**：
```typescript
{
  success: boolean;
  summary?: {
    total_cost_usd: string;
    month_cost_usd: string;
    today_cost_usd: string;
  };
  matched_keys?: Array<{
    workspace_id: string;
    name: string;
    db_id: string;
    month_cost: string;
    today_cost: string;
    keys_in_workspace: number;
  }>;
  synced_at?: string;
  error?: string;
}
```

**实现位置**：
- store-console: `src/services/api.ts` - `syncClaudeCosts()`
- store-console: `n8n-workflows/llm-api-keys/claude-sync-costs.json`
- store-console: `src/pages/ApiKeys.tsx` - `syncCostsData()`

---

### 2. 火山引擎（Volcengine）支持

#### 2.1 功能概述

火山引擎是字节跳动的云服务平台，提供 AI 服务。需要支持：
- 创建 AccessKey（通过 IAM API）
- 删除 AccessKey
- 列出 AccessKeys
- 同步余额和用量数据

#### 2.2 API 签名

火山引擎使用 AWS Signature V4 风格的签名算法，需要实现：
- HMAC-SHA256 签名
- 时间戳生成
- 规范请求构建

**实现位置**：
- store-console: `n8n-workflows/llm-api-keys/volcengine-manage-keys.json` - 包含完整的签名逻辑
- store-console: `src/services/api.ts` - `createVolcengineKey()`, `deleteVolcengineKey()`, `listVolcengineKeys()`, `syncVolcengineData()`

#### 2.3 平台账号配置

火山引擎的 Admin Key 格式为：`access_key_id:secret_access_key`

**实现位置**：
- store-console: `src/pages/ApiKeys.tsx` - 处理 `volcengine` 平台的特殊逻辑

---

### 3. 数据库视图优化

#### 3.1 `llm_api_key_latest_usage` 视图

**功能描述**：
- 快速查询每个 Key 的最新用量数据
- 避免每次查询都要 JOIN 和排序

**SQL 定义**：
```sql
CREATE OR REPLACE VIEW llm_api_key_latest_usage AS
SELECT DISTINCT ON (api_key_id) *
FROM llm_api_key_usage
ORDER BY api_key_id, synced_at DESC;
```

**使用位置**：
- store-console: `src/services/api.ts` - `getLLMApiKeys()` 中使用此视图

**优势**：
- 提高查询性能
- 简化代码逻辑
- 统一数据格式

---

## 📝 迁移步骤建议

### 阶段 1：费用同步功能（高优先级）

1. **创建 OpenAI 费用同步 API**
   - 创建 `api/openai/sync-costs.ts`
   - 实现费用数据获取和匹配逻辑
   - 更新数据库中的费用字段

2. **创建 Claude 费用同步 API**
   - 创建 `api/claude/sync-costs.ts`
   - 实现费用数据获取和匹配逻辑
   - 更新数据库中的费用字段

3. **前端集成**
   - 在 `src/services/api.ts` 中添加 `syncOpenAICosts()` 和 `syncClaudeCosts()`
   - 在 `src/pages/ApiKeys.tsx` 中添加费用同步按钮和逻辑

### 阶段 2：火山引擎支持（中优先级）

1. **创建火山引擎 API**
   - 创建 `api/volcengine/manage-keys.ts`
   - 实现 AWS Signature V4 签名算法
   - 实现创建、删除、列出 AccessKey 的功能

2. **创建火山引擎数据同步 API**
   - 创建 `api/volcengine/sync-data.ts`
   - 实现余额和用量数据同步

3. **前端集成**
   - 在 `src/services/api.ts` 中添加火山引擎相关函数
   - 在 `src/pages/ApiAccounts.tsx` 中添加火山引擎平台支持
   - 在 `src/pages/ApiKeys.tsx` 中添加火山引擎 Key 管理

### 阶段 3：数据库优化（低优先级）

1. **创建数据库视图**
   - 在迁移文件中添加 `llm_api_key_latest_usage` 视图
   - 更新 `getLLMApiKeys()` 函数使用此视图

---

## 🔗 参考文件

### store-console 中的相关文件

**API 服务层**：
- `store-console/src/services/api.ts` - 所有 API 调用函数
- `store-console/src/pages/ApiKeys.tsx` - Key 管理页面

**n8n Workflows**：
- `store-console/n8n-workflows/llm-api-keys/openai-sync-costs.json`
- `store-console/n8n-workflows/llm-api-keys/claude-sync-costs.json`
- `store-console/n8n-workflows/llm-api-keys/volcengine-manage-keys.json`
- `store-console/n8n-workflows/llm-api-keys/volcengine-sync-data.json`

**数据库迁移**：
- `store-console/supabase/migrations/20260122_llm_api_keys.sql` - 包含视图定义

---

## ✅ 迁移检查清单

- [ ] OpenAI 费用同步 API (`api/openai/sync-costs.ts`)
- [ ] Claude 费用同步 API (`api/claude/sync-costs.ts`)
- [ ] 前端费用同步功能 (`src/services/api.ts`, `src/pages/ApiKeys.tsx`)
- [ ] 火山引擎管理 API (`api/volcengine/manage-keys.ts`)
- [ ] 火山引擎数据同步 API (`api/volcengine/sync-data.ts`)
- [ ] 火山引擎前端支持 (`src/pages/PlatformAccounts.tsx`, `src/pages/ApiKeys.tsx`)
- [ ] 数据库视图优化 (`llm_api_key_latest_usage`)
- [ ] 更新 `getLLMApiKeys()` 使用新视图

---

## 📌 注意事项

1. **API 签名**：火山引擎使用 AWS Signature V4，需要仔细实现签名算法
2. **费用数据格式**：不同平台的费用数据格式可能不同，需要统一处理
3. **错误处理**：费用同步可能失败，需要完善的错误处理和重试机制
4. **性能优化**：费用同步可能涉及大量数据，需要考虑批量处理和性能优化
5. **数据匹配**：需要准确匹配平台返回的 Key 和数据库中的 Key

