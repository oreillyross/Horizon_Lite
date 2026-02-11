import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),


  username: text("username").unique(),


  email: text("email").notNull().unique(),


  passwordHash: text("password_hash").notNull(),

  role: text("role", { enum: ["analyst", "admin"] })
  .notNull()
  .default("analyst"),

  createdAt: text("created_at").notNull().default(sql`now()::text`),
});
export type UserRow = typeof users.$inferSelect;
