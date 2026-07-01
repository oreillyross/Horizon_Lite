import { describe, it, expect } from "vitest";
import { IndicatorSummarySchema } from "./horizon.schema";

// Regression test for the "Output validation failed" bug on the Signals screen:
// scenarios.themeId is nullable (a scenario can exist without a theme), so an
// indicator mapped only to theme-less scenarios has no themeId either. The
// output schema previously required a non-empty themeId, so the router's
// fallback to "" tripped `.min(1)` at the tRPC output boundary.
function baseIndicator(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ind-1",
    themeId: null,
    name: "Amplification spike",
    category: "infoops",
    status: "watching",
    currentValue: 3.2,
    baselineValue: 1.0,
    accelerationScore: 2.2,
    lastTriggeredAt: null,
    mappedScenarios: [],
    strength: 5,
    timeWeight: "week",
    decayBehaviour: "linear",
    description: null,
    regionScope: null,
    ...overrides,
  };
}

describe("IndicatorSummarySchema", () => {
  it("accepts a null themeId for an indicator mapped only to theme-less scenarios", () => {
    const result = IndicatorSummarySchema.safeParse(baseIndicator());
    expect(result.success).toBe(true);
  });

  it("still accepts a populated themeId", () => {
    const result = IndicatorSummarySchema.safeParse(baseIndicator({ themeId: "theme-1" }));
    expect(result.success).toBe(true);
  });

  it("rejects an empty-string themeId (the old, buggy fallback value)", () => {
    const result = IndicatorSummarySchema.safeParse(baseIndicator({ themeId: "" }));
    expect(result.success).toBe(false);
  });
});
