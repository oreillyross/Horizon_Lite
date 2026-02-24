import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import {
  IndicatorSummarySchema,
  IndicatorStatusSchema,
  IndicatorCategorySchema,
  EvidenceSummarySchema,
  IsoDateTimeSchema,
} from "../../shared";

const IndicatorDetailSchema = z.object({
  indicator: IndicatorSummarySchema,
  trend: z.array(
    z.object({
      date: z.string(),
      currentValue: z.number(),
      baselineValue: z.number(),
    })
  ),
  triggerHistory: z.array(z.object({ at: IsoDateTimeSchema, value: z.number() })),
  linkedEvidence: z.array(EvidenceSummarySchema),
  scenarioImpact: z.array(
    z.object({
      scenarioId: z.string(),
      scenarioName: z.string(),
      weight: z.number(),
    })
  ),
});

export const signalsRouter = router({
  listIndicators: publicProcedure
    .input(
      z
        .object({
          themeId: z.string().optional(),
          status: IndicatorStatusSchema.optional(),
          category: IndicatorCategorySchema.optional(),
          q: z.string().optional(),
        })
        .optional()
    )
    .output(z.array(IndicatorSummarySchema))
    .query(async () => {
      return [];
    }),

  getIndicator: publicProcedure
    .input(z.object({ indicatorId: z.string() }))
    .output(IndicatorDetailSchema)
    .query(async ({ input }) => {
      return {
        indicator: {
          id: input.indicatorId,
          themeId: "theme_hybrid_europe",
          name: "Cross-language amplification",
          category: "infoops",
          status: "watching",
          currentValue: 72,
          baselineValue: 55,
          accelerationScore: 2.4,
          lastTriggeredAt: new Date().toISOString(),
          mappedScenarios: [
            { scenarioId: "scn_political_destabilization", weight: 0.7 },
          ],
        },
        trend: [],
        triggerHistory: [],
        linkedEvidence: [],
        scenarioImpact: [{ scenarioId: "scn_political_destabilization", scenarioName: "Escalating Political Destabilization", weight: 0.7 }],
      };
    }),
});