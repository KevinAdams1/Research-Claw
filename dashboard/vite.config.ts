import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:18789',
        ws: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:18789',
      },
    },
  },
});
