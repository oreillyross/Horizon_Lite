import { describe, it, expect } from "vitest";
import { computeDecayWeight, timeWeightToMs } from "./decay";

const DAY_MS = 86400_000;
const WEEK_MS = 7 * DAY_MS;

describe("computeDecayWeight", () => {
  describe("linear", () => {
    it("returns 1.0 for a brand-new event (age = 0)", () => {
      expect(computeDecayWeight("linear", 0, WEEK_MS)).toBe(1);
    });

    it("returns 0.5 for an event halfway through the window", () => {
      expect(computeDecayWeight("linear", WEEK_MS / 2, WEEK_MS)).toBeCloseTo(0.5, 10);
    });

    it("returns ~0 for an event at the very start of the window", () => {
      expect(computeDecayWeight("linear", WEEK_MS, WEEK_MS)).toBeCloseTo(0, 10);
    });

    it("returns 0 for events older than the window", () => {
      expect(computeDecayWeight("linear", WEEK_MS + 1, WEEK_MS)).toBe(0);
    });

    it("returns 0 for negative age (future events — guard against clock skew)", () => {
      expect(computeDecayWeight("linear", -1, WEEK_MS)).toBe(0);
    });
  });

  describe("step", () => {
    it("returns 1.0 for a new event", () => {
      expect(computeDecayWeight("step", 0, WEEK_MS)).toBe(1);
    });

    it("returns 1.0 for an event halfway through the window", () => {
      expect(computeDecayWeight("step", WEEK_MS / 2, WEEK_MS)).toBe(1);
    });

    it("returns 0 for events outside the window", () => {
      expect(computeDecayWeight("step", WEEK_MS + 1, WEEK_MS)).toBe(0);
    });
  });

  describe("none", () => {
    it("returns 1.0 regardless of event age (within window)", () => {
      expect(computeDecayWeight("none", 0, WEEK_MS)).toBe(1);
      expect(computeDecayWeight("none", WEEK_MS * 0.99, WEEK_MS)).toBe(1);
    });

    it("returns 0 for events outside the window", () => {
      expect(computeDecayWeight("none", WEEK_MS + 1, WEEK_MS)).toBe(0);
    });
  });
});

describe("timeWeightToMs", () => {
  it("converts 'day' to 86400000 ms", () => {
    expect(timeWeightToMs("day")).toBe(DAY_MS);
  });

  it("converts 'week' to 604800000 ms", () => {
    expect(timeWeightToMs("week")).toBe(WEEK_MS);
  });

  it("defaults to week for unknown values", () => {
    expect(timeWeightToMs("unknown")).toBe(WEEK_MS);
  });
});
