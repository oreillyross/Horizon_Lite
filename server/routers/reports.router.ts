import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { MomentumSchema } from "../../shared";

const SentinelBriefSchema = z.object({
  title: z.string(),
  generatedAt: z.string(),
  executiveSummary: z.array(z.string()).max(10),
  scenarioShifts: z.array(
    z.object({
      scenarioId: z.string(),
      name: z.string(),
      probability: z.number(),
      delta7d: z.number(),
      momentum: MomentumSchema,
    })
  ),
  keyDrivers: z.array(
    z.object({
      indicatorId: z.string(),
      name: z.string(),
      rationale: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
    })
  ),
  hotspots: z.array(z.object({ label: z.string(), value: z.number() })).max(10),
  watchNext: z.array(
    z.object({
      scenarioId: z.string(),
      expectations: z.array(z.string()).max(10),
      falsifiers: z.array(z.string()).max(10),
    })
  ),
});

export const reportsRouter = router({
  generateSentinelBrief: publicProcedure
    .input(z.object({ themeId: z.string().optional() }).optional())
    .output(SentinelBriefSchema)
    .query(async () => {
      return {
        title: "Sentinel Brief — Hybrid Warfare (Europe)",
        generatedAt: new Date().toISOString(),
        executiveSummary: [
          "Probability shifts indicate increasing political destabilization momentum.",
          "Cross-language amplification is accelerating above baseline.",
          "Hotspots concentrate in Central & Eastern Europe with spillover signals.",
        ],
        scenarioShifts: [],
        keyDrivers: [],
        hotspots: [],
        watchNext: [],
      };
    }),
});