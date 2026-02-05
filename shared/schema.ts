import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// NEW
export const themes = pgTable(
  "themes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),

    // optional but recommended for your “living synopsis” feature
    synopsis: text("synopsis"),
    synopsisUpdatedAt: timestamp("synopsis_updated_at", { withTimezone: true }),
    synopsisModel: text("synopsis_model"),
    synopsisVersion: integer("synopsis_version").default(0).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    nameUnique: uniqueIndex("themes_name_unique").on(t.name),
  }),
);

export const recentSources = pgTable("recent_sources", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(), // homepage/feed URL; you can repurpose later
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RecentSource = typeof recentSources.$inferSelect;

export const snippets = pgTable("snippets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  tags: text("tags")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  sourceHost: text("source_host"),
  themeId: uuid("theme_id").references(() => themes.id, {
    onDelete: "set null",
  }),
});

export const recentSourceItems = pgTable(
  "recent_source_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    sourceId: varchar("source_id")
      .notNull()
      .references(() => recentSources.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    url: text("url").notNull(),

    // If your crawler can extract it; otherwise null.
    publishedAt: timestamp("published_at"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),

    // Optional but very useful for preview + future tagging
    excerpt: text("excerpt"),
    rawText: text("raw_text"),

    // Capture tracking
    capturedAt: timestamp("captured_at"),
    capturedSnippetId: varchar("captured_snippet_id").references(
      () => snippets.id,
    ),
  },
  (t) => ({
    // prevent duplicates per URL
    urlUnique: uniqueIndex("recent_source_items_url_unique").on(t.url),
  }),
);

export type RecentSourceItem = typeof recentSourceItems.$inferSelect;

// (optional) insert schemas if you want them
export const insertRecentSourceSchema = createInsertSchema(recentSources).pick({
  name: true,
  url: true,
  enabled: true,
});

export const insertRecentSourceItemSchema = createInsertSchema(
  recentSourceItems,
).pick({
  sourceId: true,
  title: true,
  url: true,
  publishedAt: true,
  excerpt: true,
  rawText: true,
});

export type InsertRecentSource = z.infer<typeof insertRecentSourceSchema>;
export type InsertRecentSourceItem = z.infer<
  typeof insertRecentSourceItemSchema
>;

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertSnippetSchema = createInsertSchema(snippets).pick({
  content: true,
  tags: true,
  sourceUrl: true,
  sourceHost: true,
  sourceTitle: true,
  themeId: true,
});

export type InsertSnippet = z.infer<typeof insertSnippetSchema>;
export type Snippet = typeof snippets.$inferSelect;

export type Theme = {
  id: string;
  name: string;
  description: string | null;
  synopsis: string | null;
  synopsisUpdatedAt: Date | null;
  synopsisModel: string | null;
  synopsisVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ThemeListItem = {
  id: string;
  name: string;
  description: string | null;
  synopsisUpdatedAt: Date | null;
  synopsisVersion: number;
  snippetCount: number;
};
