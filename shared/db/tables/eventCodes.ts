// shared/db/eventCodes.ts

import { pgTable, varchar, text, integer, real } from "drizzle-orm/pg-core";

export const eventCodes = pgTable("event_codes", {
  code: varchar("code", { length: 4 }).primaryKey(),

  parentCode: varchar("parent_code", { length: 4 }),

  name: text("name").notNull(),

  description: text("description"),

  level: integer("level").notNull(),

  quadClass: integer("quad_class"),

  goldsteinScore: real("goldstein_score"),
});