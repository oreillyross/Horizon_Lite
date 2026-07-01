import { describe, it, expect } from "vitest";
import { summarizeList, summarizeValue } from "./logger";

describe("summarizeList", () => {
  it("returns count and a sample of item ids", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    expect(summarizeList(items)).toEqual({ count: 4, sampleIds: ["a", "b", "c", "d"] });
  });

  it("falls back to globalEventId then url when id is absent", () => {
    expect(summarizeList([{ globalEventId: "g1" }])).toEqual({ count: 1, sampleIds: ["g1"] });
    expect(summarizeList([{ url: "https://example.com" }])).toEqual({
      count: 1,
      sampleIds: ["https://example.com"],
    });
  });

  it("caps the sample at 5 items regardless of list length", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
    const result = summarizeList(items);
    expect(result.count).toBe(20);
    expect(result.sampleIds).toHaveLength(5);
  });

  it("handles primitive array items", () => {
    expect(summarizeList([1, 2, 3])).toEqual({ count: 3, sampleIds: [1, 2, 3] });
  });
});

describe("summarizeValue", () => {
  it("summarizes arrays the same way as summarizeList", () => {
    expect(summarizeValue([{ id: "x" }])).toEqual({ count: 1, sampleIds: ["x"] });
  });

  it("reduces objects to their key list", () => {
    expect(summarizeValue({ email: "a@b.com", password: "secret" })).toEqual({
      keys: ["email", "password"],
    });
  });

  it("passes primitives through unchanged", () => {
    expect(summarizeValue("hello")).toBe("hello");
    expect(summarizeValue(42)).toBe(42);
    expect(summarizeValue(undefined)).toBe(undefined);
    expect(summarizeValue(null)).toBe(null);
  });
});
