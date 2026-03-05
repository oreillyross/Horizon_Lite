import {
  pgTable,
  text,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const scenarioIndicatorMap = pgTable("scenario_indicator_map", {
  scenarioId: text("scenario_id").notNull(),

  indicatorId: text("indicator_id").notNull(),

  weight: doublePrecision("weight").notNull(),
});