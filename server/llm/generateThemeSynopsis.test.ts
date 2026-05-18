import { describe, it, expect, vi } from "vitest";

vi.mock("../db", () => ({ db: {} }));

import {
  buildPromptPayload,
  computeContextHash,
  type PromptContext,
} from "./generateThemeSynopsis";

const baseTheme = { id: "theme-1", name: "Test Theme", description: "A test theme" };

// ---------------------------------------------------------------------------
// buildPromptPayload — graceful degradation
// ---------------------------------------------------------------------------

describe("buildPromptPayload", () => {
  it("produces a valid prompt object with full data", () => {
    const ctx: PromptContext = {
      theme: baseTheme,
      snippets: [
        { id: "s1", createdAt: "2025-01-01T00:00:00.000Z", tags: ["tag1"], content: "content" },
      ],
      scenarios: [
        {
          id: "sc1",
          name: "Scenario A",
          description: "Desc A",
          indicators: [
            { id: "i1", name: "Ind 1", strength: 7, decayBehaviour: "linear", status: "normal" },
          ],
          recentSnippets: [
            { id: "sn1", quote: "Some quote", pubDate: "2025-01-01T00:00:00.000Z", analystNotes: null },
          ],
        },
      ],
    };
    const payload = buildPromptPayload(ctx) as Record<string, unknown>;
    expect(payload).toHaveProperty("theme");
    expect(payload).toHaveProperty("scenarios");
    expect((payload.scenarios as unknown[]).length).toBe(1);
  });

  it("does not crash when scenarios array is empty", () => {
    const ctx: PromptContext = { theme: baseTheme, snippets: [], scenarios: [] };
    expect(() => buildPromptPayload(ctx)).not.toThrow();
    const payload = buildPromptPayload(ctx) as Record<string, unknown>;
    expect(payload.scenarios).toBeUndefined();
  });

  it("does not crash when scenarios is undefined", () => {
    const ctx = { theme: baseTheme, snippets: [] } as unknown as PromptContext;
    expect(() => buildPromptPayload(ctx)).not.toThrow();
  });

  it("does not crash when a scenario has no indicators", () => {
    const ctx: PromptContext = {
      theme: baseTheme,
      snippets: [],
      scenarios: [{ id: "sc1", name: "S", description: "D", indicators: [], recentSnippets: [] }],
    };
    expect(() => buildPromptPayload(ctx)).not.toThrow();
    const payload = buildPromptPayload(ctx) as Record<string, unknown>;
    const scenarios = payload.scenarios as Array<Record<string, unknown>>;
    expect(scenarios[0].indicators).toHaveLength(0);
  });

  it("does not crash when a scenario has no recentSnippets", () => {
    const ctx: PromptContext = {
      theme: baseTheme,
      snippets: [],
      scenarios: [
        {
          id: "sc1",
          name: "S",
          description: "D",
          indicators: [
            { id: "i1", name: "Ind", strength: 5, decayBehaviour: "none", status: "normal" },
          ],
          recentSnippets: [],
        },
      ],
    };
    expect(() => buildPromptPayload(ctx)).not.toThrow();
  });

  it("does not crash when snippets array is empty", () => {
    const ctx: PromptContext = { theme: baseTheme, snippets: [], scenarios: [] };
    const payload = buildPromptPayload(ctx) as Record<string, unknown>;
    expect((payload.snippets as unknown[]).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeContextHash — determinism and sensitivity
// ---------------------------------------------------------------------------

describe("computeContextHash", () => {
  it("returns a 64-char hex string", () => {
    const hash = computeContextHash({ theme: baseTheme, snippets: [], scenarios: [] });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces the same hash for identical inputs", () => {
    const ctx: PromptContext = { theme: baseTheme, snippets: [], scenarios: [] };
    expect(computeContextHash(ctx)).toBe(computeContextHash(ctx));
  });

  it("produces a different hash when a scenario indicator strength changes", () => {
    const base: PromptContext = {
      theme: baseTheme,
      snippets: [],
      scenarios: [
        {
          id: "sc1",
          name: "S",
          description: "D",
          indicators: [{ id: "i1", name: "Ind", strength: 5, decayBehaviour: "linear", status: "normal" }],
          recentSnippets: [],
        },
      ],
    };
    const changed: PromptContext = {
      ...base,
      scenarios: [
        {
          ...base.scenarios[0],
          indicators: [{ ...base.scenarios[0].indicators[0], strength: 9 }],
        },
      ],
    };
    expect(computeContextHash(base)).not.toBe(computeContextHash(changed));
  });

  it("is stable regardless of indicator array order", () => {
    const makeCtx = (reverseOrder: boolean): PromptContext => ({
      theme: baseTheme,
      snippets: [],
      scenarios: [
        {
          id: "sc1",
          name: "S",
          description: "D",
          indicators: reverseOrder
            ? [
                { id: "i2", name: "B", strength: 3, decayBehaviour: "none", status: "normal" },
                { id: "i1", name: "A", strength: 7, decayBehaviour: "linear", status: "normal" },
              ]
            : [
                { id: "i1", name: "A", strength: 7, decayBehaviour: "linear", status: "normal" },
                { id: "i2", name: "B", strength: 3, decayBehaviour: "none", status: "normal" },
              ],
          recentSnippets: [],
        },
      ],
    });
    expect(computeContextHash(makeCtx(false))).toBe(computeContextHash(makeCtx(true)));
  });
});
