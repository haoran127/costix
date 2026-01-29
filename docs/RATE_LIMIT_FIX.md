# 429 速率限制错误解决方案

## 问题说明

当遇到 `429 (Too Many Requests)` 错误时，表示请求过于频繁，触发了 Supabase 的速率限制。

## 原因分析

1. **短时间内多次注册尝试**
   - Supabase 默认限制：同一 IP 每分钟最多 5 次注册请求
   - 同一邮箱每分钟最多 1 次注册请求

2. **邮件发送速率限制**
   - Resend 免费版：每分钟最多 10 封邮件
   - Supabase 邮件发送也有速率限制

3. **测试时频繁点击注册按钮**

## 解决方案

### 方案一：等待后重试（最简单）

1. **等待 60 秒**
   - 停止所有注册尝试
   - 等待 60 秒后再次尝试

2. **检查是否已有用户**
   - 如果邮箱已注册，直接登录即可
   - 不需要重复注册

### 方案二：检查 Supabase 速率限制设置

1. **登录 Supabase Dashboard**
   - 进入 Authentication → Settings → Auth

2. **查看速率限制配置**
   - 检查 "Rate Limits" 设置
   - 默认配置通常足够使用

3. **如果需要调整（仅付费计划）**
   - Pro 计划可以调整速率限制
   - 免费计划无法调整

### 方案三：优化前端代码

已更新 `src/lib/auth.ts`，添加了更好的错误处理：

```typescript
// 现在会显示友好的错误提示
'Too Many Requests': '请求过于频繁，请等待 60 秒后再试'
```

### 方案四：开发环境禁用速率限制（仅本地开发）

如果使用 Supabase CLI 本地开发，可以在 `supabase/config.toml` 中调整：

```toml
[auth.email]
max_frequency = "1s"  # 可以调整为更短的时间
```

**注意：** 生产环境不建议修改速率限制，这是安全措施。

## 预防措施

### 1. 添加防抖/节流

在前端注册表单中添加防抖，防止用户快速多次点击：

```typescript
// 示例：使用防抖
const handleSignUp = debounce(async (data) => {
  // 注册逻辑
}, 1000); // 1秒内只能提交一次
```

### 2. 添加加载状态

显示加载状态，防止用户重复点击：

```typescript
const [loading, setLoading] = useState(false);

const handleSignUp = async () => {
  if (loading) return; // 如果正在加载，直接返回
  setLoading(true);
  try {
    // 注册逻辑
  } finally {
    setLoading(false);
  }
};
```

### 3. 检查用户是否已存在

在注册前检查邮箱是否已注册：

```typescript
// 如果邮箱已注册，提示用户直接登录
if (error.message.includes('already registered')) {
  return '该邮箱已注册，请直接登录';
}
```

## 常见场景

### 场景 1：测试时频繁注册

**问题：** 开发时多次测试注册功能

**解决：**
- 使用不同的测试邮箱
- 或者等待 60 秒后再试
- 或者删除已注册的测试用户（Supabase Dashboard → Authentication → Users）

### 场景 2：用户快速点击注册按钮

**问题：** 用户网络慢，快速点击多次

**解决：**
- 添加按钮禁用状态
- 添加加载动画
- 显示友好的错误提示

### 场景 3：批量注册测试

**问题：** 需要测试多个用户注册

**解决：**
- 使用不同的邮箱地址
- 间隔至少 60 秒
- 或者使用 Supabase Dashboard 手动创建用户

## 检查速率限制状态

### 在 Supabase Dashboard 中查看

1. **进入 Logs → Auth Logs**
   - 查看是否有速率限制相关的错误
   - 查看请求频率

2. **进入 Authentication → Users**
   - 查看已注册的用户
   - 删除测试用户（如果需要）

### 在 Resend Dashboard 中查看

1. **进入 Emails**
   - 查看邮件发送记录
   - 检查是否有发送失败

2. **进入 Settings → Rate Limits**
   - 查看当前的速率限制
   - 免费版：每分钟 10 封邮件

## 最佳实践

1. **开发环境**
   - 使用不同的测试邮箱
   - 删除不需要的测试用户
   - 避免频繁测试注册功能

2. **生产环境**
   - 保持默认的速率限制（安全措施）
   - 添加友好的错误提示
   - 添加防抖/节流保护

3. **用户体验**
   - 显示清晰的错误信息
   - 提供重试按钮（延迟后）
   - 引导用户直接登录（如果已注册）

## 参考链接

- [Supabase Rate Limits](https://supabase.com/docs/guides/platform/rate-limits)
- [Resend Rate Limits](https://resend.com/docs)
- [Supabase Auth Best Practices](https://supabase.com/docs/guides/auth)

