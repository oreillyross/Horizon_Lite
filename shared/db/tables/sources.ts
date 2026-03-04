// shared/schema/sources.ts (or server/db/schema/sources.ts depending on your layout)
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/pg-core";

export const sources = pgTable(
  "sources",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    url: text("url").notNull(),
    title: text("title"),          // optional: can be fetched later
    notes: text("notes"),          // optional: why we care

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    urlUnique: uniqueIndex("sources_url_unique").on(t.url),
  })
);

export type SourceRow = typeof sources.$inferSelect;
export type SourceInsert = typeof sources.$inferInsert;