import { db } from "../db";
import { sql } from "drizzle-orm";
import { signalEvents } from "@shared/db";
import { mapIndicator } from "../intel/indicatorScoring";

function hourBucket(d = new Date()) {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x.toISOString(); // stable for dedupe keys
}

export async function generateSignals() {
  console.log("Signal generator running...");

  const bucket = hourBucket();

  // ---------- 1) THEME SPIKES (last 60m vs prior 5h avg per hour)
  // We emit top 1-3 docs as evidence URLs.
  const themeSpikes = await db.execute(sql`
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
        AND published_at <  now() - interval '60 minutes'
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

  for (const row of themeSpikes.rows as any[]) {
    const theme = row.theme as string;
    const velocity = Number(row.velocity ?? 0);
    if (!Number.isFinite(velocity) || velocity < 3) continue;

    // pick a representative doc for evidence
    const evidence = await db.execute(sql`
      SELECT url, domain, title
      FROM gdelt_documents
      WHERE published_at >= now() - interval '60 minutes'
        AND ${theme} = ANY(themes)
      ORDER BY published_at DESC
      LIMIT 1;
    `);

    const ev = evidence.rows[0] as any | undefined;
    if (!ev?.url) continue;

    const dedupeKey = `theme_spike|${theme}|${bucket}`;

    await db
      .insert(signalEvents)
      .values({
        indicatorId: mapIndicator(`THEME_SPIKE ${theme}`),
        sourceUrl: ev.url,
        sourceHost: ev.domain ?? null,
        title: ev.title ?? `Theme spike: ${theme}`,
        score: velocity,
        // @ts-expect-error add this column if you implement dedupeKey
        dedupeKey,
      })
      // if you add a unique index on dedupeKey:
      // @ts-expect-error
      .onConflictDoNothing?.();
  }

  // ---------- 2) TONE COLLAPSE (themes with sharply negative tone)
  const toneCollapse = await db.execute(sql`
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
        AND published_at <  now() - interval '60 minutes'
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

  for (const row of toneCollapse.rows as any[]) {
    const theme = row.theme as string;
    const toneNow = Number(row.tone_now);
    const delta = Number(row.delta);

    // “shock” rule-of-thumb
    if (!(toneNow <= -2.0 && delta <= -1.0)) continue;

    const evidence = await db.execute(sql`
      SELECT url, domain, title
      FROM gdelt_documents
      WHERE published_at >= now() - interval '60 minutes'
        AND ${theme} = ANY(themes)
      ORDER BY tone ASC NULLS LAST, published_at DESC
      LIMIT 1;
    `);

    const ev = evidence.rows[0] as any | undefined;
    if (!ev?.url) continue;

    const dedupeKey = `tone_collapse|${theme}|${bucket}`;

    await db
      .insert(signalEvents)
      .values({
        indicatorId: mapIndicator(`TONE_COLLAPSE ${theme}`),
        sourceUrl: ev.url,
        sourceHost: ev.domain ?? null,
        title: ev.title ?? `Tone collapse: ${theme}`,
        score: Math.abs(delta), // magnitude
        // @ts-expect-error
        dedupeKey,
      })
      // @ts-expect-error
      .onConflictDoNothing?.();
  }

  // ---------- 3) AMPLIFICATION ANOMALIES (export ratios)
  const amplification = await db.execute(sql`
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

  for (const row of amplification.rows as any[]) {
    const mps = Number(row.mps ?? 0);
    if (!Number.isFinite(mps) || mps < 20) continue;

    const url = (row.source_url as string | null) ?? null;
    if (!url) continue;

    const dedupeKey = `amplification|${row.global_event_id}|${bucket}`;

    await db
      .insert(signalEvents)
      .values({
        indicatorId: mapIndicator(`AMPLIFICATION ${row.global_event_id}`),
        sourceUrl: url,
        sourceHost: null,
        title: `Amplification anomaly (MPS=${mps.toFixed(1)})`,
        score: mps,
        // @ts-expect-error
        dedupeKey,
      })
      // @ts-expect-error
      .onConflictDoNothing?.();
  }

  // ---------- 4) HOTSPOTS (geo acceleration + tone delta)
  const hotspots = await db.execute(sql`
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
        AND event_time <  now() - interval '60 minutes'
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

  for (const row of hotspots.rows as any[]) {
    const cc = row.cc as string;
    const velocity = Number(row.velocity ?? 0);
    const delta = Number(row.delta ?? 0);

    // “escalation-ish”
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
        // @ts-expect-error
        dedupeKey,
      })
      // @ts-expect-error
      .onConflictDoNothing?.();
  }

  console.log("Signal generator complete ✅");
}