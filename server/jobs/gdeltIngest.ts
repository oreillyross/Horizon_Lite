import fetch from "node-fetch";
import AdmZip from "adm-zip";
import { createHash } from "node:crypto";
import { db } from "../db";
import { gdeltEvents, gdeltEventMentions, gdeltDocuments } from "@shared/db";
import { sql } from "drizzle-orm";

const LASTUPDATE = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

function toInt(x: string | undefined): number | null {
  if (!x) return null;
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  // only accept true ints
  if (!Number.isInteger(n)) return null;
  return n;
}

function toFloat(x: string | undefined): number | null {
  if (!x) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function pickUrl(lastupdate: string, suffix: string): string | null {
  const line = lastupdate
    .trim()
    .split("\n")
    .find((l) => l.includes(suffix));
  if (!line) return null;
  const parts = line.trim().split(/\s+/);
  return (parts[2] ?? "").trim() || null;
}

async function fetchZipText(zipUrl: string): Promise<string> {
  const res = await fetch(zipUrl);
  if (!res.ok) throw new Error(`fetch failed ${res.status} for ${zipUrl}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buf);
  const entry =
    zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith(".csv")) ??
    zip.getEntries()[0];
  if (!entry) throw new Error(`zip had no entries: ${zipUrl}`);

  return entry.getData().toString("utf8");
}

function sha1(s: string) {
  return createHash("sha1").update(s).digest("hex");
}

function parseYmdToUtc(y: string | undefined): Date | null {
  if (!y) return null;
  // yyyymmdd or yyyymmddhhmmss
  if (/^\d{8}$/.test(y)) {
    const yyyy = Number(y.slice(0, 4));
    const mm = Number(y.slice(4, 6));
    const dd = Number(y.slice(6, 8));
    return new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0));
  }
  if (/^\d{14}$/.test(y)) {
    const yyyy = Number(y.slice(0, 4));
    const mm = Number(y.slice(4, 6));
    const dd = Number(y.slice(6, 8));
    const hh = Number(y.slice(8, 10));
    const mi = Number(y.slice(10, 12));
    const ss = Number(y.slice(12, 14));
    return new Date(Date.UTC(yyyy, mm - 1, dd, hh, mi, ss));
  }
  return null;
}

// ---- EXPORT parsing (Events 2.1)
// Indices per GDELT 2.1 Events schema (commonly used):
// 0 GlobalEventID
// 1 SQLDATE (yyyymmdd)
// 24 EventCode
// 27 QuadClass
// 28 GoldsteinScale
// 29 NumMentions
// 30 NumSources
// 31 NumArticles
// 32 AvgTone
// 52 ActionGeo_Fullname
// 53 ActionGeo_CountryCode
// 55 ActionGeo_Lat
// 56 ActionGeo_Long
// 57 SOURCEURL
function parseExportRow(cols: string[]) {
  const globalEventId = cols[0]?.trim();
  if (!globalEventId) return null;

  const sqlDate = cols[1]?.trim();
  const eventTime = parseYmdToUtc(sqlDate);

  const actor1Name = cols[6]?.trim() || null; // Actor1Name is usually col6
  const actor2Name = cols[16]?.trim() || null; // Actor2Name usually col16

  const eventCode = cols[26]?.trim() || null;
  const quadClass = cols[27] ? toInt(cols[27]) : null;

  const goldstein = cols[28] ? toFloat(cols[28]) : null;
  const numMentions = cols[29] ? toInt(cols[29]) : null;
  const numSources = cols[30] ? toInt(cols[30]) : null;
  const numArticles = cols[31] ? toInt(cols[31]) : null;
  const avgTone = cols[32] ? toFloat(cols[32]) : null;

  const actionGeoFullname = cols[52]?.trim() || null;
  const actionGeoCountryCode = cols[53]?.trim() || null;
  const actionGeoLat = cols[55] ? Number(cols[55]) : null;
  const actionGeoLon = cols[56] ? Number(cols[56]) : null;

  const sourceUrl = cols[57]?.trim() || null;

  return {
    globalEventId,
    eventTime,
    actor1Name,
    actor2Name,
    eventCode,
    quadClass,
    goldstein,
    avgTone,
    numMentions,
    numSources,
    numArticles,
    actionGeoFullname,
    actionGeoCountryCode,
    actionGeoLat,
    actionGeoLon,
    sourceUrl,
  };
}

// ---- MENTIONS parsing
// 0 GlobalEventID
// 2 MentionTimeDate (yyyymmddhhmmss)
// 4 MentionSourceName (domain)
// 5 MentionIdentifier (url)
// 11 Confidence
// 13 MentionDocTone
function parseMentionsRow(cols: string[]) {
  const globalEventId = cols[0]?.trim();
  const mentionTime = parseYmdToUtc(cols[2]?.trim());
  const domain = cols[4]?.trim() || null;
  const url = cols[5]?.trim();
  if (!globalEventId || !url) return null;

  const confidence = cols[11] ? Number(cols[11]) : null;
  const docTone = cols[13] ? Number(cols[13]) : null;

  return {
    id: `${globalEventId}|${sha1(url)}`,
    globalEventId,
    mentionTime,
    domain,
    url,
    confidence,
    docTone,
  };
}

// ---- GKG parsing (GKG 2.1-ish) using canonical column order.
// We'll extract only: url/domain/themes/orgs/tone/title/publishedAt/image + raw extras.
function parseTone(v2Tone: string | undefined): number | null {
  if (!v2Tone) return null;
  // typically "tone,positive,negative,polarity,activityDensity,..."
  const first = v2Tone.split(",")[0]?.trim();
  if (!first) return null;
  const n = Number(first);
  return Number.isFinite(n) ? n : null;
}

function splitThemeList(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}

// V2Organizations format varies; this keeps stable “name-ish” tokens.
function splitEntityList(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      // strip after comma/pipe/# if present
      for (const sep of [",", "#", "|"]) {
        const i = x.indexOf(sep);
        if (i > 0) return x.slice(0, i).trim();
      }
      return x;
    })
    .filter(Boolean);
}

function extractTag(extras: string | undefined, tag: string): string | null {
  if (!extras) return null;
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const m = extras.match(re);
  return m?.[1]?.trim() || null;
}

// Canonical-ish indices (GKG 2.1):
// 3 SourceCommonName (domain)
// 4 DocumentIdentifier (url)
// 8 V2Themes
// 14 V2Organizations
// 15 V2Tone
// 18 SharingImage
// 26 Extras (XML incl PAGE_TITLE, PAGE_PRECISEPUBTIMESTAMP)
function parseGkgRow(cols: string[]) {
  const domain = cols[3]?.trim() || null;
  const url = cols[4]?.trim();
  if (!url) return null;

  const themes = splitThemeList(cols[8] || cols[7]); // prefer V2Themes, fallback Themes
  const organizations = splitEntityList(cols[14] || cols[13]); // prefer V2Organizations
  const tone = parseTone(cols[15]);

  const imageUrl = cols[18]?.trim() || null;
  const extras = cols[26] || null;

  const title = extractTag(extras ?? undefined, "PAGE_TITLE");
  const pub = extractTag(extras ?? undefined, "PAGE_PRECISEPUBTIMESTAMP");
  const publishedAt = pub ? parseYmdToUtc(pub) : null;

  return {
    url,
    domain,
    publishedAt,
    title,
    imageUrl,
    tone,
    themes,
    organizations,
    rawExtrasXml: extras,
  };
}

let exportUpserted = 0;
let mentionsInserted = 0;
let mentionsSkippedMissingEvent = 0;
let gkgUpserted = 0;
let gkgSkipped = 0;

export async function ingestGdelt() {
  console.log("Running GDELT ingestion...");

  const lastRes = await fetch(LASTUPDATE);
  if (!lastRes.ok)
    throw new Error(`lastupdate fetch failed: ${lastRes.status}`);
  const lastupdate = await lastRes.text();

  const exportUrl = pickUrl(lastupdate, ".export.CSV.zip");
  const mentionsUrl = pickUrl(lastupdate, ".mentions.CSV.zip");
  const gkgUrl = pickUrl(lastupdate, ".gkg.csv.zip");

  console.log("Latest:", { exportUrl, mentionsUrl, gkgUrl });

  if (!exportUrl || !mentionsUrl || !gkgUrl) {
    throw new Error("Missing one or more feed URLs from lastupdate.txt");
  }

  // -------- export
  {
    console.log("Ingesting EXPORT...");
    const tsv = await fetchZipText(exportUrl);
    const rows = tsv.split("\n");

    let upserted = 0;

    for (const row of rows) {
      if (!row) continue;
      const cols = row.split("\t");
      if (cols.length < 58) continue;

      const parsed = parseExportRow(cols);
      if (!parsed) continue;

      await db
        .insert(gdeltEvents)
        .values({
          ...parsed,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: gdeltEvents.globalEventId,
          set: {
            eventTime: parsed.eventTime ?? sql`excluded.event_time`,
            actor1Name: parsed.actor1Name ?? sql`excluded.actor1_name`,
            actor2Name: parsed.actor2Name ?? sql`excluded.actor2_name`,
            eventCode: parsed.eventCode ?? sql`excluded.event_code`,
            quadClass: parsed.quadClass ?? sql`excluded.quad_class`,
            goldstein: parsed.goldstein ?? sql`excluded.goldstein`,
            avgTone: parsed.avgTone ?? sql`excluded.avg_tone`,
            numMentions: parsed.numMentions ?? sql`excluded.num_mentions`,
            numSources: parsed.numSources ?? sql`excluded.num_sources`,
            numArticles: parsed.numArticles ?? sql`excluded.num_articles`,
            actionGeoFullname:
              parsed.actionGeoFullname ?? sql`excluded.action_geo_fullname`,
            actionGeoCountryCode:
              parsed.actionGeoCountryCode ??
              sql`excluded.action_geo_country_code`,
            actionGeoLat: parsed.actionGeoLat ?? sql`excluded.action_geo_lat`,
            actionGeoLon: parsed.actionGeoLon ?? sql`excluded.action_geo_lon`,
            sourceUrl: parsed.sourceUrl ?? sql`excluded.source_url`,
            updatedAt: new Date(),
          },
        });

      exportUpserted++;
      upserted++;
      if (upserted <= 2)
        console.log("export sample:", parsed.globalEventId, parsed.eventCode);
    }

    console.log(`EXPORT done. upserted=${upserted}`);
  }

  // -------- mentions
  {
    console.log("Ingesting MENTIONS...");
    const tsv = await fetchZipText(mentionsUrl);
    const rows = tsv.split("\n");

    let inserted = 0;

    for (const row of rows) {
      if (!row) continue;
      const cols = row.split("\t");
      if (cols.length < 14) continue;

      const parsed = parseMentionsRow(cols);
      if (!parsed) continue;

      await db.insert(gdeltEventMentions).values(parsed).onConflictDoNothing();

      inserted++;
      mentionsInserted++;
      if (inserted <= 2)
        console.log("mentions sample:", parsed.globalEventId, parsed.url);
    }

    console.log(`MENTIONS done. inserted=${inserted}`);
  }

  // -------- gkg
  {
    console.log("Ingesting GKG...");
    const tsv = await fetchZipText(gkgUrl);
    const rows = tsv.split("\n");

    let upserted = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!row) continue;
      const cols = row.split("\t");

      // GKG should be wide; if it's tiny, it's probably a bad split
      if (cols.length < 10) {
        skipped++;
        continue;
      }

      const parsed = parseGkgRow(cols);
      if (!parsed) {
        skipped++;
        continue;
      }

      await db
        .insert(gdeltDocuments)
        .values({
          ...parsed,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: gdeltDocuments.url,
          set: {
            domain: parsed.domain ?? sql`excluded.domain`,
            publishedAt: parsed.publishedAt ?? sql`excluded.published_at`,
            title: parsed.title ?? sql`excluded.title`,
            imageUrl: parsed.imageUrl ?? sql`excluded.image_url`,
            tone: parsed.tone ?? sql`excluded.tone`,
            themes: parsed.themes.length ? parsed.themes : sql`excluded.themes`,
            organizations: parsed.organizations.length
              ? parsed.organizations
              : sql`excluded.organizations`,
            rawExtrasXml: parsed.rawExtrasXml ?? sql`excluded.raw_extras_xml`,
            updatedAt: new Date(),
          },
        });

      gkgUpserted++;
      upserted++;
      if (upserted <= 2)
        console.log("gkg sample:", parsed.domain, parsed.title);
    }

    console.log(`GKG done. upserted=${upserted} skipped=${skipped}`);
  }

  console.log("GDELT ingestion complete ✅");

  return {
    export: {
      upserted: exportUpserted,
    },
    mentions: {
      inserted: mentionsInserted,
      skippedMissingEvent: mentionsSkippedMissingEvent,
    },
    gkg: {
      upserted: gkgUpserted,
      skipped: gkgSkipped,
    },
  };
}
