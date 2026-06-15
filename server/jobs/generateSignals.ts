import { db } from "../db";
import { sql, eq, and, lt } from "drizzle-orm";
import { signalEvents, indicators, acledEvents } from "@shared/db";
import { mapIndicator } from "../intel/indicatorScoring";
import { isAcledEnabled } from "./acledIngest";

type SignalGenerationResult = {
  themeSpikes: number;
  toneCollapses: number;
  amplifications: number;
  hotspots: number;
  acledConflicts: number;
};

type ThemeSpikeRow = {
  theme: string;
  last_hour: number | string;
  prev_5h: number | string;
  velocity: number | string | null;
};

type EvidenceRow = {
  url: string | null;
  domain: string | null;
  title: string | null;
};

type ToneCollapseRow = {
  theme: string;
  n: number | string;
  tone_now: number | string | null;
  tone_prev: number | string | null;
  delta: number | string | null;
};

type AmplificationRow = {
  global_event_id: string;
  num_mentions: number | string | null;
  num_sources: number | string | null;
  num_articles: number | string | null;
  mps: number | string | null;
  source_url: string | null;
  event_code: string | null;
  goldstein: number | string | null;
  actor1_name: string | null;
  actor2_name: string | null;
  event_time: Date | string | null;
};

type HotspotRow = {
  cc: string;
  events_last_hour: number | string;
  events_prev_5h: number | string | null;
  velocity: number | string | null;
  tone_now: number | string | null;
  delta: number | string | null;
};

// CAMEO root-code weights: higher conflict/intensity = higher weight
const CAMEO_WEIGHTS: Record<string, number> = {
  "01": 0.10, "02": 0.15, "03": 0.20, "04": 0.25, "05": 0.30,
  "06": 0.35, "07": 0.40, "08": 0.30, "09": 0.35, "10": 0.50,
  "11": 0.45, "12": 0.55, "13": 0.70, "14": 0.60, "15": 0.65,
  "16": 0.60, "17": 0.80, "18": 0.90, "19": 0.95, "20": 1.00,
};

// Combine GDELT event fields into a normalised [0,1] confidence score.
// eventCode category weight (0–1) + |goldstein| / 10 (0–1) + log(1+mentions) / log(10001) (0–1), averaged.
export function computeConfidenceScore(
  eventCode: string | null,
  goldstein: number | null,
  numMentions: number | null,
): number {
  const root = eventCode ? eventCode.slice(0, 2) : null;
  const catWeight = root ? (CAMEO_WEIGHTS[root] ?? 0.30) : 0.30;
  const goldNorm = goldstein !== null ? Math.min(1, Math.abs(goldstein) / 10) : 0.5;
  const mentionNorm = numMentions !== null
    ? Math.min(1, Math.log(1 + numMentions) / Math.log(10001))
    : 0;
  return (catWeight + goldNorm + mentionNorm) / 3;
}

function toDateString(v: Date | string | null): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v as string);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

async function findCanonicalForAmplification(
  actor1: string | null,
  actor2: string | null,
  rootCode: string,
  eventDate: string,
  excludeGlobalEventId: string,
): Promise<string | null> {
  const nearDups = await db.execute(sql`
    SELECT global_event_id
    FROM gdelt_events
    WHERE LEFT(event_code, 2) = ${rootCode}
      AND DATE(event_time AT TIME ZONE 'UTC') = ${eventDate}::date
      AND global_event_id != ${excludeGlobalEventId}
      AND (actor1_name IS NOT DISTINCT FROM ${actor1})
      AND (actor2_name IS NOT DISTINCT FROM ${actor2})
    LIMIT 10
  `);

  for (const dup of nearDups.rows as { global_event_id: string }[]) {
    const prefix = `amplification|${dup.global_event_id}|`;
    const existing = await db.execute(sql`
      SELECT id FROM signal_events
      WHERE dedupe_key LIKE ${prefix + "%"}
        AND canonical_id IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    `);
    const row = existing.rows[0] as { id: string } | undefined;
    if (row?.id) return row.id;
  }
  return null;
}

function hourBucket(d = new Date()) {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x.toISOString();
}

const timeWeightDays: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

function expiresAtFromTimeWeight(timeWeight: string, base = new Date()): Date {
  const days = timeWeightDays[timeWeight] ?? 7;
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

const indicatorTimeWeightCache = new Map<string, string>();

// Cache for auto-created indicator UUIDs so we don't hit the DB on every signal
const autoIndicatorIdCache = new Map<string, string>();

// Create or retrieve an auto-generated indicator by name, returning its UUID.
// This is required for ACLED signals since their indicators are not pre-seeded.
async function upsertAutoIndicator(name: string): Promise<string> {
  const cached = autoIndicatorIdCache.get(name);
  if (cached) return cached;

  const existing = await db
    .select({ id: indicators.id })
    .from(indicators)
    .where(eq(indicators.name, name))
    .limit(1);

  if (existing[0]) {
    autoIndicatorIdCache.set(name, existing[0].id);
    return existing[0].id;
  }

  const [created] = await db
    .insert(indicators)
    .values({
      name,
      category: "infra",
      strength: 5,
      timeWeight: "week",
      decayBehaviour: "linear",
    })
    .returning({ id: indicators.id });

  autoIndicatorIdCache.set(name, created.id);
  return created.id;
}

type AcledConflictRow = {
  country: string;
  event_count: number | string;
  total_fatalities: number | string;
  high_severity_count: number | string;
};

async function resolveTimeWeight(indicatorId: string): Promise<string> {
  if (indicatorTimeWeightCache.has(indicatorId)) {
    return indicatorTimeWeightCache.get(indicatorId)!;
  }
  const [row] = await db
    .select({ timeWeight: indicators.timeWeight })
    .from(indicators)
    .where(eq(indicators.id, indicatorId));
  const tw = row?.timeWeight ?? "week";
  indicatorTimeWeightCache.set(indicatorId, tw);
  return tw;
}

async function resurfaceExpiredSignals(indicatorId: string, confidenceScore: number, newExpiresAt: Date): Promise<void> {
  await db
    .update(signalEvents)
    .set({ status: "pending", expiresAt: newExpiresAt })
    .where(
      and(
        eq(signalEvents.indicatorId, indicatorId),
        eq(signalEvents.status, "expired"),
        lt(signalEvents.confidenceScore, confidenceScore),
      ),
    );
}

async function generateAcledSignals(bucket: string): Promise<number> {
  if (!(await isAcledEnabled())) return 0;

  // Query ACLED events from the last 48h grouped by country
  const result = await db.execute(sql`
    SELECT
      country,
      COUNT(*)::int AS event_count,
      COALESCE(SUM(fatalities), 0)::int AS total_fatalities,
      COUNT(*) FILTER (
        WHERE event_type IN (
          'Battles',
          'Explosions/Remote violence',
          'Violence against civilians'
        )
      )::int AS high_severity_count
    FROM acled_events
    WHERE event_date >= now() - interval '48 hours'
      AND country IS NOT NULL
    GROUP BY country
    HAVING COUNT(*) FILTER (
      WHERE event_type IN (
        'Battles',
        'Explosions/Remote violence',
        'Violence against civilians'
      )
    ) >= 2
    ORDER BY high_severity_count DESC, total_fatalities DESC
    LIMIT 25
  `);

  let count = 0;
  for (const row of result.rows as AcledConflictRow[]) {
    const highSeverity = Number(row.high_severity_count);
    const fatalities = Number(row.total_fatalities);
    const eventCount = Number(row.event_count);

    // Confidence: severity density + fatality weight + event count volume, each normalised [0,1]
    const severityNorm = Math.min(1, highSeverity / 10);
    const fatalityNorm = Math.min(1, Math.log(1 + fatalities) / Math.log(1001));
    const countNorm = Math.min(1, Math.log(1 + eventCount) / Math.log(101));
    const confidenceScore = (severityNorm + fatalityNorm + countNorm) / 3;

    const dedupeKey = `acled_conflict|${row.country}|${bucket}`;
    const indId = await upsertAutoIndicator(`ACLED CONFLICT ${row.country}`);
    const tw = await resolveTimeWeight(indId);

    await db
      .insert(signalEvents)
      .values({
        indicatorId: indId,
        sourceUrl: null,
        sourceHost: null,
        title: `ACLED conflict surge: ${row.country} (${highSeverity} high-severity events, ${fatalities} fatalities)`,
        score: highSeverity,
        confidenceScore,
        expiresAt: expiresAtFromTimeWeight(tw),
        dedupeKey,
      })
      .onConflictDoNothing();

    await resurfaceExpiredSignals(indId, confidenceScore, expiresAtFromTimeWeight(tw));

    count++;
  }

  return count;
}

export async function generateSignals(): Promise<SignalGenerationResult> {
  console.log("Signal generator running...");
  indicatorTimeWeightCache.clear();
  autoIndicatorIdCache.clear();

  const bucket = hourBucket();

  let themeSpikes = 0;
  let toneCollapses = 0;
  let amplifications = 0;
  let hotspots = 0;
  let acledConflicts = 0;

  const themeSpikeResult = await db.execute(sql`
    WITH curr AS (
      SELECT unnest(themes) AS theme, COUNT(*)::int AS c
      FROM gdelt_documents
      WHERE published_at >= now() - interval '60 minutes'
      GROUP BY 1
    ),
    prev AS (
      SELECT unnest(themes) AS theme, COUNT(*)::int AS p
      FROM gdelt_documents
      WHERE published_at >= now() - interval '6 hours'
        AND published_at < now() - interval '60 minutes'
      GROUP BY 1
    )
    SELECT
      c.theme,
      c.c AS last_hour,
      COALESCE(p.p, 0) AS prev_5h,
      (c.c::float / NULLIF(p.p::float / 5.0, 0)) AS velocity
    FROM curr c
    LEFT JOIN prev p ON p.theme = c.theme
    WHERE c.c >= 20
    ORDER BY velocity DESC NULLS LAST, last_hour DESC
    LIMIT 30;
  `);

  for (const row of themeSpikeResult.rows as ThemeSpikeRow[]) {
    const theme = row.theme;
    const velocity = Number(row.velocity ?? 0);

    if (!Number.isFinite(velocity) || velocity < 3) continue;

    const evidence = await db.execute(sql`
      SELECT url, domain, title
      FROM gdelt_documents
      WHERE published_at >= now() - interval '60 minutes'
        AND ${theme} = ANY(themes)
      ORDER BY published_at DESC
      LIMIT 1;
    `);

    const ev = evidence.rows[0] as EvidenceRow | undefined;
    if (!ev?.url) continue;

    const dedupeKey = `theme_spike|${theme}|${bucket}`;
    const indId = mapIndicator(`THEME_SPIKE ${theme}`);
    const tw = await resolveTimeWeight(indId);

    await db
      .insert(signalEvents)
      .values({
        indicatorId: indId,
        sourceUrl: ev.url,
        sourceHost: ev.domain,
        title: ev.title ?? `Theme spike: ${theme}`,
        score: velocity,
        expiresAt: expiresAtFromTimeWeight(tw),
        dedupeKey,
      })
      .onConflictDoNothing();

    themeSpikes++;
  }

  const toneCollapseResult = await db.execute(sql`
    WITH curr AS (
      SELECT unnest(themes) AS theme, AVG(tone) AS tone, COUNT(*)::int AS n
      FROM gdelt_documents
      WHERE published_at >= now() - interval '60 minutes'
        AND tone IS NOT NULL
      GROUP BY 1
    ),
    prev AS (
      SELECT unnest(themes) AS theme, AVG(tone) AS tone
      FROM gdelt_documents
      WHERE published_at >= now() - interval '6 hours'
        AND published_at < now() - interval '60 minutes'
        AND tone IS NOT NULL
      GROUP BY 1
    )
    SELECT
      c.theme,
      c.n,
      c.tone AS tone_now,
      p.tone AS tone_prev,
      (c.tone - p.tone) AS delta
    FROM curr c
    JOIN prev p ON p.theme = c.theme
    WHERE c.n >= 20
    ORDER BY delta ASC, tone_now ASC
    LIMIT 30;
  `);

  for (const row of toneCollapseResult.rows as ToneCollapseRow[]) {
    const theme = row.theme;
    const toneNow = Number(row.tone_now ?? 0);
    const delta = Number(row.delta ?? 0);

    if (!(toneNow <= -2.0 && delta <= -1.0)) continue;

    const evidence = await db.execute(sql`
      SELECT url, domain, title
      FROM gdelt_documents
      WHERE published_at >= now() - interval '60 minutes'
        AND ${theme} = ANY(themes)
      ORDER BY tone ASC NULLS LAST, published_at DESC
      LIMIT 1;
    `);

    const ev = evidence.rows[0] as EvidenceRow | undefined;
    if (!ev?.url) continue;

    const dedupeKey = `tone_collapse|${theme}|${bucket}`;
    const indId = mapIndicator(`TONE_COLLAPSE ${theme}`);
    const tw = await resolveTimeWeight(indId);

    await db
      .insert(signalEvents)
      .values({
        indicatorId: indId,
        sourceUrl: ev.url,
        sourceHost: ev.domain,
        title: ev.title ?? `Tone collapse: ${theme}`,
        score: Math.abs(delta),
        expiresAt: expiresAtFromTimeWeight(tw),
        dedupeKey,
      })
      .onConflictDoNothing();

    toneCollapses++;
  }

  const amplificationResult = await db.execute(sql`
    SELECT
      global_event_id,
      num_mentions,
      num_sources,
      num_articles,
      (num_mentions::float / NULLIF(num_sources,0)) AS mps,
      source_url,
      event_code,
      goldstein,
      actor1_name,
      actor2_name,
      event_time
    FROM gdelt_events
    WHERE event_time >= now() - interval '60 minutes'
      AND num_mentions IS NOT NULL
      AND num_sources IS NOT NULL
      AND num_mentions >= 100
    ORDER BY mps DESC NULLS LAST
    LIMIT 25;
  `);

  // Local map: nearKey → canonical signal event id, to avoid repeated DB lookups within batch
  const nearDupeCache = new Map<string, string>();

  for (const row of amplificationResult.rows as AmplificationRow[]) {
    const mps = Number(row.mps ?? 0);

    if (!Number.isFinite(mps) || mps < 20) continue;
    if (!row.source_url) continue;

    const dedupeKey = `amplification|${row.global_event_id}|${bucket}`;
    const confidenceScore = computeConfidenceScore(
      row.event_code,
      row.goldstein !== null ? Number(row.goldstein) : null,
      row.num_mentions !== null ? Number(row.num_mentions) : null,
    );

    const rootCode = row.event_code ? row.event_code.slice(0, 2) : null;
    const eventDate = toDateString(row.event_time ?? null);
    const actor1 = row.actor1_name ?? null;
    const actor2 = row.actor2_name ?? null;
    const nearKey = rootCode && eventDate
      ? `${rootCode}|${actor1 ?? ""}|${actor2 ?? ""}|${eventDate}`
      : null;

    let canonicalId: string | null = null;
    if (nearKey) {
      if (nearDupeCache.has(nearKey)) {
        canonicalId = nearDupeCache.get(nearKey)!;
      } else {
        canonicalId = await findCanonicalForAmplification(
          actor1, actor2, rootCode!, eventDate!, row.global_event_id,
        );
      }
    }

    const ampIndId = mapIndicator(`AMPLIFICATION ${row.global_event_id}`);
    const ampTw = await resolveTimeWeight(ampIndId);
    const ampExpiresAt = expiresAtFromTimeWeight(ampTw);

    const inserted = await db
      .insert(signalEvents)
      .values({
        indicatorId: ampIndId,
        sourceUrl: row.source_url,
        sourceHost: null,
        title: `Amplification anomaly (MPS=${mps.toFixed(1)})`,
        score: mps,
        confidenceScore,
        canonicalId,
        expiresAt: ampExpiresAt,
        dedupeKey,
      })
      .returning({ id: signalEvents.id })
      .onConflictDoNothing();

    // Record first canonical insert so subsequent near-dups in this batch reference it
    if (inserted.length > 0 && canonicalId === null && nearKey) {
      nearDupeCache.set(nearKey, inserted[0].id);
    }

    // Re-surface any expired signals for the same indicator if this event has higher confidence
    await resurfaceExpiredSignals(ampIndId, confidenceScore, ampExpiresAt);

    amplifications++;
  }

  const hotspotResult = await db.execute(sql`
    WITH curr AS (
      SELECT
        action_geo_country_code AS cc,
        COUNT(*)::int AS events,
        AVG(avg_tone) AS tone
      FROM gdelt_events
      WHERE event_time >= now() - interval '60 minutes'
        AND action_geo_country_code IS NOT NULL
      GROUP BY 1
    ),
    prev AS (
      SELECT
        action_geo_country_code AS cc,
        COUNT(*)::int AS events,
        AVG(avg_tone) AS tone
      FROM gdelt_events
      WHERE event_time >= now() - interval '6 hours'
        AND event_time < now() - interval '60 minutes'
        AND action_geo_country_code IS NOT NULL
      GROUP BY 1
    )
    SELECT
      c.cc,
      c.events AS events_last_hour,
      p.events AS events_prev_5h,
      (c.events::float / NULLIF(p.events::float / 5.0, 0)) AS velocity,
      c.tone AS tone_now,
      (c.tone - p.tone) AS delta
    FROM curr c
    LEFT JOIN prev p ON p.cc = c.cc
    WHERE c.events >= 20
    ORDER BY velocity DESC NULLS LAST, delta ASC NULLS LAST
    LIMIT 25;
  `);

  for (const row of hotspotResult.rows as HotspotRow[]) {
    const cc = row.cc;
    const velocity = Number(row.velocity ?? 0);
    const delta = Number(row.delta ?? 0);

    if (!(velocity >= 3 && delta <= -1)) continue;

    const dedupeKey = `hotspot|${cc}|${bucket}`;
    const indId = mapIndicator(`HOTSPOT ${cc}`);
    const tw = await resolveTimeWeight(indId);

    await db
      .insert(signalEvents)
      .values({
        indicatorId: indId,
        sourceUrl: null,
        sourceHost: null,
        title: `Hotspot ${cc} (velocity=${velocity.toFixed(1)} toneΔ=${delta.toFixed(2)})`,
        score: velocity,
        expiresAt: expiresAtFromTimeWeight(tw),
        dedupeKey,
      })
      .onConflictDoNothing();

    hotspots++;
  }

  acledConflicts = await generateAcledSignals(bucket);

  console.log("Signal generator complete ✅");

  return {
    themeSpikes,
    toneCollapses,
    amplifications,
    hotspots,
    acledConflicts,
  };
}