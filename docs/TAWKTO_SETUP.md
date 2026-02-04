# Tawk.to 客服系统部署指南

## 简介

[Tawk.to](https://www.tawk.to) 是**完全免费**的实时客服聊天工具。

**免费功能（无限制）：**
- ✅ 无限座席
- ✅ 无限聊天记录
- ✅ 移动端 App（iOS/Android）
- ✅ 多语言支持
- ✅ 聊天机器人（基础）
- ✅ 访客监控
- ✅ 文件传输

## 快速部署步骤

### 1. 注册 Tawk.to 账号

1. 访问 [https://www.tawk.to](https://www.tawk.to)
2. 点击 "Sign Up Free"
3. 使用邮箱注册
4. 创建 Property（填写网站名称和 URL）

### 2. 获取 Widget 代码

1. 登录 [Tawk.to Dashboard](https://dashboard.tawk.to)
2. 选择你的 Property
3. 进入 **Administration → Channels → Chat Widget**
4. 点击 **Widget Code**
5. 复制代码中的两个 ID：
   - `Property ID`: 类似 `6789abcd1234567890abcdef`
   - `Widget ID`: 类似 `1abc2def3`

### 3. 配置代码

编辑 `index.html`，取消注释并替换 ID：

```html
<!-- Tawk.to 客服 - 完全免费 -->
<script type="text/javascript">
  var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
  (function(){
    var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
    s1.async=true;
    s1.src='https://embed.tawk.to/6789abcd1234567890abcdef/1abc2def3';
    s1.charset='UTF-8';
    s1.setAttribute('crossorigin','*');
    s0.parentNode.insertBefore(s1,s0);
  })();
</script>
```

### 4. 部署验证

```bash
vercel --yes --prod
```

部署后访问网站，右下角应出现聊天气泡。

## 自定义配置

### 设置聊天窗口样式

Dashboard → Administration → Chat Widget → Appearance

### 设置工作时间

Dashboard → Administration → Scheduler

### 配置自动触发消息

Dashboard → Administration → Triggers

### 设置预制回复

Dashboard → Administration → Shortcuts

## 移动端回复

下载 Tawk.to 移动应用：
- iOS: [App Store](https://apps.apple.com/app/tawk-to/id896498655)
- Android: [Google Play](https://play.google.com/store/apps/details?id=to.tawk.android)

## 高级集成（可选）

### JavaScript API

```javascript
// 隐藏 Widget
Tawk_API.hideWidget();

// 显示 Widget
Tawk_API.showWidget();

// 最大化聊天窗口
Tawk_API.maximize();

// 最小化聊天窗口
Tawk_API.minimize();

// 设置访客信息
Tawk_API.setAttributes({
  name: 'John Doe',
  email: 'john@example.com'
}, function(error){});

// 监听事件
Tawk_API.onLoad = function(){
  console.log('Tawk widget loaded');
};
```

## 定价

| 功能 | 免费版 |
|------|--------|
| 座席数量 | 无限 |
| 聊天记录 | 无限 |
| 网站数量 | 无限 |
| 移动 App | ✅ |
| 聊天机器人 | 基础版 |

**付费服务（可选）：**
- 移除 Tawk.to 品牌：$19/月
- 视频+语音通话：$29/月
- 专业 AI 聊天机器人：单独定价

## 参考链接

- 官网：https://www.tawk.to
- Dashboard：https://dashboard.tawk.to
- 帮助中心：https://help.tawk.to
- API 文档：https://developer.tawk.to

---

*最后更新：2026-02*

