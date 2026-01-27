import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      // Mind API 代理 - 获取团队成员
      '/api/mind': {
        target: 'https://login.mindoffice.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mind/, '/account/api'),
        // 如果 Mind API 地址不同，修改上面的 target 和 rewrite
      },
    },
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
});

