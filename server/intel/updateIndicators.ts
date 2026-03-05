import { db } from "../db";
import { signalEvents } from "@shared/db"
  
export async function computeIndicatorMetrics() {
  const rows = await db.select().from(signalEvents);

  const grouped: Record<string, number[]> = {};

  for (const r of rows) {
    if (!grouped[r.indicatorId]) grouped[r.indicatorId] = [];
    grouped[r.indicatorId].push(r.score);
  }

  const metrics = Object.entries(grouped).map(([id, scores]) => {
    const total = scores.reduce((a, b) => a + b, 0);

    return {
      id,
      currentValue: total,
    };
  });

  return metrics;
}