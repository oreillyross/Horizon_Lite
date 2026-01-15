import { mergeConfig, defineConfig } from 'vitest/config';
import rootConfig from '../vitest.config.ts';

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      environment: 'node',
      setupFiles: ['./test/setup.ts'], // API-specific mocks
    },
  })
);
