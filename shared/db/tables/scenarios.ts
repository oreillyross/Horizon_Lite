import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { analystGroups } from "./analysGroups";
import { themes } from "./themes";

export const scenarios = pgTable(
  "scenarios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analystGroupId: uuid("analyst_group_id")
      .notNull()
      .references(() => analystGroups.id, { onDelete: "cascade" }),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    groupIdx: index("scenarios_group_id_idx").on(t.analystGroupId),
    themeIdx: index("scenarios_theme_id_idx").on(t.themeId),
  }),
);

export type ScenarioRow = typeof scenarios.$inferSelect;
