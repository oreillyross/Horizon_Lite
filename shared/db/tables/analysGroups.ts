import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const analystGroups = pgTable("analyst_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});



export type AnalystGroupRow = typeof analystGroups.$inferSelect;
