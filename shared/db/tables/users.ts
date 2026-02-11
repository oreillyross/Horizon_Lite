import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, timestamp } from "drizzle-orm/pg-core";
import { analystGroups } from "./analysGroups";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  username: text("username").unique(),

  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),

  role: text("role", { enum: ["analyst", "admin"] })
    .notNull()
    .default("analyst"),

  analystGroupId: uuid("analyst_group_id")
    .notNull()
    .references(() => analystGroups.id, { onDelete: "restrict" }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserRow = typeof users.$inferSelect;
