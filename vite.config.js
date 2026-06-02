import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/O.I.A.L.A/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/opensky': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/opensky/, '/api/states/all')
      }
    }
  }
});
