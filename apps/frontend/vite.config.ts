import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://backend:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/v1'),
      },
    },
  },
});

// Dev에선 Vite가 rewrite로 API 요청을 backend로 프록시하지만, Prod에서는 nginx가 프록시 역할을 하므로 Vite 설정에서 rewrite 제거 필요. --- IGNORE ---
