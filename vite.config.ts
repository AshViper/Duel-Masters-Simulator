import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dmOfficialPlugin } from './src/server/vitePlugin';

export default defineConfig({
  plugins: [react(), dmOfficialPlugin()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
} as never);
