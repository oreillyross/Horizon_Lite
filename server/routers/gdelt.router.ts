import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { sql, SQL } from "drizzle-orm";
import { fetchReadable } from "../utils/webcut";

type TriageRow = {
  global_event_id: string;
  title: string | null;
  source_name: string | null;
  ingested_at: string;
  action_geo_country_code: string | null;
  action_geo_fullname: string | null;
  source_url: string | null;
  status: string;
  actor1_name: string | null;
  actor2_name: string | null;
  num_mentions: number | null;
  goldstein: number | null;
};

const triageStatusSchema = z.enum(["new", "flagged", "skipped", "reviewed"]);

const qSchema = z.string().trim().max(200).optional();

// Lateral join that exposes document title, themes, and organizations for search.
const docLateralJoin = sql`
  LEFT JOIN LATERAL (
    SELECT gd.title, gd.url, gd.themes, gd.organizations
    FROM gdelt_event_mentions gem
    JOIN gdelt_documents gd ON gd.url = gem.url
    WHERE gem.global_event_id = e.global_event_id
      AND gd.title IS NOT NULL
    ORDER BY gem.confidence DESC NULLS LAST
    LIMIT 1
  ) d ON true`;

function buildSearchCondition(q: string): SQL {
  const like = `%${q}%`;
  return sql`AND (
    to_tsvector('english',
      coalesce(e.title, '') || ' ' ||
      coalesce(d.title, '') || ' ' ||
      coalesce(e.actor1_name, '') || ' ' ||
      coalesce(e.actor2_name, '') || ' ' ||
      coalesce(e.action_geo_fullname, '') || ' ' ||
      coalesce(e.action_geo_country_code, '')
    ) @@ plainto_tsquery('english', ${q})
    OR array_to_string(d.themes, ' ') ILIKE ${like}
    OR array_to_string(d.organizations, ' ') ILIKE ${like}
  )`;
}

export const gdeltRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(30),
        cursor: z.string().optional(),
        status: triageStatusSchema.optional().default("new"),
        q: qSchema,
      }),
    )
    .query(async ({ input }) => {
      const { limit, cursor, status, q } = input;
      const limitPlusOne = limit + 1;

      const { t: cursorTime, u: cursorId } = cursor
        ? (JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as { t: string; u: string })
        : { t: null, u: null };

      const searchFrag = q ? buildSearchCondition(q) : sql``;

      const result = await db.execute(sql`
        SELECT e.global_event_id,
               COALESCE(e.title, d.title)       AS title,
               e.source_name,
               e.ingested_at,
               e.action_geo_country_code,
               e.action_geo_fullname,
               COALESCE(e.source_url, d.url)    AS source_url,
               e.status,
               e.actor1_name,
               e.actor2_name,
               e.num_mentions,
               e.goldstein
        FROM gdelt_events e
        ${docLateralJoin}
        WHERE e.status = ${status}
          ${cursorTime && cursorId ? sql`AND (e.ingested_at, e.global_event_id) < (${cursorTime}::timestamptz, ${cursorId})` : sql``}
          ${searchFrag}
        ORDER BY e.ingested_at DESC, e.global_event_id DESC
        LIMIT ${limitPlusOne}
      `);

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
          geoFullname: r.action_geo_fullname,
          sourceUrl: r.source_url,
          status: r.status,
          actor1Name: r.actor1_name,
          actor2Name: r.actor2_name,
          numMentions: r.num_mentions,
          goldstein: r.goldstein,
        })),
        nextCursor,
      };
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["new", "flagged", "skipped"]),
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

  countNew: protectedProcedure
    .input(z.object({ q: qSchema }))
    .query(async ({ input }) => {
      const { q } = input;
      const joinFrag = q ? docLateralJoin : sql``;
      const searchFrag = q ? buildSearchCondition(q) : sql``;
      const result = await db.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM gdelt_events e
        ${joinFrag}
        WHERE e.status = 'new'
        ${searchFrag}
      `);
      const row = result.rows[0] as { count: number };
      return { count: row.count ?? 0 };
    }),

  countFlagged: protectedProcedure.query(async () => {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM gdelt_events WHERE status = 'flagged'
    `);
    const row = result.rows[0] as { count: number };
    return { count: row.count ?? 0 };
  }),

  getEvent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await db.execute(sql`
        SELECT e.global_event_id,
               COALESCE(e.title, d.title)       AS title,
               e.source_name,
               e.ingested_at,
               e.action_geo_country_code,
               e.action_geo_fullname,
               COALESCE(e.source_url, d.url)    AS source_url,
               e.status,
               e.actor1_name,
               e.actor2_name,
               e.num_mentions,
               e.goldstein
        FROM gdelt_events e
        LEFT JOIN LATERAL (
          SELECT gd.title, gd.url
          FROM gdelt_event_mentions gem
          JOIN gdelt_documents gd ON gd.url = gem.url
          WHERE gem.global_event_id = e.global_event_id
            AND gd.title IS NOT NULL
          ORDER BY gem.confidence DESC NULLS LAST
          LIMIT 1
        ) d ON true
        WHERE e.global_event_id = ${input.id}
        LIMIT 1
      `);
      const row = result.rows[0] as TriageRow | undefined;
      if (!row) return null;
      return {
        globalEventId: row.global_event_id,
        title: row.title,
        sourceName: row.source_name,
        ingestedAt: row.ingested_at,
        countryCode: row.action_geo_country_code,
        geoFullname: row.action_geo_fullname,
        sourceUrl: row.source_url,
        status: row.status,
        actor1Name: row.actor1_name,
        actor2Name: row.actor2_name,
        numMentions: row.num_mentions,
        goldstein: row.goldstein,
      };
    }),

  webcut: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      const result = await fetchReadable(input.url);
      return { text: result.textContent, title: result.title };
    }),
});
