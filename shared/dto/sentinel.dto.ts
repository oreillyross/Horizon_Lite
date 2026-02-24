export type Confidence = "low" | "medium" | "high";
export type Momentum = "calm" | "building" | "accelerating";
export type IndicatorStatus = "normal" | "watching" | "triggered";
export type IndicatorCategory =
  | "infoops"
  | "political"
  | "infra"
  | "diplomatic";

export type ScenarioSummary = {
  id: string;
  themeId: string;
  name: string;
  probability: number; // 0..1
  delta7d: number; // -1..1
  momentum: Momentum;
  confidence: Confidence;
  topDrivers: {
    indicatorId: string;
    name: string;
    contributionScore: number;
  }[]; // max 3
};

export type PressurePoint = { date: string; value: number }; // ISO date

export type IndicatorSummary = {
  id: string;
  themeId: string;
  name: string;
  category: IndicatorCategory;
  status: IndicatorStatus;
  currentValue: number;
  baselineValue: number;
  accelerationScore: number;
  lastTriggeredAt: string | null; // ISO
  mappedScenarios: { scenarioId: string; weight: number }[];
};

export type EvidenceSummary = {
  id: string;
  themeId: string;
  scenarioId?: string | null;
  indicatorId?: string | null;
  title: string;
  sourceHost: string;
  publishedAt: string; // ISO
  geo: { countryCode?: string | null; regionLabel?: string | null };
  summary: string; // 1–2 lines
  relevanceScore: number;
  confidence: Confidence;
  url?: string | null;
};

export type BeliefUpdate = {
  id: string;
  themeId: string;
  scenarioId: string;
  createdAt: string; // ISO
  prior: number;
  posterior: number;
  drivers: { indicatorId: string; name: string }[];
  note?: string | null;
};

export type GeoPulse = {
  geoKey: string; // "DE", "FR", "CEE", etc
  label: string; // display name
  metric: "volume" | "acceleration" | "emotionShift";
  value: number;
};

export type OverviewDTO = {
  theme: { id: string; name: string; regionScope: string; updatedAt: string };
  lastUpdateAt: string;
  overallConfidence: Confidence;
  heroLine: string; // “Narrative pressure is shifting toward...”
  scenarios: ScenarioSummary[]; // exactly 4 for V1
  pressureSeries: PressurePoint[]; // 7–30 days
  weakSignals: Pick<
    IndicatorSummary,
    | "id"
    | "name"
    | "category"
    | "status"
    | "accelerationScore"
    | "lastTriggeredAt"
  >[]; // top 10
  geoPulse: GeoPulse[]; // for current metric mode
  hotspots: { geoKey: string; label: string; value: number }[]; // top 5
  explainability: {
    indicatorId: string;
    indicatorName: string;
    rationale: string;
    confidence: Confidence;
    evidenceIds: string[];
  }[]; // 3–5 items
};
