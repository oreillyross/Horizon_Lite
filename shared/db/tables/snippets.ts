import { sql } from "drizzle-orm";
import { pgTable, text, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { themes } from "./themes";
import { indicators } from "./indicators";

export const snippets = pgTable("snippets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),

  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  sourceHost: text("source_host"),

  themeId: uuid("theme_id").references(() => themes.id, { onDelete: "set null" }),

  // Snippet-capture fields (Phase 4)
  quote: text("quote"),
  pubDate: timestamp("pub_date"),
  indicatorId: uuid("indicator_id").references(() => indicators.id, { onDelete: "set null" }),
  analystNotes: text("analyst_notes"),
});

export type SnippetRow = typeof snippets.$inferSelect;

