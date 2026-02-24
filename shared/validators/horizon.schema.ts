import { z } from "zod";

/** Enums */
export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const MomentumSchema = z.enum(["calm", "building", "accelerating"]);
export type Momentum = z.infer<typeof MomentumSchema>;

export const IndicatorStatusSchema = z.enum(["normal", "watching", "triggered"]);
export type IndicatorStatus = z.infer<typeof IndicatorStatusSchema>;

export const IndicatorCategorySchema = z.enum([
  "infoops",
  "political",
  "infra",
  "diplomatic",
]);
export type IndicatorCategory = z.infer<typeof IndicatorCategorySchema>;

/** Common */
export const IsoDateTimeSchema = z.string().min(10); // keep simple: ISO string
export const IdSchema = z.string().min(1);

/** Scenario summary (used everywhere) */
export const ScenarioSummarySchema = z.object({
  id: IdSchema,
  themeId: IdSchema,
  name: z.string().min(1),
  probability: z.number().min(0).max(1),
  delta7d: z.number().min(-1).max(1),
  momentum: MomentumSchema,
  confidence: ConfidenceSchema,
  topDrivers: z
    .array(
      z.object({
        indicatorId: IdSchema,
        name: z.string().min(1),
        contributionScore: z.number(),
      })
    )
    .max(3),
});
export type ScenarioSummary = z.infer<typeof ScenarioSummarySchema>;

export const PressurePointSchema = z.object({
  date: z.string().min(8), // "YYYY-MM-DD"
  value: z.number(),
});
export type PressurePoint = z.infer<typeof PressurePointSchema>;

export const IndicatorSummarySchema = z.object({
  id: IdSchema,
  themeId: IdSchema,
  name: z.string().min(1),
  category: IndicatorCategorySchema,
  status: IndicatorStatusSchema,
  currentValue: z.number(),
  baselineValue: z.number(),
  accelerationScore: z.number(),
  lastTriggeredAt: IsoDateTimeSchema.nullable(),
  mappedScenarios: z.array(
    z.object({
      scenarioId: IdSchema,
      weight: z.number(),
    })
  ),
});
export type IndicatorSummary = z.infer<typeof IndicatorSummarySchema>;

export const EvidenceSummarySchema = z.object({
  id: IdSchema,
  themeId: IdSchema,
  scenarioId: IdSchema.nullable().optional(),
  indicatorId: IdSchema.nullable().optional(),
  title: z.string().min(1),
  sourceHost: z.string().min(1),
  publishedAt: IsoDateTimeSchema,
  geo: z.object({
    countryCode: z.string().length(2).nullable().optional(),
    regionLabel: z.string().nullable().optional(),
  }),
  summary: z.string().min(1).max(400),
  relevanceScore: z.number(),
  confidence: ConfidenceSchema,
  url: z.string().url().nullable().optional(),
});
export type EvidenceSummary = z.infer<typeof EvidenceSummarySchema>;

export const BeliefUpdateSchema = z.object({
  id: IdSchema,
  themeId: IdSchema,
  scenarioId: IdSchema,
  createdAt: IsoDateTimeSchema,
  prior: z.number().min(0).max(1),
  posterior: z.number().min(0).max(1),
  drivers: z.array(z.object({ indicatorId: IdSchema, name: z.string().min(1) })),
  note: z.string().nullable().optional(),
});
export type BeliefUpdate = z.infer<typeof BeliefUpdateSchema>;

export const GeoPulseSchema = z.object({
  geoKey: z.string().min(1),
  label: z.string().min(1),
  metric: z.enum(["volume", "acceleration", "emotionShift"]),
  value: z.number(),
});
export type GeoPulse = z.infer<typeof GeoPulseSchema>;

export const OverviewDTOSchema = z.object({
  theme: z.object({
    id: IdSchema,
    name: z.string().min(1),
    regionScope: z.string().min(1),
    updatedAt: IsoDateTimeSchema,
  }),
  lastUpdateAt: IsoDateTimeSchema,
  overallConfidence: ConfidenceSchema,
  heroLine: z.string().min(1),
  scenarios: z.array(ScenarioSummarySchema).length(4),
  pressureSeries: z.array(PressurePointSchema).min(7),
  weakSignals: z
    .array(
      z.object({
        id: IdSchema,
        name: z.string().min(1),
        category: IndicatorCategorySchema,
        status: IndicatorStatusSchema,
        accelerationScore: z.number(),
        lastTriggeredAt: IsoDateTimeSchema.nullable(),
      })
    )
    .max(10),
  geoPulse: z.array(GeoPulseSchema),
  hotspots: z
    .array(z.object({ geoKey: z.string(), label: z.string(), value: z.number() }))
    .max(5),
  explainability: z
    .array(
      z.object({
        indicatorId: IdSchema,
        indicatorName: z.string().min(1),
        rationale: z.string().min(1).max(220),
        confidence: ConfidenceSchema,
        evidenceIds: z.array(IdSchema).max(5),
      })
    )
    .max(5),
});
export type OverviewDTO = z.infer<typeof OverviewDTOSchema>;