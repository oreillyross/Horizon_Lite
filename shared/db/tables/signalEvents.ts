import { pgTable, text, timestamp, uuid, doublePrecision } from "drizzle-orm/pg-core";
import { indicators } from "./indicators";

export const signalEvents = pgTable("signal_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  indicatorId: text("indicator_id")
    .references(() => indicators.id)
    .notNull(),

  sourceUrl: text("source_url"),
  sourceHost: text("source_host"),

  title: text("title"),

  score: doublePrecision("score").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});