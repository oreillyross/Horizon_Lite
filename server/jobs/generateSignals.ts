import { db } from "../db";
import { sql } from "drizzle-orm";
import { signalEvents } from "@shared/db";
import { mapIndicator } from "../intel/indicatorScoring";

type SignalGenerationResult = {
  themeSpikes: number;
  toneCollapses: number;
  amplifications: number;
  hotspots: number;
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
};

type HotspotRow = {
  cc: string;
  events_last_hour: number | string;
  events_prev_5h: number | string | null;
  velocity: number | string | null;
  tone_now: number | string | null;
  delta: number | string | null;
};

function hourBucket(d = new Date()) {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x.toISOString();
}

export async function generateSignals(): Promise<SignalGenerationResult> {
  console.log("Signal generator running...");

  const bucket = hourBucket();

  let themeSpikes = 0;
  let toneCollapses = 0;
  let amplifications = 0;
  let hotspots = 0;

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

    await db
      .insert(signalEvents)
      .values({
        indicatorId: mapIndicator(`THEME_SPIKE ${theme}`),
        sourceUrl: ev.url,
        sourceHost: ev.domain,
        title: ev.title ?? `Theme spike: ${theme}`,
        score: velocity,
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

    await db
      .insert(signalEvents)
      .values({
        indicatorId: mapIndicator(`TONE_COLLAPSE ${theme}`),
        sourceUrl: ev.url,
        sourceHost: ev.domain,
        title: ev.title ?? `Tone collapse: ${theme}`,
        score: Math.abs(delta),
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
      source_url
    FROM gdelt_events
    WHERE event_time >= now() - interval '60 minutes'
      AND num_mentions IS NOT NULL
      AND num_sources IS NOT NULL
      AND num_mentions >= 100
    ORDER BY mps DESC NULLS LAST
    LIMIT 25;
  `);

  for (const row of amplificationResult.rows as AmplificationRow[]) {
    const mps = Number(row.mps ?? 0);

    if (!Number.isFinite(mps) || mps < 20) continue;
    if (!row.source_url) continue;

    const dedupeKey = `amplification|${row.global_event_id}|${bucket}`;

    await db
      .insert(signalEvents)
      .values({
        indicatorId: mapIndicator(`AMPLIFICATION ${row.global_event_id}`),
        sourceUrl: row.source_url,
        sourceHost: null,
        title: `Amplification anomaly (MPS=${mps.toFixed(1)})`,
        score: mps,
        dedupeKey,
      })
      .onConflictDoNothing();

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

    await db
      .insert(signalEvents)
      .values({
        indicatorId: mapIndicator(`HOTSPOT ${cc}`),
        sourceUrl: null,
        sourceHost: null,
        title: `Hotspot ${cc} (velocity=${velocity.toFixed(1)} toneΔ=${delta.toFixed(2)})`,
        score: velocity,
        dedupeKey,
      })
      .onConflictDoNothing();

    hotspots++;
  }

  console.log("Signal generator complete ✅");

  return {
    themeSpikes,
    toneCollapses,
    amplifications,
    hotspots,
  };
}