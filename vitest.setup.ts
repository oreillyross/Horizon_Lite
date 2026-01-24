// vitest.setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom'; 
import { vi } from 'vitest';

// Mock your DB connection globally
vi.mock('packages/db/index', () => ({
  db: { /* mock Drizzle instance */ }
}));


// Auto cleanup
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
