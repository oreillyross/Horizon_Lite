import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { sql } from "drizzle-orm";

type TriageRow = {
  global_event_id: string;
  title: string | null;
  source_name: string | null;
  ingested_at: string;
  action_geo_country_code: string | null;
  source_url: string | null;
  status: string;
};

export const gdeltRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(30),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { limit, cursor } = input;
      const limitPlusOne = limit + 1;

      let result;

      if (cursor) {
        const { t: cursorTime, u: cursorId } = JSON.parse(
          Buffer.from(cursor, "base64").toString("utf8"),
        ) as { t: string; u: string };

        result = await db.execute(sql`
          SELECT global_event_id, title, source_name, ingested_at,
                 action_geo_country_code, source_url, status
          FROM gdelt_events
          WHERE status = 'new'
            AND (ingested_at, global_event_id) < (${cursorTime}::timestamptz, ${cursorId})
          ORDER BY ingested_at DESC, global_event_id DESC
          LIMIT ${limitPlusOne}
        `);
      } else {
        result = await db.execute(sql`
          SELECT global_event_id, title, source_name, ingested_at,
                 action_geo_country_code, source_url, status
          FROM gdelt_events
          WHERE status = 'new'
          ORDER BY ingested_at DESC, global_event_id DESC
          LIMIT ${limitPlusOne}
        `);
      }

      const rows = result.rows as TriageRow[];
      let nextCursor: string | undefined;

      if (rows.length > limit) {
        const next = rows.pop()!;
        nextCursor = Buffer.from(
          JSON.stringify({ t: next.ingested_at, u: next.global_event_id }),
        ).toString("base64");
      }

      return {
        items: rows.map((r) => ({
          globalEventId: r.global_event_id,
          title: r.title,
          sourceName: r.source_name,
          ingestedAt: r.ingested_at,
          countryCode: r.action_geo_country_code,
          sourceUrl: r.source_url,
          status: r.status,
        })),
        nextCursor,
      };
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["flagged", "skipped"]),
      }),
    )
    .mutation(async ({ input }) => {
      await db.execute(sql`
        UPDATE gdelt_events
        SET status = ${input.status}, updated_at = NOW()
        WHERE global_event_id = ${input.id}
      `);
      return { ok: true };
    }),

  countNew: protectedProcedure.query(async () => {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM gdelt_events WHERE status = 'new'
    `);
    const row = result.rows[0] as { count: number };
    return { count: row.count ?? 0 };
  }),
});
