import fetch from "node-fetch";
import { db } from "../db";
import { signalEvents } from "@shared/db";
import { scoreArticle, mapIndicator} from "../intel/indicatorScoring"

const GDELT_URL =
  "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

export async function ingestGdelt() {
  console.log("Running GDELT ingestion...");

  const res = await fetch(GDELT_URL);
  const text = await res.text();

  const lines = text.split("\n");

  const csvLine = lines.find((l) => l.includes(".gkg.csv"));

  if (!csvLine) return;

  const parts = csvLine.split(" ");
  const fileUrl = parts[2];

  const csv = await fetch(fileUrl).then((r) => r.text());

  const rows = csv.split("\n").slice(0, 200); // limit for MVP

  for (const row of rows) {
    if (!row) continue;

    const cols = row.split("\t");

    const url = cols[4]?.trim();
    const title = cols[5]?.trim();

    if (!url) continue;

    // score on title, fallback to url if title missing
    const textForScoring = title || url;
    const score = scoreArticle(textForScoring);

    if (score === 0) continue;

    await db.insert(signalEvents).values({
      indicatorId: mapIndicator(textForScoring),
      sourceUrl: url,
      title,
      score,
    });
  }

  console.log("GDELT ingest complete");
}