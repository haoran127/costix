# Costix 数据同步架构方案

## 当前问题

当前架构：用户刷新页面 → 前端调用各平台 API → 等待响应 → 保存数据库

**问题：**
1. 用户每次刷新都要等待 API 调用（慢、可能失败）
2. 多用户同时访问会产生大量重复请求
3. 前端直接调用第三方 API，体验差
4. API 限流/故障直接影响用户
5. 多租户同时同步会触发 API 限流

---

## 推荐方案：后端定时队列同步

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│  Vercel Cron (每 5 分钟触发)                                      │
│  ↓                                                              │
│  查询数据库：哪些账户需要同步？                                     │
│  (last_synced_at > 1 小时前 或 从未同步)                          │
│  ↓                                                              │
│  每次最多处理 3 个账户                                            │
│  ↓                                                              │
│  账户之间间隔 10 秒，防止限流                                      │
│  ↓                                                              │
│  更新 last_synced_at，下次 Cron 处理其他账户                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                        [数据库缓存]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  前端只读取数据库                                                  │
│  - 显示上次同步时间                                               │
│  - 无需等待 API 调用                                              │
│  - 数据始终是最新的（最多延迟 1 小时）                              │
└─────────────────────────────────────────────────────────────────┘
```

### 核心逻辑

1. **Cron Job 每 5 分钟运行**
2. **查询需要同步的账户**（按优先级：Pro > Free，最近活跃 > 不活跃）
3. **每次只处理 3 个账户**（防止 Serverless Function 超时）
4. **账户之间间隔 10 秒**（防止 API 限流）
5. **记录同步状态**（成功/失败/上次同步时间）

---

## API 限流安全参数

| 平台 | 建议间隔 | 每小时最大请求 | 备注 |
|------|---------|--------------|------|
| OpenAI | 10秒 | 360 | Admin API 限制较严 |
| Claude | 10秒 | 360 | 保守估计 |
| OpenRouter | 5秒 | 720 | 相对宽松 |
| 火山引擎 | 10秒 | 360 | 有签名验证 |

**同步策略：**
- 100 个租户 × 4 个平台 = 400 个账户
- 每次处理 3 个，每 5 分钟一次 → 每小时处理 36 个
- 400 个账户全部同步完成 ≈ 11 小时
- 如果需要更快，可以增加 Cron 频率或每次处理更多

---

## Vercel Pro 优势（$20/月）

| 功能 | Hobby（免费） | Pro（$20/月） |
|------|-------------|--------------|
| Cron 频率 | 每天一次 | **每分钟** |
| Serverless Functions | 12 个 | **无限制** |
| 执行时间 | 10 秒 | **60 秒** |
| 带宽 | 100GB | 1TB |

**升级步骤：**
1. 登录 https://vercel.com
2. 进入 costix 项目
3. Settings → Billing → Upgrade to Pro

---

## 实现步骤

### 1. 数据库变更

```sql
-- 在 llm_platform_accounts 表添加同步状态字段
ALTER TABLE llm_platform_accounts 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sync_error TEXT,
ADD COLUMN IF NOT EXISTS next_sync_at TIMESTAMPTZ;

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_platform_accounts_sync 
ON llm_platform_accounts (next_sync_at, sync_status) 
WHERE status = 'active';
```

### 2. 创建 Cron API

**文件：`api/cron/sync-accounts.ts`**

```typescript
// 核心逻辑伪代码
export default async function handler(req, res) {
  // 1. 验证 Cron 密钥（防止恶意调用）
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. 查询需要同步的账户（最多 3 个）
  const accounts = await supabase
    .from('llm_platform_accounts')
    .select('*')
    .eq('status', 'active')
    .or('last_synced_at.is.null,last_synced_at.lt.' + oneHourAgo)
    .order('last_synced_at', { ascending: true, nullsFirst: true })
    .limit(3);

  // 3. 串行处理每个账户
  for (const account of accounts) {
    await syncAccount(account);
    await sleep(10000); // 间隔 10 秒
  }

  return res.json({ synced: accounts.length });
}
```

### 3. 配置 vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-accounts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 4. 前端改造

- 移除"同步"按钮
- 显示"上次同步时间：X 分钟前"
- 添加"数据每小时自动更新"提示

---

## 按订阅等级分配同步频率（可选）

```javascript
const SYNC_INTERVALS = {
  enterprise: 30 * 60 * 1000,  // 30 分钟
  pro: 60 * 60 * 1000,         // 1 小时
  free: 6 * 60 * 60 * 1000,    // 6 小时
};
```

---

## 时间线

1. **升级 Vercel Pro** - 5 分钟
2. **执行数据库迁移** - 2 分钟
3. **部署 Cron API** - 10 分钟
4. **前端改造** - 15 分钟
5. **测试验证** - 10 分钟

**总计：约 45 分钟**

---

## 备选方案：外部 Cron 服务

如果不想升级 Vercel Pro，可以使用免费的外部 Cron 服务：

1. **cron-job.org** - 免费，每分钟可触发
2. **GitHub Actions** - 免费，但最短 5 分钟
3. **EasyCron** - 免费计划每天 200 次

配置外部 Cron 调用：
```
URL: https://www.costix.net/api/cron/sync-accounts
Method: POST
Headers: Authorization: Bearer YOUR_CRON_SECRET
Schedule: */5 * * * * (每 5 分钟)
```

---

## 联系方式

如有问题，随时继续讨论实现细节。

