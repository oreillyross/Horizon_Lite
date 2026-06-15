export type AssessmentEvidenceRow = {
  scenarioId: string;
  indicatorId: string;
  indicatorName: string;
  strength: number;
  timeWeight: string;
  eventId: string | null;
  eventTitle: string | null;
  eventSourceUrl: string | null;
  eventScore: number;
  eventCreatedAt: Date | null;
};

export type IndicatorEntry = {
  indicatorId: string;
  indicatorName: string;
  strength: number;
  timeWeight: string;
  events: {
    eventId: string;
    title: string | null;
    sourceUrl: string | null;
    score: number;
    createdAt: Date;
  }[];
};

/**
 * Group flat evidence rows (scenario → indicator → event) into a nested Map.
 * Mirrors the in-memory grouping logic in reports.router.ts generateAssessment.
 */
export function buildEvidenceMap(
  rows: AssessmentEvidenceRow[],
): Map<string, Map<string, IndicatorEntry>> {
  const evidenceMap = new Map<string, Map<string, IndicatorEntry>>();

  for (const row of rows) {
    if (!evidenceMap.has(row.scenarioId)) {
      evidenceMap.set(row.scenarioId, new Map());
    }
    const indMap = evidenceMap.get(row.scenarioId)!;

    if (!indMap.has(row.indicatorId)) {
      indMap.set(row.indicatorId, {
        indicatorId: row.indicatorId,
        indicatorName: row.indicatorName,
        strength: row.strength,
        timeWeight: row.timeWeight,
        events: [],
      });
    }

    if (row.eventId !== null && row.eventCreatedAt !== null) {
      indMap.get(row.indicatorId)!.events.push({
        eventId: row.eventId,
        title: row.eventTitle,
        sourceUrl: row.eventSourceUrl,
        score: row.eventScore,
        createdAt: row.eventCreatedAt,
      });
    }
  }

  return evidenceMap;
}

export type ScenarioWithDelta = {
  scenarioId: string;
  scenarioName: string;
  scenarioDescription: string;
  delta: number;
};

/**
 * Sort scenarios into warmer (delta > 0) and colder (delta < 0) groups.
 * Warmer sorted descending by delta; colder sorted ascending.
 */
export function partitionByWarmth(scenarios: ScenarioWithDelta[]) {
  const warmer = scenarios.filter((s) => s.delta > 0).sort((a, b) => b.delta - a.delta);
  const neutral = scenarios.filter((s) => s.delta === 0);
  const colder = scenarios.filter((s) => s.delta < 0).sort((a, b) => a.delta - b.delta);
  return { warmer, neutral, colder };
}
