import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { snippets } from "./snippets";

export const recentSources = pgTable("recent_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RecentSourceRow = typeof recentSources.$inferSelect;

export const recentSourceItems = pgTable(
  "recent_source_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    sourceId: varchar("source_id")
      .notNull()
      .references(() => recentSources.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    url: text("url").notNull(),

    publishedAt: timestamp("published_at"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),

    excerpt: text("excerpt"),
    rawText: text("raw_text"),

    capturedAt: timestamp("captured_at"),
    capturedSnippetId: varchar("captured_snippet_id").references(() => snippets.id),
  },
  (t) => ({
    urlUnique: uniqueIndex("recent_source_items_url_unique").on(t.url),
  }),
);

export type RecentSourceItemRow = typeof recentSourceItems.$inferSelect;
