import { describe, it, expect } from "vitest";
import { computeScenarioWarmth } from "./warmth";

const DAY_MS = 86400_000;
const WEEK_MS = 7 * DAY_MS;

describe("computeScenarioWarmth", () => {
  const now = new Date("2024-03-01T12:00:00Z");

  it("returns 0 when there are no indicator links", () => {
    expect(computeScenarioWarmth([], now)).toBe(0);
  });

  it("returns 0 when all events are not approved", () => {
    const links = [
      {
        strength: 7,
        decayBehaviour: "linear" as const,
        windowMs: WEEK_MS,
        events: [
          { createdAt: new Date(now.getTime() - DAY_MS), status: "pending" },
          { createdAt: new Date(now.getTime() - DAY_MS * 2), status: "dismissed" },
        ],
      },
    ];
    expect(computeScenarioWarmth(links, now)).toBe(0);
  });

  it("weights a single approved event at full strength when it just arrived (linear)", () => {
    // Event age = 0 → decayWeight = 1.0 → contribution = strength × 1.0
    const links = [
      {
        strength: 5,
        decayBehaviour: "linear" as const,
        windowMs: WEEK_MS,
        events: [{ createdAt: now, status: "approved" }],
      },
    ];
    expect(computeScenarioWarmth(links, now)).toBeCloseTo(5, 10);
  });

  it("correctly weights a mid-window event (linear decay)", () => {
    // Event age = WEEK_MS/2 → decayWeight = 0.5 → contribution = 4 × 0.5 = 2
    const links = [
      {
        strength: 4,
        decayBehaviour: "linear" as const,
        windowMs: WEEK_MS,
        events: [{ createdAt: new Date(now.getTime() - WEEK_MS / 2), status: "approved" }],
      },
    ];
    expect(computeScenarioWarmth(links, now)).toBeCloseTo(2, 10);
  });

  it("sums contributions across multiple indicators", () => {
    // Indicator A: strength 3, event at age 0 → 3 × 1.0 = 3
    // Indicator B: strength 6, event at age WEEK_MS/2 → 6 × 0.5 = 3
    // Total = 6
    const links = [
      {
        strength: 3,
        decayBehaviour: "linear" as const,
        windowMs: WEEK_MS,
        events: [{ createdAt: now, status: "approved" }],
      },
      {
        strength: 6,
        decayBehaviour: "linear" as const,
        windowMs: WEEK_MS,
        events: [{ createdAt: new Date(now.getTime() - WEEK_MS / 2), status: "approved" }],
      },
    ];
    expect(computeScenarioWarmth(links, now)).toBeCloseTo(6, 10);
  });

  it("excludes events outside the window", () => {
    const links = [
      {
        strength: 9,
        decayBehaviour: "linear" as const,
        windowMs: WEEK_MS,
        events: [
          { createdAt: new Date(now.getTime() - WEEK_MS * 2), status: "approved" }, // outside window
        ],
      },
    ];
    expect(computeScenarioWarmth(links, now)).toBe(0);
  });

  it("step behaviour gives full weight to any event in window", () => {
    const links = [
      {
        strength: 5,
        decayBehaviour: "step" as const,
        windowMs: WEEK_MS,
        events: [
          { createdAt: new Date(now.getTime() - WEEK_MS * 0.9), status: "approved" }, // near start of window
        ],
      },
    ];
    expect(computeScenarioWarmth(links, now)).toBeCloseTo(5, 10);
  });

  it("none behaviour gives full weight regardless of position in window", () => {
    const links = [
      {
        strength: 8,
        decayBehaviour: "none" as const,
        windowMs: WEEK_MS,
        events: [
          { createdAt: new Date(now.getTime() - WEEK_MS * 0.99), status: "approved" },
        ],
      },
    ];
    expect(computeScenarioWarmth(links, now)).toBeCloseTo(8, 10);
  });
});
