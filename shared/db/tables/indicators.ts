import { pgTable, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const indicators = pgTable("indicators", {
  id: text("id").primaryKey(),

  name: text("name").notNull(),

  category: text("category").notNull(),
  // infoops | political | infra | diplomatic

  regionScope: text("region_scope").default("EU-wide"),

  description: text("description"),

  currentValue: doublePrecision("current_value").default(0),

  baselineValue: doublePrecision("baseline_value").default(0),

  accelerationScore: doublePrecision("acceleration_score").default(0),

  thresholdWatch: doublePrecision("threshold_watch").default(1.5),

  thresholdTrigger: doublePrecision("threshold_trigger").default(2.5),

  status: text("status").default("normal"),
  // normal | watching | triggered

  lastTriggeredAt: timestamp("last_triggered_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
