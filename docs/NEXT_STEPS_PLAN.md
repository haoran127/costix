# 下一步开发计划

> 最后更新：2026-01-28

## 📊 当前完成状态

### ✅ 已完成的核心功能

1. **基础架构**
   - ✅ 多语言支持（11种语言）
   - ✅ 用户认证和注册（Supabase Auth）
   - ✅ 多租户支持（tenant_id）
   - ✅ 响应式设计（支持 H5）

2. **数据管理**
   - ✅ API Keys 管理（创建、删除、编辑、导入）
   - ✅ 平台账号配置（OpenAI、Claude、OpenRouter、Volcengine）
   - ✅ 团队成员管理
   - ✅ 责任人分配

3. **数据同步**
   - ✅ OpenAI（Keys、Usage、Costs）
   - ✅ Claude（Keys、Usage、Costs）
   - ✅ OpenRouter（Keys、Usage、Credits）
   - ✅ Volcengine（Keys、Balance、Usage）

4. **数据展示**
   - ✅ Dashboard 统计卡片（5个指标）
   - ✅ API Keys 列表（搜索、筛选、排序）
   - ✅ 余额显示（区分美元和人民币）
   - ✅ 用量统计（Monthly Tokens、Monthly Usage）

---

## 🎯 下一步优先级规划

### 第一阶段：用户体验提升（优先级：⭐⭐⭐⭐⭐）

#### 1. 告警通知系统
**预计工时：2-3 天**

**功能点：**
- [ ] Key 即将过期提醒（7天/3天/1天）
- [ ] 余额不足告警（可配置阈值）
- [ ] 用量超标通知（月度用量超过阈值）
- [ ] Key 异常状态告警（禁用、错误状态）

**技术方案：**
- 使用数据库触发器或定时任务检查告警条件
- 页面内通知（Toast/Badge）
- 可选：邮件通知、Webhook 通知

**数据库设计：**
```sql
-- 告警配置表（已存在 llm_platform_accounts，可扩展）
-- 告警记录表（新建）
CREATE TABLE llm_alerts (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  alert_type VARCHAR(50), -- 'expiring', 'low_balance', 'high_usage', 'error'
  api_key_id UUID REFERENCES llm_api_keys(id),
  platform_account_id UUID REFERENCES llm_platform_accounts(id),
  message TEXT,
  severity VARCHAR(20), -- 'info', 'warning', 'error'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**前端实现：**
- `src/components/Alerts/AlertBadge.tsx` - 告警徽章组件
- `src/components/Alerts/AlertDrawer.tsx` - 告警抽屉
- `src/pages/Alerts.tsx` - 告警管理页面（可选）

---

#### 2. 用量趋势图
**预计工时：2 天**

**功能点：**
- [ ] Dashboard 增加用量趋势折线图
- [ ] 支持按天/周/月查看
- [ ] 费用趋势分析
- [ ] 按平台分组展示

**技术方案：**
- 使用 `recharts` 库（轻量级、React 友好）
- 数据来源：`llm_api_key_usage` 表历史记录
- 支持时间范围选择器

**前端实现：**
- `src/components/Charts/UsageChart.tsx` - 用量趋势图组件
- `src/components/Charts/CostChart.tsx` - 费用趋势图组件
- 集成到 Dashboard 页面

**数据查询：**
```sql
-- 按日期聚合用量数据
SELECT 
  DATE(period_start) as date,
  SUM(token_usage_monthly) as tokens,
  SUM(month_cost) as cost
FROM llm_api_key_usage
WHERE period_start >= NOW() - INTERVAL '30 days'
GROUP BY DATE(period_start)
ORDER BY date;
```

---

#### 3. 操作日志
**预计工时：1-2 天**

**功能点：**
- [ ] 记录所有 Key 操作（创建、删除、编辑、同步）
- [ ] 操作历史查看页面
- [ ] 按 Key/用户/操作类型筛选
- [ ] 导出审计日志

**技术方案：**
- 使用现有的 `llm_api_key_logs` 表
- 在 API 端点中添加日志记录逻辑
- 前端实现日志查看页面

**数据库表结构（已存在）：**
```sql
-- llm_api_key_logs 表已存在，需要确认字段是否完整
```

**前端实现：**
- `src/pages/ActivityLog.tsx` - 操作日志页面
- `src/components/ActivityLog/LogTable.tsx` - 日志表格组件
- 集成到 Sidebar 导航

---

### 第二阶段：功能增强（优先级：⭐⭐⭐⭐）

#### 4. 高级筛选
**预计工时：1 天**

**功能点：**
- [ ] 按责任人筛选
- [ ] 按创建时间范围筛选
- [ ] 按用量范围筛选
- [ ] 按过期状态筛选
- [ ] 筛选条件保存（localStorage）

**前端实现：**
- 扩展 `src/pages/ApiKeys.tsx` 的筛选功能
- 添加高级筛选抽屉或下拉面板
- 使用 URL 参数保存筛选状态（可选）

---

#### 5. 批量操作
**预计工时：2 天**

**功能点：**
- [ ] 批量选择 Keys（复选框）
- [ ] 批量启用/禁用
- [ ] 批量分配责任人
- [ ] 批量删除（需二次确认）
- [ ] 批量导出

**前端实现：**
- `src/components/BatchActions/BatchActionBar.tsx` - 批量操作工具栏
- 修改 `src/pages/ApiKeys.tsx` 添加选择功能
- 实现批量操作的 API 调用

---

#### 6. 数据导出
**预计工时：1-2 天**

**功能点：**
- [ ] 导出 Key 列表（Excel/CSV）
- [ ] 导出用量报表
- [ ] 导出审计日志
- [ ] 定时报表（邮件，可选）

**技术方案：**
- 前端导出：使用 `xlsx` 或 `papaparse` 库
- 后端导出：创建导出 API 端点（可选）

**前端实现：**
- `src/utils/export.ts` - 导出工具函数
- 在相关页面添加导出按钮

---

### 第三阶段：扩展功能（优先级：⭐⭐⭐）

#### 7. 定时同步
**预计工时：2 天**

**功能点：**
- [ ] 自动定时同步所有平台用量
- [ ] 可配置同步频率（每小时/每天）
- [ ] 同步状态监控
- [ ] 同步历史记录

**技术方案：**
- 使用 Vercel Cron Jobs 或 Supabase Edge Functions
- 使用 `llm_sync_tasks` 表记录任务

---

#### 8. 标签管理
**预计工时：1 天**

**功能点：**
- [ ] Key 添加/编辑标签
- [ ] 按标签筛选
- [ ] 标签颜色自定义
- [ ] 标签统计

**数据库设计：**
```sql
-- 标签表
CREATE TABLE llm_tags (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  name VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key 标签关联表
CREATE TABLE llm_api_key_tags (
  api_key_id UUID REFERENCES llm_api_keys(id),
  tag_id UUID REFERENCES llm_tags(id),
  PRIMARY KEY (api_key_id, tag_id)
);
```

---

## 📅 建议的开发顺序

### Week 1: 用户体验提升
1. **告警通知系统**（2-3天）
   - 实现基础告警逻辑
   - 页面内通知
   - 告警配置界面

2. **用量趋势图**（2天）
   - 集成 recharts
   - 实现用量和费用图表
   - 时间范围选择

### Week 2: 功能增强
3. **操作日志**（1-2天）
   - 实现日志记录逻辑
   - 日志查看页面
   - 筛选和导出

4. **高级筛选**（1天）
   - 扩展筛选功能
   - 筛选条件保存

### Week 3: 批量操作和数据导出
5. **批量操作**（2天）
   - 实现批量选择
   - 批量操作功能

6. **数据导出**（1-2天）
   - 实现导出功能
   - 多种格式支持

---

## 🔧 技术选型建议

### 图表库
- **推荐：recharts**
  - React 原生支持
  - 轻量级
  - 文档完善
  - 安装：`pnpm add recharts`

### 导出库
- **Excel：xlsx**
  - 功能强大
  - 支持多种格式
  - 安装：`pnpm add xlsx`
- **CSV：papaparse**
  - 轻量级
  - 易于使用
  - 安装：`pnpm add papaparse`

### 定时任务
- **Vercel Cron Jobs**
  - 如果使用 Vercel 部署
  - 配置简单
- **Supabase Edge Functions + pg_cron**
  - 如果使用 Supabase
  - 更灵活

---

## 📝 注意事项

1. **数据库迁移**
   - 新增表需要创建迁移文件
   - 遵循现有的迁移文件命名规范

2. **多语言支持**
   - 所有新增文本都需要添加到翻译文件
   - 使用 `t()` 函数进行翻译

3. **响应式设计**
   - 确保新功能在移动端可用
   - 测试 H5 访问

4. **性能优化**
   - 大数据量时使用分页
   - 图表数据使用聚合查询
   - 考虑使用缓存

5. **测试**
   - 关键功能需要测试
   - 特别是批量操作和导出功能

---

## 🎯 下一步行动

建议从 **告警通知系统** 开始，因为：
1. 用户价值高（及时发现问题）
2. 技术难度适中
3. 为后续功能打下基础（通知机制）

需要我立即开始实现告警通知系统吗？

