import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { paginateByUrl } from "../utils/paginate";
import { query } from "express";

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

export const intelRouter = router({
  feed: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().default(30),
      }),
    )
    .query(async ({ input }) => {
      const query = sql`
        SELECT
          url,
          domain,
          title,
          image_url,
          published_at,
          tone,
          themes,
          organizations
        FROM gdelt_documents
        WHERE published_at IS NOT NULL
        ${input.cursor ? sql`AND url < ${input.cursor}` : sql``}
      `;
      return paginateByUrl<FeedRow>(query, input.limit);
    }),

  searchDocuments: publicProcedure
    .input(
      z.object({
        q: z.string().min(3),
        limit: z.number().default(30),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const q = `%${input.q}%`;

        const query = sql`
          SELECT
            url,
            domain,
            title,
            image_url,
            published_at,
            tone,
            themes,
            organizations
          FROM gdelt_documents
          WHERE title ILIKE ${q}
          ${input.cursor ? sql`AND url < ${input.cursor}` : sql``}
        `;

        return paginateByUrl<FeedRow>(query, input.limit);
      } catch (err) {
        console.error("searchDocuments error:", err);
        throw err;
      }
    }),
});
