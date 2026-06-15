import { computeDecayWeight } from "./decay";

export type WarmthEvent = {
  createdAt: Date;
  status: string;
};

export type WarmthIndicatorLink = {
  strength: number;
  decayBehaviour: "linear" | "step" | "none";
  windowMs: number;
  events: WarmthEvent[];
};

/**
 * Compute a total warmth score for a scenario from its indicator links and signal events.
 * Mirrors the SQL logic in horizon.router.ts getScenarioWarmth but as a pure function.
 * @param links  Indicator links with their approved signal events
 * @param now    Reference time (defaults to current time)
 */
export function computeScenarioWarmth(
  links: WarmthIndicatorLink[],
  now = new Date(),
): number {
  let total = 0;
  for (const link of links) {
    const windowStart = new Date(now.getTime() - link.windowMs);
    for (const ev of link.events) {
      if (ev.status !== "approved") continue;
      if (ev.createdAt < windowStart || ev.createdAt > now) continue;
      const eventAgeMs = now.getTime() - ev.createdAt.getTime();
      total += link.strength * computeDecayWeight(link.decayBehaviour, eventAgeMs, link.windowMs);
    }
  }
  return total;
}
