import {pgTable, varchar, primaryKey, uuid} from "drizzle-orm/pg-core"
import {snippets} from "./snippets"
import {analystGroups } from "./analysGroups"

export const snippetGroupLinks = pgTable("snippet_group_links", {
  snippetId: varchar("snippet_id").notNull().references(() => snippets.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => analystGroups.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.snippetId, t.groupId] }),
}));
