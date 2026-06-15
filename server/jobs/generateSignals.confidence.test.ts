import { describe, it, expect, vi } from "vitest";

vi.mock("../db", () => ({ db: {} }));
vi.mock("../intel/indicatorScoring", () => ({ mapIndicator: () => "mock-id" }));
vi.mock("./acledIngest", () => ({ isAcledEnabled: async () => false }));

import { computeConfidenceScore } from "./generateSignals";

describe("computeConfidenceScore", () => {
  it("returns average of three normalised components for a typical event", () => {
    // eventCode "14" → root "14" → CAMEO_WEIGHTS["14"] = 0.60
    // goldstein -5 → abs/10 = 0.5
    // numMentions 100 → log(101)/log(10001) ≈ 0.50
    const score = computeConfidenceScore("14", -5, 100);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
    // rough expected: (0.60 + 0.50 + ~0.50) / 3 ≈ 0.53
    expect(score).toBeCloseTo((0.60 + 0.5 + Math.log(101) / Math.log(10001)) / 3, 4);
  });

  it("uses mentionNorm = 0 when numMentions is zero", () => {
    const score = computeConfidenceScore("10", 5, 0);
    // root "10" → CAMEO_WEIGHTS["10"] = 0.50; goldstein 5 → 0.5; mentionNorm = log(1)/log(10001) = 0
    expect(score).toBeCloseTo((0.50 + 0.5 + 0) / 3, 4);
  });

  it("uses Math.abs() for negative Goldstein so score stays valid", () => {
    const positive = computeConfidenceScore("05", 8, 50);
    const negative = computeConfidenceScore("05", -8, 50);
    expect(positive).toBeCloseTo(negative, 10);
  });

  it("falls back to catWeight 0.30 for an unknown CAMEO code", () => {
    const score = computeConfidenceScore("99", 5, 100);
    // catWeight = 0.30 (default for unknown)
    const expected = (0.30 + 0.5 + Math.log(101) / Math.log(10001)) / 3;
    expect(score).toBeCloseTo(expected, 4);
  });

  it("falls back to catWeight 0.30 when eventCode is null", () => {
    const score = computeConfidenceScore(null, 5, 100);
    const expected = (0.30 + 0.5 + Math.log(101) / Math.log(10001)) / 3;
    expect(score).toBeCloseTo(expected, 4);
  });

  it("uses goldNorm 0.5 when goldstein is null", () => {
    const score = computeConfidenceScore("10", null, 100);
    // goldNorm falls back to 0.5; root "10" → 0.50; mentionNorm = log(101)/log(10001)
    const expected = (0.50 + 0.5 + Math.log(101) / Math.log(10001)) / 3;
    expect(score).toBeCloseTo(expected, 4);
  });

  it("caps mentionNorm at 1.0 for very large mention counts", () => {
    const score = computeConfidenceScore("20", 10, 99999999);
    // mentionNorm = min(1, log(100000000)/log(10001)) > 1 → capped at 1
    // catWeight "20" = 1.00; goldstein 10 → |10|/10 = 1.0
    expect(score).toBeCloseTo((1.00 + 1.0 + 1.0) / 3, 4);
  });
});
