import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { appConfig } from "@shared/db";
import { runGdeltJob, GdeltJobLockedError } from "./runGdeltJob";
import { withSpan } from "../otel/tracer";
import { logger } from "../logger";

const ENABLED_KEY = "gdelt_auto_enabled";
const FREQUENCY_KEY = "gdelt_auto_frequency";
const LAST_RUN_KEY = "gdelt_auto_last_run";

const VALID_FREQUENCIES = new Set(["1", "2", "4", "6"]);

async function setLastRun(at: Date) {
  await db
    .insert(appConfig)
    .values({ key: LAST_RUN_KEY, value: at.toISOString() })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: at.toISOString(), updatedAt: at },
    });
}

export async function runScheduledGdeltIngest() {
  return withSpan("gdelt.scheduler.tick", {}, async () => {
    const rows = await db
      .select({ key: appConfig.key, value: appConfig.value })
      .from(appConfig)
      .where(inArray(appConfig.key, [ENABLED_KEY, FREQUENCY_KEY, LAST_RUN_KEY]));

    const config = new Map(rows.map((r) => [r.key, r.value]));

    if (config.get(ENABLED_KEY) !== "true") return;

    const frequency = config.get(FREQUENCY_KEY);
    if (!frequency || !VALID_FREQUENCIES.has(frequency)) return;

    const intervalMs = (24 / Number(frequency)) * 60 * 60 * 1000;
    const lastRunValue = config.get(LAST_RUN_KEY);
    const lastRunAt = lastRunValue ? new Date(lastRunValue) : null;
    const now = new Date();

    if (lastRunAt && now.getTime() - lastRunAt.getTime() < intervalMs) return;

    logger.info(
      { module: "gdelt-scheduler", everyHours: 24 / Number(frequency) },
      "Scheduled GDELT ingest due — starting",
    );

    try {
      await runGdeltJob();
    } catch (error) {
      if (error instanceof GdeltJobLockedError) {
        logger.info({ module: "gdelt-scheduler" }, "Skipped — manual or scheduled run already in progress");
        return;
      }
      logger.error(
        { module: "gdelt-scheduler", err: error instanceof Error ? error.message : error },
        "Scheduled GDELT ingest failed",
      );
    }

    await setLastRun(now);
  });
}
