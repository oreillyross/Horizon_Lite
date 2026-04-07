import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { paginateBy, paginateByUrl } from "../utils/paginate";

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
});
