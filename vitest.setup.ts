// vitest.setup.ts
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock your DB connection globally
vi.mock('packages/db/index', () => ({
  db: { /* mock Drizzle instance */ }
}));
