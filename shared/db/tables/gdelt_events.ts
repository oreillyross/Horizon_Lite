import {
  pgTable,
  text,
  integer,
  doublePrecision,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { eventCodes } from "@shared/db";

export const gdeltEvents = pgTable(
  "gdelt_events",
  {
    // GDELT GlobalEventID fits in 64-bit; store as text to avoid JS bigint pain.
    globalEventId: text("global_event_id").primaryKey(),

    // From export: YYYYMMDD + additional time fields exist; simplest is store as timestamp when ingested.
    eventTime: timestamp("event_time", { withTimezone: true }),

    actor1Name: text("actor1_name"),
    actor2Name: text("actor2_name"),

    eventCode: varchar("event_code", { length: 4 }),
    
     
    quadClass: integer("quad_class"),

    goldstein: doublePrecision("goldstein"),
    avgTone: doublePrecision("avg_tone"),

    numMentions: integer("num_mentions"),
    numSources: integer("num_sources"),
    numArticles: integer("num_articles"),

    actionGeoFullname: text("action_geo_fullname"),
    actionGeoCountryCode: text("action_geo_country_code"),
    actionGeoLat: doublePrecision("action_geo_lat"),
    actionGeoLon: doublePrecision("action_geo_lon"),

    sourceUrl: text("source_url"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    eventTimeIdx: index("gdelt_events_event_time_idx").on(t.eventTime),
    codeIdx: index("gdelt_events_event_code_idx").on(t.eventCode),
    actor1Idx: index("gdelt_events_actor1_idx").on(t.actor1Name),
    actor2Idx: index("gdelt_events_actor2_idx").on(t.actor2Name),
    mentionsIdx: index("gdelt_events_num_mentions_idx").on(t.numMentions),
  }),
);

export type GdeltEventRow = typeof gdeltEvents.$inferSelect;
