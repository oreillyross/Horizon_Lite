import { db } from "../db";
import { sql } from "drizzle-orm";
import { withSpan } from "../otel/tracer";
import { logger } from "../logger";

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
  return withSpan("lifecycle.run", {}, async () => {
    logger.info({ module: "lifecycle" }, "Starting data lifecycle maintenance...");

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
      logger.info({ module: "lifecycle", ...result.archiveWarm }, "HOT→WARM archival complete");
    } catch (err) {
      logger.error({ module: "lifecycle", err: err instanceof Error ? err.message : err }, "HOT→WARM failed");
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
      logger.info({ module: "lifecycle", ...result.archiveCold }, "WARM→COLD archival complete");
    } catch (err) {
      logger.error({ module: "lifecycle", err: err instanceof Error ? err.message : err }, "WARM→COLD failed");
    }

    // VACUUM ANALYZE
    try {
      const r = await db.execute(sql`SELECT maintenance_tables() AS status`);
      const row = r.rows[0] as { status: string } | undefined;
      result.maintenance = row?.status ?? "ok";
      logger.info({ module: "lifecycle", status: result.maintenance }, "Maintenance complete");
    } catch (err) {
      logger.error({ module: "lifecycle", err: err instanceof Error ? err.message : err }, "Maintenance failed");
    }

    // Storage report
    try {
      result.storage = await getStorageReport();
      logger.info({ module: "lifecycle", storage: result.storage }, "Storage report complete");
    } catch (err) {
      logger.error({ module: "lifecycle", err: err instanceof Error ? err.message : err }, "Storage report failed");
    }

    logger.info({ module: "lifecycle" }, "Data lifecycle maintenance complete");
    return result;
  });
}
