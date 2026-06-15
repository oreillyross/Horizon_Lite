import { vi } from "vitest";

// Prevent the DB module from attempting a real connection in unit tests
vi.mock("../db", () => ({ db: {} }));

// Provide stub Drizzle table objects so server modules that import from @shared/db
// can be loaded in tests without resolving the shared package alias.
// Tables are only used inside async functions — empty proxy stubs are sufficient.
vi.mock("@shared/db", () => {
  const tableStub = new Proxy({}, { get: () => new Proxy({}, { get: () => undefined }) });
  return new Proxy({}, { get: () => tableStub });
});
