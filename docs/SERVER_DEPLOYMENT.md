# Costix 服务器部署指南

## 📋 目录

- [服务器要求](#服务器要求)
- [域名配置](#域名配置)
- [首次部署](#首次部署)
- [SSL 证书](#ssl-证书)
- [环境变量](#环境变量)
- [运维命令](#运维命令)
- [故障排查](#故障排查)

---

## 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| **操作系统** | Ubuntu 20.04+ / CentOS 8+ | Ubuntu 22.04 LTS |
| **CPU** | 1 核 | 2 核 |
| **内存** | 1 GB | 2 GB |
| **硬盘** | 20 GB | 40 GB SSD |
| **带宽** | 1 Mbps | 5 Mbps |

### 必需软件

- Docker 20.10+
- Docker Compose 2.0+

### 安装 Docker（Ubuntu）

```bash
# 更新包索引
sudo apt update

# 安装依赖
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加 Docker GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 将当前用户加入 docker 组
sudo usermod -aG docker $USER

# 验证安装
docker --version
docker compose version
```

---

## 域名配置

### DNS 解析设置

在你的域名服务商处添加以下 DNS 记录：

| 记录类型 | 主机记录 | 记录值 |
|----------|----------|--------|
| **A** | @ | `你的服务器IP` |
| **A** | www | `你的服务器IP` |

> **注意**：DNS 解析生效需要几分钟到 48 小时不等

### 验证 DNS 解析

```bash
# 检查 DNS 是否生效
nslookup costix.net
ping costix.net
```

---

## 首次部署

### 1. 克隆项目

```bash
# 创建应用目录
mkdir -p /opt/apps
cd /opt/apps

# 克隆项目（或上传代码）
git clone https://github.com/your-repo/costix.git
cd costix
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**.env 文件内容**：

```env
# Supabase 配置
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 认证模式：supabase 或 mind
VITE_AUTH_MODE=supabase

# 生产环境标识
NODE_ENV=production
```

### 3. 首次启动（获取 SSL 证书前）

```bash
cd deploy

# 使用初始化配置启动（仅 HTTP）
docker compose -f docker-compose.init.yml up -d --build

# 查看日志
docker logs -f costix-web
```

### 4. 申请 SSL 证书

```bash
# 确保 DNS 已生效后执行
chmod +x init-ssl.sh
./init-ssl.sh
```

### 5. 切换到正式配置

```bash
# 停止初始化服务
docker compose -f docker-compose.init.yml down

# 启动正式服务（包含 SSL）
docker compose up -d --build

# 验证服务状态
docker compose ps
```

### 6. 验证部署

- 访问 `https://costix.net` 检查网站是否正常
- 检查 SSL 证书是否有效（浏览器地址栏显示锁图标）

---

## SSL 证书

### 证书位置

```
/etc/letsencrypt/live/costix.net/
├── fullchain.pem   # 证书链
├── privkey.pem     # 私钥
├── cert.pem        # 证书
└── chain.pem       # CA 证书链
```

### 自动续期

docker-compose.yml 中的 certbot 服务会每 12 小时检查证书是否需要续期。

### 手动续期

```bash
# 测试续期（不实际执行）
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot renew --dry-run

# 实际续期
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot renew

# 重载 Nginx 配置
docker exec costix-web nginx -s reload
```

---

## 环境变量

### 完整环境变量列表

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `VITE_SUPABASE_URL` | ✅ | Supabase 项目 URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase 匿名密钥 | `eyJ...` |
| `VITE_AUTH_MODE` | ❌ | 认证模式 | `supabase` / `mind` |
| `VITE_SKIP_AUTH` | ❌ | 开发环境跳过认证 | `true` / `false` |

### 获取 Supabase 配置

1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 进入项目 → Settings → API
3. 复制 **Project URL** 和 **anon/public key**

---

## 运维命令

### 服务管理

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f costix
```

### 更新部署

```bash
cd /opt/apps/costix

# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build

# 清理旧镜像
docker image prune -f
```

### 回滚

```bash
# 回滚到上一个版本
git checkout HEAD~1

# 重新构建
docker compose up -d --build
```

### 备份

```bash
# 备份配置文件
tar -czvf costix-config-$(date +%Y%m%d).tar.gz .env

# 备份 SSL 证书
sudo tar -czvf ssl-certs-$(date +%Y%m%d).tar.gz /etc/letsencrypt
```

---

## 故障排查

### 1. 网站无法访问

```bash
# 检查容器状态
docker compose ps

# 检查 80/443 端口
sudo netstat -tlnp | grep -E ':80|:443'

# 检查防火墙
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

### 2. SSL 证书问题

```bash
# 检查证书有效期
openssl s_client -connect costix.net:443 -servername costix.net 2>/dev/null | openssl x509 -noout -dates

# 检查证书文件是否存在
ls -la /etc/letsencrypt/live/costix.net/
```

### 3. 容器启动失败

```bash
# 查看详细日志
docker compose logs --tail=100 costix

# 进入容器检查
docker exec -it costix-web sh

# 检查 Nginx 配置
docker exec costix-web nginx -t
```

### 4. 构建失败

```bash
# 清理 Docker 缓存后重试
docker builder prune -f
docker compose build --no-cache
```

---

## 监控建议

### 健康检查端点

docker-compose.yml 已配置健康检查，可通过以下方式查看：

```bash
docker inspect costix-web | grep -A 10 Health
```

### 推荐监控工具

- **Uptime Kuma** - 开源监控服务
- **CloudFlare** - 免费的 CDN + 监控
- **UptimeRobot** - 免费的 HTTP 监控

---

## 联系支持

如果遇到问题，请：

1. 检查 [故障排查](#故障排查) 部分
2. 查看 Docker 日志
3. 提交 Issue 到项目仓库

