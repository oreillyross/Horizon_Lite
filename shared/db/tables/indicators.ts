import { pgTable, text, timestamp, doublePrecision, integer, uuid } from "drizzle-orm/pg-core";

export const indicators = pgTable("indicators", {
  id: uuid("id").defaultRandom().primaryKey(),

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

  strength: integer("strength").notNull().default(5),
  // 1–9 scale of analyst-assigned indicator weight

  timeWeight: text("time_weight").notNull().default("week"),
  // day | week | month | year

  decayBehaviour: text("decay_behaviour").notNull().default("linear"),
  // linear | step | none

  lastTriggeredAt: timestamp("last_triggered_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
