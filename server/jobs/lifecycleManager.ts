import { db } from "../db";
import { sql } from "drizzle-orm";
import { log } from "../index";

type LifecycleResult = {
  archiveWarm: { status: string; rowsArchived: number } | null;
  archiveCold: { status: string; rowsArchived: number } | null;
  maintenance: string | null;
  storage: { tier: string; sizeMb: number }[];
};

async function getStorageReport(): Promise<{ tier: string; sizeMb: number }[]> {
  const result = await db.execute(sql`SELECT * FROM check_storage_usage()`);
  return (result.rows as { tier: string; size_mb: string | number }[]).map(
    (r) => ({ tier: r.tier, sizeMb: Number(r.size_mb ?? 0) }),
  );
}

export async function runLifecycleManager(): Promise<LifecycleResult> {
  log("Starting data lifecycle maintenance...", "lifecycle");

  const result: LifecycleResult = {
    archiveWarm: null,
    archiveCold: null,
    maintenance: null,
    storage: [],
  };

  // HOT → WARM (events older than 30 days)
  try {
    const r = await db.execute(
      sql`SELECT status, rows_archived FROM archive_warm_data()`,
    );
    const row = r.rows[0] as
      | { status: string; rows_archived: number }
      | undefined;
    result.archiveWarm = {
      status: row?.status ?? "ok",
      rowsArchived: Number(row?.rows_archived ?? 0),
    };
    log(`HOT→WARM: ${result.archiveWarm.status}`, "lifecycle");
  } catch (err) {
    log(
      `HOT→WARM failed: ${err instanceof Error ? err.message : err}`,
      "lifecycle",
    );
  }

  // WARM → COLD (events older than 90 days)
  try {
    const r = await db.execute(
      sql`SELECT status, rows_archived FROM archive_cold_data()`,
    );
    const row = r.rows[0] as
      | { status: string; rows_archived: number }
      | undefined;
    result.archiveCold = {
      status: row?.status ?? "ok",
      rowsArchived: Number(row?.rows_archived ?? 0),
    };
    log(`WARM→COLD: ${result.archiveCold.status}`, "lifecycle");
  } catch (err) {
    log(
      `WARM→COLD failed: ${err instanceof Error ? err.message : err}`,
      "lifecycle",
    );
  }

  // VACUUM ANALYZE
  try {
    const r = await db.execute(sql`SELECT maintenance_tables() AS status`);
    const row = r.rows[0] as { status: string } | undefined;
    result.maintenance = row?.status ?? "ok";
    log(`Maintenance: ${result.maintenance}`, "lifecycle");
  } catch (err) {
    log(
      `Maintenance failed: ${err instanceof Error ? err.message : err}`,
      "lifecycle",
    );
  }

  // Storage report
  try {
    result.storage = await getStorageReport();
    for (const tier of result.storage) {
      log(
        `${tier.tier.padEnd(4)} tier: ${tier.sizeMb.toFixed(2)} MB`,
        "lifecycle",
      );
    }
  } catch (err) {
    log(
      `Storage report failed: ${err instanceof Error ? err.message : err}`,
      "lifecycle",
    );
  }

  log("Data lifecycle maintenance complete", "lifecycle");
  return result;
}
