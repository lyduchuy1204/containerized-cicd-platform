import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const BACKEND_ORIGIN = 'http://localhost:3000';
const DEVELOPMENT_PORT = 5173;

export default defineConfig({
  plugins: [react()],
  server: {
    port: DEVELOPMENT_PORT,
    proxy: {
      '/graphql': { target: BACKEND_ORIGIN, changeOrigin: false },
      '/files': { target: BACKEND_ORIGIN, changeOrigin: false },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
