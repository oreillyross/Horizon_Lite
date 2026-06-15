import { mergeConfig, defineConfig } from 'vitest/config';
import rootConfig from '../vitest.config.ts';

// Server-only test config:
// - Inherits @shared and other aliases from root config
// - Overrides environment to 'node' (no DOM)
// - Excludes client-side and e2e tests
// - Uses server-specific setup mocks
export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      environment: 'node',
      exclude: ['**/node_modules/**', '**/dist/**', 'client/**', 'e2e/**'],
      setupFiles: ['./server/test/setup.ts'],
    },
  })
);
