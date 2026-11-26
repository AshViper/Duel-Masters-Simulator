import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dmOfficialPlugin } from './src/server/vitePlugin';

export default defineConfig(({ command }) => ({
  // ビルド時は相対パスにして、GitHub Pages（/<リポジトリ名>/ 配下）でもそのまま動くようにする
  base: command === 'build' ? './' : '/',
  plugins: [react(), dmOfficialPlugin()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
}) as never);
