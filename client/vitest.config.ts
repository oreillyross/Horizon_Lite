import { mergeConfig, defineConfig } from 'vitest/config';
import rootConfig from '../vitest.config.ts';
import react from '@vitejs/plugin-react';

export default mergeConfig(
  rootConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'], // RTL, MSW setup
    },
  })
);
