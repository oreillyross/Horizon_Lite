import { pgTable, doublePrecision, uuid } from "drizzle-orm/pg-core";
import { scenarios } from "./scenarios";
import { indicators } from "./indicators";

export const scenarioIndicatorMap = pgTable("scenario_indicator_map", {
  scenarioId: uuid("scenario_id")
    .notNull()
    .references(() => scenarios.id, { onDelete: "cascade" }),

  indicatorId: uuid("indicator_id")
    .notNull()
    .references(() => indicators.id, { onDelete: "cascade" }),

  weight: doublePrecision("weight").notNull(),
});
