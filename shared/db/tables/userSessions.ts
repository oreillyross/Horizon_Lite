import { pgTable, varchar, json, timestamp } from "drizzle-orm/pg-core";

export const userSessions = pgTable("user_sessions", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6, withTimezone: false }).notNull(),
});
