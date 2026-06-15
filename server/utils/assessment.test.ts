import { describe, it, expect } from "vitest";
import { buildEvidenceMap, partitionByWarmth } from "./assessment";

describe("buildEvidenceMap", () => {
  it("returns an empty map for empty input", () => {
    expect(buildEvidenceMap([]).size).toBe(0);
  });

  it("groups a single indicator with two events under the correct scenario", () => {
    const now = new Date();
    const rows = [
      {
        scenarioId: "s1",
        indicatorId: "i1",
        indicatorName: "Oil price surge",
        strength: 7,
        timeWeight: "week",
        eventId: "e1",
        eventTitle: "Brent crude hits $100",
        eventSourceUrl: "https://example.com/1",
        eventScore: 1.5,
        eventCreatedAt: now,
      },
      {
        scenarioId: "s1",
        indicatorId: "i1",
        indicatorName: "Oil price surge",
        strength: 7,
        timeWeight: "week",
        eventId: "e2",
        eventTitle: "OPEC cuts output",
        eventSourceUrl: "https://example.com/2",
        eventScore: 2.0,
        eventCreatedAt: now,
      },
    ];
    const map = buildEvidenceMap(rows);
    expect(map.size).toBe(1);
    const indMap = map.get("s1")!;
    expect(indMap.size).toBe(1);
    const ind = indMap.get("i1")!;
    expect(ind.events).toHaveLength(2);
    expect(ind.events[0].eventId).toBe("e1");
  });

  it("groups indicators under separate scenarios correctly", () => {
    const now = new Date();
    const rows = [
      {
        scenarioId: "s1", indicatorId: "i1", indicatorName: "A", strength: 3, timeWeight: "week",
        eventId: "e1", eventTitle: "T1", eventSourceUrl: null, eventScore: 1, eventCreatedAt: now,
      },
      {
        scenarioId: "s2", indicatorId: "i2", indicatorName: "B", strength: 5, timeWeight: "month",
        eventId: "e2", eventTitle: "T2", eventSourceUrl: null, eventScore: 2, eventCreatedAt: now,
      },
    ];
    const map = buildEvidenceMap(rows);
    expect(map.size).toBe(2);
    expect(map.get("s1")!.get("i1")!.events).toHaveLength(1);
    expect(map.get("s2")!.get("i2")!.events).toHaveLength(1);
  });

  it("skips event insertion when eventId is null (indicator with no events)", () => {
    const rows = [
      {
        scenarioId: "s1", indicatorId: "i1", indicatorName: "A", strength: 3, timeWeight: "week",
        eventId: null, eventTitle: null, eventSourceUrl: null, eventScore: 0, eventCreatedAt: null,
      },
    ];
    const map = buildEvidenceMap(rows);
    const ind = map.get("s1")!.get("i1")!;
    expect(ind).toBeDefined();
    expect(ind.events).toHaveLength(0);
  });
});

describe("partitionByWarmth", () => {
  it("returns empty arrays for empty input", () => {
    const result = partitionByWarmth([]);
    expect(result.warmer).toHaveLength(0);
    expect(result.neutral).toHaveLength(0);
    expect(result.colder).toHaveLength(0);
  });

  it("sorts warmer scenarios descending by delta", () => {
    const scenarios = [
      { scenarioId: "s1", scenarioName: "A", scenarioDescription: "", delta: 3.0 },
      { scenarioId: "s2", scenarioName: "B", scenarioDescription: "", delta: 7.0 },
      { scenarioId: "s3", scenarioName: "C", scenarioDescription: "", delta: 1.5 },
    ];
    const { warmer } = partitionByWarmth(scenarios);
    expect(warmer.map((s) => s.delta)).toEqual([7.0, 3.0, 1.5]);
  });

  it("sorts colder scenarios ascending by delta (most negative first)", () => {
    const scenarios = [
      { scenarioId: "s1", scenarioName: "A", scenarioDescription: "", delta: -1.0 },
      { scenarioId: "s2", scenarioName: "B", scenarioDescription: "", delta: -5.0 },
      { scenarioId: "s3", scenarioName: "C", scenarioDescription: "", delta: -2.0 },
    ];
    const { colder } = partitionByWarmth(scenarios);
    expect(colder.map((s) => s.delta)).toEqual([-5.0, -2.0, -1.0]);
  });

  it("places delta = 0 scenarios in neutral", () => {
    const scenarios = [
      { scenarioId: "s1", scenarioName: "A", scenarioDescription: "", delta: 5.0 },
      { scenarioId: "s2", scenarioName: "B", scenarioDescription: "", delta: 0 },
      { scenarioId: "s3", scenarioName: "C", scenarioDescription: "", delta: -3.0 },
    ];
    const { warmer, neutral, colder } = partitionByWarmth(scenarios);
    expect(warmer).toHaveLength(1);
    expect(neutral).toHaveLength(1);
    expect(colder).toHaveLength(1);
    expect(neutral[0].scenarioId).toBe("s2");
  });

  it("handles all-neutral input correctly", () => {
    const scenarios = [
      { scenarioId: "s1", scenarioName: "A", scenarioDescription: "", delta: 0 },
      { scenarioId: "s2", scenarioName: "B", scenarioDescription: "", delta: 0 },
    ];
    const { warmer, neutral, colder } = partitionByWarmth(scenarios);
    expect(warmer).toHaveLength(0);
    expect(neutral).toHaveLength(2);
    expect(colder).toHaveLength(0);
  });
});
