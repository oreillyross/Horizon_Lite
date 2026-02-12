import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/db";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
console.log("migration:SESSION_DB_URL_HOST", new URL(process.env.DATABASE_URL!).host);
console.log("migration:SESSION_DB_URL_DB", new URL(process.env.DATABASE_URL!).pathname);

export const db = drizzle(pool, { schema });
