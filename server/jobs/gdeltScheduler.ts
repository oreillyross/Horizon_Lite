import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { appConfig } from "@shared/db";
import { runGdeltJob, GdeltJobLockedError } from "./runGdeltJob";

const ENABLED_KEY = "gdelt_auto_enabled";
const FREQUENCY_KEY = "gdelt_auto_frequency";
const LAST_RUN_KEY = "gdelt_auto_last_run";

const VALID_FREQUENCIES = new Set(["1", "2", "4", "6"]);

function log(message: string, source = "gdelt-scheduler") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

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

  log(`Scheduled GDELT ingest due (every ${24 / Number(frequency)}h) — starting`);

  try {
    await runGdeltJob();
  } catch (error) {
    if (error instanceof GdeltJobLockedError) {
      log("Skipped — manual or scheduled run already in progress");
      return;
    }
    log(`Scheduled GDELT ingest failed: ${error instanceof Error ? error.message : error}`);
  }

  await setLastRun(now);
}
