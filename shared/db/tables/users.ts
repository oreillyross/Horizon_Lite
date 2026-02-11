import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  username: text("username").unique(),

  email: text("email").notNull().unique(),


  passwordHash: text("password_hash").notNull(),

  role: text("role", { enum: ["analyst", "admin"] })
  .notNull()
  .default("analyst"),

  createdAt: timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull(),
});
export type UserRow = typeof users.$inferSelect;
