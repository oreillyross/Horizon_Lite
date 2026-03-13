import { sql } from "drizzle-orm";
import { db } from "../db";

type PageResult<T> = {
  items: T[];
  nextCursor?: string;
};

export async function paginateByUrl<T>(
  baseQuery: ReturnType<typeof sql>,
  limit: number
): Promise<PageResult<T>> {

  const limitPlusOne = limit + 1;

  const result = await db.execute(sql`
    ${baseQuery}
    ORDER BY url DESC
    LIMIT ${limitPlusOne}
  `);

  const rows = result.rows as T[];

  let nextCursor: string | undefined;

  if (rows.length > limit) {
    const next = rows.pop();
    nextCursor = (next as any)?.url;
  }

  return {
    items: rows,
    nextCursor,
  };
}