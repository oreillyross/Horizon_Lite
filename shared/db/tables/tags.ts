import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  varchar,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

import { snippets } from "./snippets";
import { recentSourceItems } from "./recentSources";

// ---- tags ----
export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---- snippet_tags ----
export const snippetTags = pgTable(
  "snippet_tags",
  {
    snippetId: varchar("snippet_id")
      .notNull()
      .references(() => snippets.id, { onDelete: "cascade" }),

    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.snippetId, t.tagId] }),
    snippetIdx: index("snippet_tags_snippet_id_idx").on(t.snippetId),
    tagIdx: index("snippet_tags_tag_id_idx").on(t.tagId),
  })
);

// ---- recent_source_item_tags ----
export const recentSourceItemTags = pgTable(
  "recent_source_item_tags",
  {
    sourceItemId: varchar("source_item_id")
      .notNull()
      .references(() => recentSourceItems.id, { onDelete: "cascade" }),

    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.sourceItemId, t.tagId] }),
    sourceItemIdx: index("recent_source_item_tags_source_item_id_idx").on(t.sourceItemId),
    tagIdx: index("recent_source_item_tags_tag_id_idx").on(t.tagId),
  })
);

export type TagRow = typeof tags.$inferSelect;
export type InsertTagRow = typeof tags.$inferInsert;
