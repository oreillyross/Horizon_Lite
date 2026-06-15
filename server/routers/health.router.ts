import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { signalEvents } from "@shared/db";

const HealthSchema = z.object({
  db: z.enum(["ok", "error"]),
  lastIngestAt: z.string().nullable(),
  signalQueueDepth: z.number().int(),
});

export async function getHealthData() {
  let dbStatus: "ok" | "error" = "ok";
  let lastIngestAt: string | null = null;
  let signalQueueDepth = 0;

  try {
    await db.execute(sql`SELECT 1`);

    const lastRow = await db
      .select({ createdAt: signalEvents.createdAt })
      .from(signalEvents)
      .orderBy(sql`${signalEvents.createdAt} DESC`)
      .limit(1);
    lastIngestAt = lastRow[0]?.createdAt?.toISOString() ?? null;

    const depthRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(signalEvents)
      .where(eq(signalEvents.status, "pending"));
    signalQueueDepth = depthRow[0]?.count ?? 0;
  } catch {
    dbStatus = "error";
  }

  return { db: dbStatus, lastIngestAt, signalQueueDepth };
}

export const healthRouter = router({
  health: publicProcedure.output(HealthSchema).query(getHealthData),
});
