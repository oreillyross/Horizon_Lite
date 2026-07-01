import { sql } from "drizzle-orm";
import { db } from "../db";
import { ingestGdelt } from "./gdeltIngest";
import { generateSignals } from "./generateSignals";
import { withSpan } from "../otel/tracer";
import { logger } from "../logger";

const GDELT_JOB_LOCK_ID = 987654321;

export class GdeltJobLockedError extends Error {
  constructor() {
    super("GDELT job already running");
  }
}

export async function runGdeltJob() {
  return withSpan("gdelt.job", {}, async () => {
    let lockAcquired = false;

    try {
      const lockResult = await db.execute(
        sql`SELECT pg_try_advisory_lock(${GDELT_JOB_LOCK_ID}) as locked`,
      );

      const locked = Boolean(lockResult.rows[0]?.locked);
      if (!locked) {
        throw new GdeltJobLockedError();
      }
      lockAcquired = true;

      const startedAt = Date.now();
      logger.info({ module: "gdelt-job" }, "GDELT job started");

      const ingestResult = await ingestGdelt();
      const signalResult = await generateSignals();

      const durationMs = Date.now() - startedAt;

      logger.info(
        { module: "gdelt-job", durationMs, ingestResult, signalResult },
        "GDELT job finished",
      );

      return {
        ok: true as const,
        job: "gdelt" as const,
        durationMs,
        ingestResult,
        signalResult,
      };
    } finally {
      if (lockAcquired) {
        try {
          await db.execute(sql`SELECT pg_advisory_unlock(${GDELT_JOB_LOCK_ID})`);
        } catch (unlockError) {
          logger.error({ module: "gdelt-job", err: unlockError }, "Failed to release GDELT advisory lock");
        }
      }
    }
  });
}
