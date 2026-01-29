import { describe, it, expect } from "vitest";
import { normalizeTag, normalizeTags } from "./tags";

describe("tag normalization", () => {
  it("lowercases, trims, strips #", () => {
    expect(normalizeTag("  #JavaScript ")).toBe("javascript");
  });

  it("converts internal spaces to hyphens", () => {
    expect(normalizeTag("machine learning")).toBe("machine-learning");
  });

  it("dedupes + drops empties", () => {
    expect(normalizeTags(["JS", " #js ", ""])).toEqual(["js"]);
  });
});
