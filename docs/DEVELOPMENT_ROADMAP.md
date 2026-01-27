# KeyPilot 开发路线图

> 最后更新：2026-01-27

## 📊 当前功能清单

### 已实现功能

| 模块 | 功能 | 状态 | 备注 |
|-----|------|------|------|
| **认证** | Mind OIDC 登录 | ✅ | 支持切换账号、退出登录 |
| **仪表盘** | 统计卡片（5个） | ✅ | Keys总数、活跃数、余额、消耗、Tokens |
| **仪表盘** | 平台分布图 | ✅ | 按平台展示 Key 数量占比 |
| **仪表盘** | 最近添加列表 | ✅ | 显示最近5条记录 |
| **密钥管理** | Key 列表展示 | ✅ | 支持搜索、筛选、排序 |
| **密钥管理** | 创建 Key (API) | ✅ | 通过 OpenAI/OpenRouter API 创建 |
| **密钥管理** | 手动导入 Key | ✅ | 支持所有平台 |
| **密钥管理** | 删除 Key | ✅ | 支持平台同步删除 |
| **密钥管理** | 编辑责任人 | ✅ | 支持姓名+联系方式 |
| **密钥管理** | 编辑业务用途 | ✅ | 行内编辑 |
| **密钥管理** | 复制 Key | ⚠️ | 仅支持有完整密钥的 Key |
| **数据同步** | 自动同步 (OpenAI) | ✅ | 进入页面时自动触发 |
| **数据同步** | 手动同步 | ✅ | 支持 OpenAI/Claude/OpenRouter |
| **平台支持** | OpenAI | ✅ | 完整支持（创建、删除、同步） |
| **平台支持** | Claude (Anthropic) | ✅ | 支持同步用量、更新状态 |
| **平台支持** | OpenRouter | ✅ | 完整支持（创建、删除、同步） |
| **平台支持** | 阿里通义/火山/DeepSeek | 🔸 | 仅支持手动导入 |

### 数据库表结构

| 表名 | 说明 | 使用状态 |
|-----|------|----------|
| `llm_api_keys` | API Key 主表 | ✅ 使用中 |
| `llm_api_key_usage` | 用量统计表 | ✅ 使用中 |
| `llm_api_key_owners` | 责任人绑定表 | ✅ 使用中 |
| `llm_api_key_logs` | 操作日志表 | ❌ 未使用 |
| `llm_platform_accounts` | 平台账号表 | ✅ 使用中 |
| `llm_sync_tasks` | 同步任务表 | ❌ 未使用 |

### n8n Workflows

| Workflow | 说明 | 状态 |
|----------|------|------|
| `openai-create-key.json` | 创建 OpenAI Key | ✅ |
| `openai-delete-key.json` | 删除 OpenAI Key | ✅ |
| `openai-list-keys.json` | 列出 OpenAI Keys | ✅ |
| `openai-list-projects.json` | 列出 OpenAI Projects | ✅ |
| `openai-sync-usage.json` | 同步 OpenAI 用量 | ✅ |
| `claude-manage-keys.json` | Claude Key 管理 | ✅ |
| `claude-sync-data.json` | Claude 数据同步 | ✅ |
| `openrouter-manage-keys.json` | OpenRouter 管理 | ✅ |

---

## 🚀 功能开发计划

### 第一阶段：核心体验提升（优先级：高）

#### 1. 设置抽屉
> 用户要求所有设置功能使用右侧抽屉形式

**功能点：**
- [ ] 平台账号管理（添加、编辑、删除）
- [ ] 查看/编辑 Admin Key
- [ ] 账号余额查看
- [ ] 同步频率设置（预留）
- [ ] 告警阈值配置（预留）

**技术方案：**
```
src/components/
  └── Settings/
      ├── SettingsDrawer.tsx    # 抽屉容器
      ├── PlatformAccounts.tsx  # 平台账号管理
      └── AlertSettings.tsx     # 告警设置（预留）
```

**预计工时：** 1-2 天

---

#### 2. 告警通知
**功能点：**
- [ ] Key 即将过期提醒（7天/3天/1天）
- [ ] 余额不足告警（可配置阈值）
- [ ] 用量超标通知
- [ ] Key 异常状态告警

**通知渠道（可选）：**
- [ ] 页面内通知（Toast/Badge）
- [ ] 邮件通知
- [ ] 钉钉/企业微信 Webhook

**预计工时：** 2-3 天

---

#### 3. 用量趋势图
**功能点：**
- [ ] Dashboard 增加用量趋势折线图
- [ ] 支持按天/周/月查看
- [ ] 费用趋势分析
- [ ] 按平台分组展示

**技术方案：**
- 使用 `recharts` 或 `chart.js` 库
- 数据来源：`llm_api_key_usage` 表历史记录

**预计工时：** 2 天

---

#### 4. 操作日志
> 数据库表已存在，需实现前端

**功能点：**
- [ ] 记录所有 Key 操作（创建、删除、编辑、同步）
- [ ] 操作历史查看页面
- [ ] 按 Key/用户/操作类型筛选
- [ ] 导出审计日志

**预计工时：** 1-2 天

---

### 第二阶段：功能增强（优先级：中）

#### 5. 定时同步
**功能点：**
- [ ] 自动定时同步所有平台用量
- [ ] 可配置同步频率（每小时/每天）
- [ ] 同步状态监控
- [ ] 同步历史记录

**技术方案：**
- n8n 定时触发 workflow
- 使用 `llm_sync_tasks` 表记录任务

**预计工时：** 2 天

---

#### 6. 高级筛选
**功能点：**
- [ ] 按责任人筛选
- [ ] 按创建时间范围筛选
- [ ] 按用量范围筛选
- [ ] 按过期状态筛选
- [ ] 筛选条件保存

**预计工时：** 1 天

---

#### 7. 批量操作
**功能点：**
- [ ] 批量选择 Keys
- [ ] 批量启用/禁用
- [ ] 批量分配责任人
- [ ] 批量删除（需二次确认）
- [ ] 批量导出

**预计工时：** 2 天

---

#### 8. 标签管理
**功能点：**
- [ ] Key 添加/编辑标签
- [ ] 按标签筛选
- [ ] 标签颜色自定义
- [ ] 标签统计

**预计工时：** 1 天

---

#### 9. 数据导出
**功能点：**
- [ ] 导出 Key 列表（Excel/CSV）
- [ ] 导出用量报表
- [ ] 导出审计日志
- [ ] 定时报表（邮件）

**预计工时：** 1-2 天

---

### 第三阶段：扩展功能（优先级：低）

#### 10. 权限控制
**功能点：**
- [ ] 多角色支持（管理员/查看者）
- [ ] Key 级别权限控制
- [ ] 敏感操作审批流程
- [ ] 访问日志

**预计工时：** 3-5 天

---

#### 11. 更多平台 API 支持
**功能点：**
- [ ] 阿里通义千问 API 管理
- [ ] 火山引擎 API 管理
- [ ] DeepSeek API 管理
- [ ] Google AI API 管理

**预计工时：** 每个平台 2-3 天

---

#### 12. 费用预测
**功能点：**
- [ ] 基于历史数据预测下月费用
- [ ] 预算设置与预警
- [ ] 费用趋势分析

**预计工时：** 3 天

---

## 🐛 已知问题

### 复制 Key 功能
**问题描述：** 部分 Key 无法复制完整密钥

**原因分析：**
1. 通过平台 API 创建的 Key：完整密钥已保存到 `api_key_encrypted` 字段 ✅
2. 手动导入的 Key：完整密钥已保存 ✅
3. 通过同步导入的 Key：只有前缀/后缀，没有完整密钥 ⚠️
4. 旧数据：在完善存储逻辑之前创建的 Key 可能没有保存 ⚠️

**当前处理：** 复制时会提示"该 Key 未保存完整密钥（可能是旧数据）"

**建议改进：**
- 在 Key 详情中明确显示是否可复制
- 对于无法复制的 Key，引导用户重新创建或手动导入

---

## 📁 项目结构

```
src/
├── App.tsx                 # 应用入口
├── main.tsx                # Vite 入口
├── components/
│   ├── Layout/
│   │   ├── index.tsx       # 布局容器
│   │   ├── Header.tsx      # 顶部导航
│   │   └── Sidebar.tsx     # 侧边栏
│   ├── Modal/
│   │   └── ConfirmModal.tsx
│   └── Toast.tsx
├── pages/
│   ├── Dashboard.tsx       # 仪表盘
│   ├── ApiKeys.tsx         # 密钥管理
│   └── Login.tsx           # 登录页
├── services/
│   └── api.ts              # API 服务层
├── lib/
│   ├── supabase.ts         # Supabase 客户端
│   └── mind-auth.ts        # Mind OIDC 认证
├── hooks/
│   ├── useAuth.ts
│   └── useStore.ts
└── styles/
    └── index.css           # 全局样式
```

---

## 🔧 环境配置

### 必需的环境变量

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# 认证模式：supabase（SaaS）或 mind（内部系统）
VITE_AUTH_MODE=supabase

# 开发模式跳过认证（可选）
VITE_SKIP_AUTH=true
```

### Supabase Auth 配置（SaaS 模式）

1. **启用邮箱认证**
   - Supabase Dashboard → Authentication → Providers → Email
   - 开启 "Enable Email Signup"

2. **配置 OAuth 提供商**（可选）
   - Google: 需要 Google Cloud Console 创建 OAuth 凭据
   - GitHub: 需要 GitHub Developer Settings 创建 OAuth App

3. **设置 Redirect URLs**
   - `http://localhost:5173/auth/callback`（开发）
   - `https://your-domain.com/auth/callback`（生产）

4. **邮件模板**（可选自定义）
   - Supabase Dashboard → Authentication → Email Templates

### n8n Webhook URLs

```
OpenAI:
- POST /developer-platform/openai/create-key
- POST /developer-platform/openai/delete-key
- POST /developer-platform/openai/list-keys
- GET  /developer-platform/openai/list-projects
- POST /developer-platform/openai/sync-usage

Claude:
- POST /developer-platform/claude/manage-keys
- POST /developer-platform/claude/sync-data

OpenRouter:
- POST /developer-platform/openrouter/manage-keys
```

---

## 📝 开发规范

### 设计规范
- 设置功能使用**右侧抽屉**形式
- 适当使用图标和粗体突出重要内容
- 文档表格使用 Markdown 语法，架构图使用 Mermaid

### 代码规范
- TypeScript 严格模式
- 组件使用函数式 + Hooks
- 状态管理优先使用 useState/useReducer
- API 调用集中在 services/api.ts

---

## 📅 里程碑

| 阶段 | 目标 | 预计完成时间 |
|-----|------|-------------|
| Phase 1 | 设置抽屉 + 告警通知 | 1 周 |
| Phase 2 | 用量图表 + 操作日志 | 1 周 |
| Phase 3 | 高级筛选 + 批量操作 | 1 周 |
| Phase 4 | 权限控制 + 更多平台 | 2 周 |

