# ========================================
# 第一阶段：构建
# ========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件，利用 Docker 缓存
COPY package.json package-lock.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建项目（.env 文件已包含 Supabase 配置，Vite 会自动读取）
ARG BUILD_MODE=prod
RUN npm run build -- --mode ${BUILD_MODE}

# ========================================
# 第二阶段：Nginx 运行
# ========================================
FROM nginx:alpine

# 删除默认配置
RUN rm -rf /etc/nginx/conf.d/default.conf

# 复制自定义 Nginx 配置
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]

