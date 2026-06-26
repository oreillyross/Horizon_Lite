import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const indicatorCategories = pgTable("indicator_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  value: text("value").notNull().unique(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
