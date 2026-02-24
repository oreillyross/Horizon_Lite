import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import {
  ScenarioSummarySchema,
  EvidenceSummarySchema,
  BeliefUpdateSchema,
  IndicatorStatusSchema,
} from "../../shared";

const ScenarioDetailSchema = z.object({
  scenario: ScenarioSummarySchema.extend({
    description: z.string().nullable().optional(),
  }),
  expectedNext: z.array(z.string()).max(10),
  falsifiers: z.array(z.string()).max(10),
  contributions: z.array(
    z.object({
      indicatorId: z.string(),
      name: z.string(),
      status: IndicatorStatusSchema,
      accelerationScore: z.number(),
      weight: z.number(),
      contributionScore: z.number(),
    })
  ),
  evidence: z.array(EvidenceSummarySchema),
  beliefUpdates: z.array(BeliefUpdateSchema),
});

export const scenariosRouter = router({
  listScenarios: publicProcedure
    .input(z.object({ themeId: z.string().optional() }).optional())
    .output(z.array(ScenarioSummarySchema))
    .query(async () => {
      // For V1, just reuse dashboard seed (later: DB)
      return [];
    }),

  getScenario: publicProcedure
    .input(z.object({ scenarioId: z.string() }))
    .output(ScenarioDetailSchema)
    .query(async ({ input }) => {
      // stub
      return {
        scenario: {
          id: input.scenarioId,
          themeId: "theme_hybrid_europe",
          name: "Managed Competition",
          probability: 0.34,
          delta7d: 0.03,
          momentum: "building",
          confidence: "medium",
          topDrivers: [],
          description: "Hybrid activity persists below destabilizing thresholds.",
        },
        expectedNext: [
          "Sustained cross-language amplification",
          "Localized protest spikes without spillover",
          "Continued public-sector cyber probing",
        ],
        falsifiers: [
          "Multi-country election disruption evidence",
          "Synchronized infrastructure outages",
          "Sustained diplomatic rupture across blocs",
        ],
        contributions: [],
        evidence: [],
        beliefUpdates: [],
      };
    }),
});