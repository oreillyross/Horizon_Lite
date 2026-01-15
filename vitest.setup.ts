// vitest.setup.ts
import { vi } from 'vitest';

// Mock your DB connection globally
vi.mock('packages/db/index', () => ({
  db: { /* mock Drizzle instance */ }
}));
