const TIME_WEIGHT_MS: Record<string, number> = {
  day: 86400_000,
  week: 7 * 86400_000,
  month: 30 * 86400_000,
  year: 365 * 86400_000,
};

/**
 * Convert a timeWeight label to milliseconds.
 */
export function timeWeightToMs(timeWeight: string): number {
  return TIME_WEIGHT_MS[timeWeight] ?? TIME_WEIGHT_MS.week;
}

/**
 * Compute a [0,1] decay weight for a signal event.
 * eventAgeMs: milliseconds since the event was created (must be ≥ 0)
 * windowMs:   total window duration in milliseconds
 * Returns 0 when the event falls outside the window.
 */
export function computeDecayWeight(
  decayBehaviour: "linear" | "step" | "none",
  eventAgeMs: number,
  windowMs: number,
): number {
  if (eventAgeMs < 0 || eventAgeMs > windowMs) return 0;
  switch (decayBehaviour) {
    case "linear":
      return (windowMs - eventAgeMs) / windowMs;
    case "step":
      return 1;
    case "none":
      return 1;
  }
}
