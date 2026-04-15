import { sql } from "drizzle-orm";
import { db } from "../db";

type PageResult<T> = {
  items: T[];
  nextCursor?: string;
};

type SortMode = "added" | "date";

// Composite cursor: encodes (sortValue, url) as a base64 JSON string
function encodeCursor(sortValue: string, url: string): string {
  return Buffer.from(JSON.stringify({ s: sortValue, u: url })).toString("base64");
}

function decodeCursor(cursor: string): { s: string; u: string } | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Paginate gdelt_documents by either:
 *   "added" — ORDER BY created_at DESC (ingestion order, always reliable)
 *   "date"  — ORDER BY published_at DESC NULLS LAST (article date; 1970 epochs excluded)
 *
 * Uses keyset pagination with a composite (sort_field, url) cursor so results
 * are stable even when multiple rows share the same timestamp.
 */
export async function paginateBy<T>(
  baseQuery: ReturnType<typeof sql>,
  limit: number,
  sortMode: SortMode,
  cursor?: string
): Promise<PageResult<T>> {
  const limitPlusOne = limit + 1;
  const decoded = cursor ? decodeCursor(cursor) : null;

  let orderAndCursor;

  if (sortMode === "added") {
    orderAndCursor = decoded
      ? sql`
          AND (created_at, url) < (${decoded.s}::timestamptz, ${decoded.u})
          ORDER BY created_at DESC, url DESC
          LIMIT ${limitPlusOne}
        `
      : sql`
          ORDER BY created_at DESC, url DESC
          LIMIT ${limitPlusOne}
        `;
  } else {
    // date mode: exclude epoch dates (published_at before 1971)
    const epochFilter = sql`AND published_at > '1971-01-01'::timestamptz`;
    orderAndCursor = decoded
      ? sql`
          ${epochFilter}
          AND (published_at, url) < (${decoded.s}::timestamptz, ${decoded.u})
          ORDER BY published_at DESC NULLS LAST, url DESC
          LIMIT ${limitPlusOne}
        `
      : sql`
          ${epochFilter}
          ORDER BY published_at DESC NULLS LAST, url DESC
          LIMIT ${limitPlusOne}
        `;
  }

  const result = await db.execute(sql`${baseQuery} ${orderAndCursor}`);
  const rows = result.rows as (T & { url: string; created_at?: string; published_at?: string })[];

  let nextCursor: string | undefined;

  if (rows.length > limit) {
    const next = rows.pop()!;
    const sortValue =
      sortMode === "added"
        ? (next.created_at ?? "")
        : (next.published_at ?? "");
    nextCursor = encodeCursor(sortValue, next.url);
  }

  return { items: rows as unknown as T[], nextCursor };
}

