import {
  pgTable,
  text,
  integer,
  doublePrecision,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";


export const gdeltEventMentions = pgTable(
  "gdelt_event_mentions",
  {
    id: text("id").primaryKey(), // deterministic id = `${globalEventId}|${urlHash}` (we’ll generate)
    globalEventId: text("global_event_id").notNull(),

    mentionTime: timestamp("mention_time", { withTimezone: true }),

    domain: text("domain"),
    url: text("url").notNull(),

    confidence: integer("confidence"),
    docTone: doublePrecision("doc_tone"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uniqueEventUrl: uniqueIndex("gdelt_event_mentions_event_url_uq").on(
      t.globalEventId,
      t.url,
    ),
    urlIdx: index("gdelt_event_mentions_url_idx").on(t.url),
    eventIdx: index("gdelt_event_mentions_event_idx").on(t.globalEventId),
  }),
);

export type GdeltEventMentionRow = typeof gdeltEventMentions.$inferSelect;
