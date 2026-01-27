#!/bin/bash
# ========================================
# Costix SSL 证书初始化脚本
# 在新服务器上首次部署时运行
# ========================================

set -e

DOMAIN="costix.net"
EMAIL="admin@costix.net"  # 修改为你的邮箱

echo "🔐 开始为 ${DOMAIN} 申请 SSL 证书..."

# 1. 确保 certbot 目录存在
mkdir -p /var/www/certbot

# 2. 使用 certbot 申请证书
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d ${DOMAIN} \
  -d www.${DOMAIN} \
  --email ${EMAIL} \
  --agree-tos \
  --no-eff-email

echo "✅ SSL 证书申请成功！"
echo ""
echo "📋 接下来请执行："
echo "1. 停止当前容器: docker-compose down"
echo "2. 更新 nginx 配置为 SSL 版本"
echo "3. 重新启动: docker-compose up -d"

