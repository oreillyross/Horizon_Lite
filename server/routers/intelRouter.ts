import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { paginateBy } from "../utils/paginate";

type FeedRow = {
  url: string;
  domain: string;
  title: string;
  image_url: string | null;
  published_at: string;
  tone: number;
  themes: string[];
  organizations: string[];
};

const sortBySchema = z.enum(["added", "date"]).default("added");

export const intelRouter = router({
  feed: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().default(30),
        sortBy: sortBySchema,
      }),
    )
    .query(async ({ input }) => {
      const baseQuery = sql`
        SELECT
          url,
          domain,
          title,
          image_url,
          published_at,
          tone,
          themes,
          organizations,
          created_at
        FROM gdelt_documents
        WHERE published_at IS NOT NULL
      `;
      return paginateBy<FeedRow>(baseQuery, input.limit, input.sortBy, input.cursor);
    }),

  searchDocuments: publicProcedure
    .input(
      z.object({
        q: z.string().min(3),
        limit: z.number().default(30),
        cursor: z.string().optional(),
        sortBy: sortBySchema,
      }),
    )
    .query(async ({ input }) => {
      try {
        const q = `%${input.q}%`;

        const baseQuery = sql`
          SELECT
            url,
            domain,
            title,
            image_url,
            published_at,
            tone,
            themes,
            organizations,
            created_at
          FROM gdelt_documents
          WHERE title ILIKE ${q}
        `;

        return paginateBy<FeedRow>(baseQuery, input.limit, input.sortBy, input.cursor);
      } catch (err) {
        console.error("searchDocuments error:", err);
        throw err;
      }
    }),

  /**
   * Return all mention headlines for a GDELT event, for the Coverage tab.
   * Joins gdelt_event_mentions → gdelt_documents to get titles.
   */
  coverage: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input }) => {
      const mentionRows = await db.execute(sql`
        SELECT
          em.id,
          em.url,
          em.domain,
          em.mention_time,
          em.doc_tone,
          d.title
        FROM gdelt_event_mentions em
        LEFT JOIN gdelt_documents d ON d.url = em.url
        WHERE em.global_event_id = ${input.eventId}
        ORDER BY em.mention_time DESC
      `);

      const evtRows = await db.execute(sql`
        SELECT num_mentions, num_sources, avg_tone
        FROM gdelt_events
        WHERE global_event_id = ${input.eventId}
        LIMIT 1
      `);

      const evt = evtRows.rows[0] as {
        num_mentions: number | null;
        num_sources: number | null;
        avg_tone: number | null;
      } | undefined;

      type MentionRow = {
        id: string;
        url: string;
        domain: string | null;
        mention_time: string | null;
        doc_tone: number | null;
        title: string | null;
      };

      const headlines = (mentionRows.rows as MentionRow[]).map((r) => {
        let source = r.domain;
        if (!source) {
          try {
            source = new URL(r.url).hostname.replace(/^www\./, "");
          } catch {
            source = r.url;
          }
        }
        return {
          id: r.id,
          title: r.title || "(untitled)",
          source,
          url: r.url,
          createdAt: r.mention_time,
        };
      });

      const uniqueSources = new Set(headlines.map((h) => h.source)).size;

      return {
        eventId: input.eventId,
        mentionCount: evt?.num_mentions ?? headlines.length,
        sourceCount: evt?.num_sources ?? uniqueSources,
        avgTone: evt?.avg_tone ?? null,
        headlines,
      };
    }),

  /**
   * Look up the highest-mention GDELT event for a given document URL.
   * Used by FeedCard to show a Coverage button when the doc belongs to
   * a high-signal event (>15 mentions).
   */
  eventsByDocUrl: publicProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ input }) => {
      const rows = await db.execute(sql`
        SELECT
          e.global_event_id,
          e.num_mentions,
          e.num_sources,
          e.avg_tone,
          e.actor1_name,
          e.actor2_name,
          e.event_time,
          e.action_geo_fullname
        FROM gdelt_event_mentions em
        JOIN gdelt_events e ON e.global_event_id = em.global_event_id
        WHERE em.url = ${input.url}
          AND e.num_mentions > 15
        ORDER BY e.num_mentions DESC
        LIMIT 1
      `);

      type EventRow = {
        global_event_id: string;
        num_mentions: number | null;
        num_sources: number | null;
        avg_tone: number | null;
        actor1_name: string | null;
        actor2_name: string | null;
        event_time: string | null;
        action_geo_fullname: string | null;
      };

      return (rows.rows as EventRow[]).map((r) => ({
        globalEventId: r.global_event_id,
        numMentions: r.num_mentions,
        numSources: r.num_sources,
        avgTone: r.avg_tone,
        actor1Name: r.actor1_name,
        actor2Name: r.actor2_name,
        eventTime: r.event_time,
        actionGeoFullname: r.action_geo_fullname,
      }));
    }),

  /**
   * Paginated list of GDELT events for the /intel/events page.
   * Only returns events with ≥5 mentions (min signal threshold).
   * Supports cursor-based pagination and an optional actor/geo search.
   */
  listEvents: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(30),
        q: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { limit, cursor, q } = input;
      const limitPlusOne = limit + 1;

      type EventListRow = {
        global_event_id: string;
        event_time: string | null;
        actor1_name: string | null;
        actor2_name: string | null;
        event_code: string | null;
        num_mentions: number | null;
        num_sources: number | null;
        avg_tone: number | null;
        action_geo_fullname: string | null;
        goldstein: number | null;
        num_articles: number | null;
        event_code_name: string | null;
      };

      let result;

      if (q && q.trim().length >= 2) {
        const like = `%${q.trim()}%`;
        if (cursor) {
          const { s: cursorMentions, u: cursorId } = JSON.parse(
            Buffer.from(cursor, "base64").toString("utf8"),
          ) as { s: string; u: string };

          result = await db.execute(sql`
            SELECT
              e.global_event_id, e.event_time, e.actor1_name, e.actor2_name,
              e.event_code, e.num_mentions, e.num_sources, e.avg_tone,
              e.action_geo_fullname, e.goldstein, e.num_articles,
              ec.name AS event_code_name
            FROM gdelt_events e
            LEFT JOIN event_codes ec ON ec.code = e.event_code
            WHERE e.num_mentions >= 1
              AND (
                e.actor1_name ILIKE ${like}
                OR e.actor2_name ILIKE ${like}
                OR e.action_geo_fullname ILIKE ${like}
              )
              AND (e.num_mentions, e.global_event_id) < (${cursorMentions}::int, ${cursorId})
            ORDER BY e.num_mentions DESC NULLS LAST, e.global_event_id DESC
            LIMIT ${limitPlusOne}
          `);
        } else {
          result = await db.execute(sql`
            SELECT
              e.global_event_id, e.event_time, e.actor1_name, e.actor2_name,
              e.event_code, e.num_mentions, e.num_sources, e.avg_tone,
              e.action_geo_fullname, e.goldstein, e.num_articles,
              ec.name AS event_code_name
            FROM gdelt_events e
            LEFT JOIN event_codes ec ON ec.code = e.event_code
            WHERE e.num_mentions >= 1
              AND (
                e.actor1_name ILIKE ${like}
                OR e.actor2_name ILIKE ${like}
                OR e.action_geo_fullname ILIKE ${like}
              )
            ORDER BY e.num_mentions DESC NULLS LAST, e.global_event_id DESC
            LIMIT ${limitPlusOne}
          `);
        }
      } else if (cursor) {
        const { s: cursorMentions, u: cursorId } = JSON.parse(
          Buffer.from(cursor, "base64").toString("utf8"),
        ) as { s: string; u: string };

        result = await db.execute(sql`
          SELECT
            e.global_event_id, e.event_time, e.actor1_name, e.actor2_name,
            e.event_code, e.num_mentions, e.num_sources, e.avg_tone,
            e.action_geo_fullname, e.goldstein, e.num_articles,
            ec.name AS event_code_name
          FROM gdelt_events e
          LEFT JOIN event_codes ec ON ec.code = e.event_code
          WHERE e.num_mentions >= 1
            AND (e.num_mentions, e.global_event_id) < (${cursorMentions}::int, ${cursorId})
          ORDER BY e.num_mentions DESC NULLS LAST, e.global_event_id DESC
          LIMIT ${limitPlusOne}
        `);
      } else {
        result = await db.execute(sql`
          SELECT
            e.global_event_id, e.event_time, e.actor1_name, e.actor2_name,
            e.event_code, e.num_mentions, e.num_sources, e.avg_tone,
            e.action_geo_fullname, e.goldstein, e.num_articles,
            ec.name AS event_code_name
          FROM gdelt_events e
          LEFT JOIN event_codes ec ON ec.code = e.event_code
          WHERE e.num_mentions >= 1
          ORDER BY e.num_mentions DESC NULLS LAST, e.global_event_id DESC
          LIMIT ${limitPlusOne}
        `);
      }

      const rows = result.rows as EventListRow[];
      let nextCursor: string | undefined;

      if (rows.length > limit) {
        const next = rows.pop()!;
        nextCursor = Buffer.from(
          JSON.stringify({ s: next.num_mentions ?? 0, u: next.global_event_id }),
        ).toString("base64");
      }

      return {
        items: rows.map((r) => ({
          globalEventId: r.global_event_id,
          eventTime: r.event_time,
          actor1Name: r.actor1_name,
          actor2Name: r.actor2_name,
          eventCode: r.event_code,
          numMentions: r.num_mentions,
          numSources: r.num_sources,
          avgTone: r.avg_tone,
          actionGeoFullname: r.action_geo_fullname,
          goldstein: r.goldstein,
          numArticles: r.num_articles,
          eventCodeName: r.event_code_name,
        })),
        nextCursor,
      };
    }),
});
