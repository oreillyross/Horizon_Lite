/*
 * ADR — Second ingest source: ACLED (Armed Conflict Location & Event Data)
 *
 * ACLED was chosen over the GDELT GKG v2 document stream because GDELT's GKG feed is already
 * consumed by the existing gdeltIngest adapter, making it a redundant rather than additive second
 * source. ACLED fills a data-quality gap: where GDELT derives event signals from raw media volume
 * and tone, ACLED provides researcher-validated, ground-truth conflict events (battles, protests,
 * explosions, political violence) with precise geo-coordinates, validated actor names, and fatality
 * counts. This orthogonality means GDELT catches early media-volume spikes while ACLED confirms
 * that real-world conflict events are occurring — exactly the two-step pattern Horizon uses to
 * separate weak signals from confirmed developments. The trade-off is a required API key pair
 * (ACLED_API_KEY + ACLED_EMAIL env vars, free for non-commercial research use at acleddata.com)
 * and a paginated batch API rather than a real-time stream, which fits Horizon's twice-daily
 * ingest schedule without issue.
 */

import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import { acledEvents, appConfig } from "@shared/db";
import { withSpan } from "../otel/tracer";
import { logger } from "../logger";

const ACLED_API_BASE = "https://api.acleddata.com/acled/read.php";
const PAGE_LIMIT = 500;

// Conflict event type severity weights — used by generateSignals for confidence scoring
export const ACLED_EVENT_SEVERITY: Record<string, number> = {
  "Battles": 0.90,
  "Explosions/Remote violence": 0.85,
  "Violence against civilians": 0.75,
  "Riots": 0.50,
  "Protests": 0.35,
  "Strategic developments": 0.30,
};

type AcledApiEvent = {
  event_id_cnty: string;
  event_date: string;
  year: string | number;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2: string;
  country: string;
  iso: string | number;
  region: string;
  admin1: string;
  location: string;
  latitude: string | number;
  longitude: string | number;
  fatalities: string | number;
  notes: string;
  source: string;
  source_scale: string;
};

type AcledApiResponse = {
  status: number;
  data: AcledApiEvent[];
  count: number;
  error?: string;
};

function toFloat(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toInt(v: string | number | undefined | null): number | null {
  const f = toFloat(v);
  return f !== null ? Math.round(f) : null;
}

function parseAcledDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

async function fetchAcledPage(
  apiKey: string,
  email: string,
  page: number,
  startDate: string,
  endDate: string,
): Promise<AcledApiResponse> {
  const params = new URLSearchParams({
    key: apiKey,
    email,
    format: "json",
    limit: String(PAGE_LIMIT),
    page: String(page),
    event_date: `${startDate}|${endDate}`,
    event_date_where: "BETWEEN",
  });

  const res = await fetch(`${ACLED_API_BASE}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`ACLED API error ${res.status}: ${res.statusText}`);
  }

  const body = (await res.json()) as AcledApiResponse;
  if (body.status !== 200) {
    throw new Error(
      `ACLED API returned status ${body.status}: ${body.error ?? "unknown error"}`,
    );
  }
  return body;
}

export async function isAcledEnabled(): Promise<boolean> {
  const rows = await db
    .select({ value: appConfig.value })
    .from(appConfig)
    .where(eq(appConfig.key, "acled_enabled"))
    .limit(1);
  return rows[0]?.value === "true";
}

export async function ingestAcled() {
  return withSpan("acled.ingest", {}, async (span) => {
    logger.info({ module: "acled-ingest" }, "Running ACLED ingestion...");

    const apiKey = process.env.ACLED_API_KEY;
    const email = process.env.ACLED_EMAIL;

    if (!apiKey || !email) {
      throw new Error(
        "ACLED_API_KEY and ACLED_EMAIL environment variables are required",
      );
    }

    // Fetch the last 7 days to ensure full coverage in a twice-daily schedule
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const startStr = fmt(startDate);
    const endStr = fmt(endDate);

    logger.info({ module: "acled-ingest", startDate: startStr, endDate: endStr }, "Fetching ACLED events");

    let page = 1;
    let totalUpserted = 0;
    let totalFetched = 0;

    while (true) {
      const response = await withSpan(
        "acled.ingest.page",
        { "acled.page": page },
        async (pageSpan) => {
          const result = await fetchAcledPage(apiKey, email, page, startStr, endStr);
          pageSpan.setAttribute("rows.count", result.data?.length ?? 0);
          return result;
        },
      );
      const events = response.data ?? [];

      if (events.length === 0) break;

      totalFetched += events.length;

      for (const evt of events) {
        if (!evt.event_id_cnty) continue;

        await db
          .insert(acledEvents)
          .values({
            id: evt.event_id_cnty,
            eventDate: parseAcledDate(evt.event_date),
            year: toInt(evt.year),
            eventType: evt.event_type || null,
            subEventType: evt.sub_event_type || null,
            actor1: evt.actor1 || null,
            actor2: evt.actor2 || null,
            country: evt.country || null,
            isoCode: toInt(evt.iso),
            region: evt.region || null,
            admin1: evt.admin1 || null,
            location: evt.location || null,
            latitude: toFloat(evt.latitude),
            longitude: toFloat(evt.longitude),
            fatalities: toInt(evt.fatalities),
            notes: evt.notes || null,
            source: evt.source || null,
            sourceScale: evt.source_scale || null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: acledEvents.id,
            set: {
              // Update fatalities and notes as these can be revised by ACLED researchers
              fatalities: toInt(evt.fatalities),
              notes: evt.notes || null,
              updatedAt: new Date(),
            },
          });

        totalUpserted++;
      }

      logger.info(
        { module: "acled-ingest", page, fetched: events.length, totalUpserted },
        "ACLED page ingested",
      );

      // Fewer results than page limit means this is the last page
      if (events.length < PAGE_LIMIT) break;
      page++;
    }

    // Mark pending signals past their expiresAt as expired (same cleanup as gdeltIngest)
    const expiredResult = await db.execute(sql`
      UPDATE signal_events
      SET status = 'expired'
      WHERE status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
    `);
    const expiredCount = (expiredResult as any).rowCount ?? 0;
    logger.info({ module: "acled-ingest", expiredCount }, "ACLED signal expiry cleanup complete");

    span.setAttribute("rows.fetched", totalFetched);
    span.setAttribute("rows.upserted", totalUpserted);
    logger.info(
      { module: "acled-ingest", fetched: totalFetched, upserted: totalUpserted },
      "ACLED ingestion complete",
    );

    return {
      fetched: totalFetched,
      upserted: totalUpserted,
    };
  });
}
