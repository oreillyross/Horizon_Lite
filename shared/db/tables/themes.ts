import { integer, text, timestamp, uniqueIndex, uuid, pgTable } from "drizzle-orm/pg-core";

export const themes = pgTable(
  "themes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),

    synopsis: text("synopsis"),
    synopsisUpdatedAt: timestamp("synopsis_updated_at", { withTimezone: true }),
    synopsisModel: text("synopsis_model"),
    synopsisVersion: integer("synopsis_version").default(0).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nameUnique: uniqueIndex("themes_name_unique").on(t.name),
  }),
);

export type ThemeRow = typeof themes.$inferSelect;
