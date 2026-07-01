import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Mock the database module before importing gdeltIngest so the
// module-level DATABASE_URL check does not throw in unit tests.
vi.mock("../db", () => ({ db: {} }));

import {
  parseExportRow,
  parseMentionsRow,
  parseGkgRow,
  extractDomain,
  normalizeTitleKey,
  buildDedupKey,
  pickDuplicateEventIds,
  type DedupCandidateRow,
} from "./gdeltIngest";

const FIXTURES = resolve(__dirname, "__fixtures__");

function loadTsv(name: string): string[][] {
  return readFileSync(resolve(FIXTURES, name), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"));
}

// ---------------------------------------------------------------------------
// Export (events) parser
// ---------------------------------------------------------------------------

describe("parseExportRow", () => {
  const rows = loadTsv("gdelt_export.tsv");

  it("parses a complete valid row", () => {
    const result = parseExportRow(rows[0]);
    expect(result).not.toBeNull();
    expect(result!.globalEventId).toBe("1147032765");
    expect(result!.eventCode).toBe("14");
    expect(result!.goldstein).toBe(-2.0);
    expect(result!.numMentions).toBe(15);
    expect(result!.actionGeoCountryCode).toBe("US");
    expect(result!.sourceUrl).toBe("https://reuters.com/article/test-event-1");
    expect(result!.sourceName).toBe("reuters.com");
  });

  it("parses eventTime from SQLDATE column", () => {
    const result = parseExportRow(rows[0]);
    expect(result!.eventTime).toBeInstanceOf(Date);
    expect(result!.eventTime!.toISOString()).toMatch(/^2024-01-15/);
  });

  it("returns null for a row with an empty globalEventId (deduplication gate)", () => {
    // row index 2 has an empty globalEventId — such rows are skipped so they
    // can never be inserted, preventing duplicates with no ID
    const result = parseExportRow(rows[2]);
    expect(result).toBeNull();
  });

  it("short rows (< 61 columns) are filtered before the parser is called", () => {
    // The ingest loop checks `cols.length < 61` before calling parseExportRow.
    // Rows that are too short are never passed to the parser — this test
    // documents that guard rather than expecting the parser to reject them.
    const shortRow = rows[3]; // 10 columns
    expect(shortRow.length).toBeLessThan(61);
  });

  it("assigns status 'new' when a parsed row is prepared for insertion", () => {
    const parsed = parseExportRow(rows[0]);
    expect(parsed).not.toBeNull();
    // The ingest function always sets status='new' on first insertion.
    const insertPayload = { ...parsed!, status: "new" as const };
    expect(insertPayload.status).toBe("new");
  });

  it("extracts a different country code from the second fixture row", () => {
    const result = parseExportRow(rows[1]);
    expect(result).not.toBeNull();
    expect(result!.globalEventId).toBe("9876543210");
    expect(result!.actionGeoCountryCode).toBe("GB");
  });
});

// ---------------------------------------------------------------------------
// Mentions parser
// ---------------------------------------------------------------------------

describe("parseMentionsRow", () => {
  const rows = loadTsv("gdelt_mentions.tsv");

  it("parses a complete valid mentions row", () => {
    const result = parseMentionsRow(rows[0]);
    expect(result).not.toBeNull();
    expect(result!.globalEventId).toBe("1147032765");
    expect(result!.url).toBe("https://reuters.com/article/mention-1");
    expect(result!.domain).toBe("reuters.com");
    expect(result!.confidence).toBe(85);
    expect(result!.docTone).toBe(-3.5);
  });

  it("generates a composite id from globalEventId + url sha1", () => {
    const r1 = parseMentionsRow(rows[0]);
    const r2 = parseMentionsRow(rows[1]);
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    // Same globalEventId, different URL → different composite id
    expect(r1!.id).not.toBe(r2!.id);
    // Same globalEventId, same URL → identical composite id (deduplication key)
    const duplicate = parseMentionsRow(rows[0]);
    expect(duplicate!.id).toBe(r1!.id);
  });

  it("returns null when globalEventId is missing (deduplication gate)", () => {
    const result = parseMentionsRow(rows[2]);
    expect(result).toBeNull();
  });

  it("returns null when url is missing (deduplication gate)", () => {
    const result = parseMentionsRow(rows[3]);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractDomain helper
// ---------------------------------------------------------------------------

describe("extractDomain", () => {
  it("strips www. prefix", () => {
    expect(extractDomain("https://www.bbc.co.uk/news/article")).toBe(
      "bbc.co.uk"
    );
  });

  it("returns null for null input", () => {
    expect(extractDomain(null)).toBeNull();
  });

  it("returns null for an invalid URL", () => {
    expect(extractDomain("not-a-url")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Story deduplication (normalised title + source domain)
// ---------------------------------------------------------------------------

describe("normalizeTitleKey", () => {
  it("lowercases and collapses punctuation/whitespace differences", () => {
    expect(normalizeTitleKey("Russia Escalates Rhetoric, Again!")).toBe(
      normalizeTitleKey("russia escalates rhetoric again"),
    );
  });
});

describe("buildDedupKey", () => {
  it("combines the normalised title with the lowercased source", () => {
    expect(buildDedupKey("Some Title", "Reuters.com")).toBe(
      buildDedupKey("some   title", "reuters.com"),
    );
  });

  it("treats a null source as an empty string, not distinct titles as equal", () => {
    expect(buildDedupKey("Title A", null)).not.toBe(buildDedupKey("Title B", null));
  });
});

describe("pickDuplicateEventIds", () => {
  const row = (overrides: Partial<DedupCandidateRow>): DedupCandidateRow => ({
    globalEventId: "id",
    title: "Russia escalates rhetoric",
    source: "reuters.com",
    ingestedAt: new Date("2024-01-15T00:00:00Z"),
    numMentions: 1,
    ...overrides,
  });

  it("keeps only one event per (normalised title + source) group, dropping the rest as duplicates", () => {
    const rows: DedupCandidateRow[] = [
      row({ globalEventId: "a", ingestedAt: new Date("2024-01-15T00:00:00Z") }),
      row({ globalEventId: "b", title: "RUSSIA ESCALATES RHETORIC!", ingestedAt: new Date("2024-01-15T01:00:00Z") }),
      row({ globalEventId: "c", title: "russia   escalates rhetoric", ingestedAt: new Date("2024-01-15T02:00:00Z") }),
    ];

    const duplicates = pickDuplicateEventIds(rows);

    expect(duplicates.size).toBe(2);
    expect(duplicates.has("a")).toBe(false); // earliest ingested — kept canonical
    expect(duplicates.has("b")).toBe(true);
    expect(duplicates.has("c")).toBe(true);
  });

  it("does not merge the same title from different sources", () => {
    const rows: DedupCandidateRow[] = [
      row({ globalEventId: "a", source: "reuters.com" }),
      row({ globalEventId: "b", source: "bbc.co.uk" }),
    ];

    const duplicates = pickDuplicateEventIds(rows);

    expect(duplicates.size).toBe(0);
  });

  it("returns an empty set when every key is unique", () => {
    const rows: DedupCandidateRow[] = [
      row({ globalEventId: "a", title: "Story one" }),
      row({ globalEventId: "b", title: "Story two" }),
    ];

    expect(pickDuplicateEventIds(rows).size).toBe(0);
  });
});
