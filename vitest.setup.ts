// vitest.setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom'; 
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock your DB connection globally
vi.mock('packages/db/index', () => ({
  db: { /* mock Drizzle instance */ }
}));

// Make Navbar-safe everywhere (no tRPC Provider needed)
vi.mock("@/hooks/useSession", () => {
  return {
    useSession: () => ({
      user: null,
      isLoading: false,
      isAuthed: false,
    }),
  };
});


// Auto cleanup
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
