// server/session.ts
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { logger } from "./logger";

const PgSession = connectPgSimple(session);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sessionDbUrl = new URL(process.env.DATABASE_URL!);
logger.info({ module: "session", host: sessionDbUrl.host, database: sessionDbUrl.pathname }, "Session store connecting to database");


export function sessionMiddleware() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET env var");
  }

  return session({
    name: "hl_session",
    secret,
    resave: false,
    saveUninitialized: false,
    proxy: process.env.NODE_ENV === "production",
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      schemaName: "public",
      createTableIfMissing: false,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  });

}
