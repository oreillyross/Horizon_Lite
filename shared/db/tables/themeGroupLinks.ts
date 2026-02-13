import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { analystGroups } from "./analysGroups";
import { themes } from "./themes";

export const themeGroupLinks = pgTable(
  "theme_group_links",
  {
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => analystGroups.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.themeId, t.groupId] }),
  }),
);
