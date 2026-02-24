import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { BeliefUpdateSchema } from "../../shared";

export const updatesRouter = router({
  listUpdates: publicProcedure
    .input(
      z
        .object({
          themeId: z.string().optional(),
          scenarioId: z.string().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          majorOnly: z.boolean().optional(),
        })
        .optional(),
    )
    .output(z.array(BeliefUpdateSchema))
    .query(async () => {
      return [
        {
          id: "upd_001",
          themeId: "theme_hybrid_europe",
          scenarioId: "scn_political_destabilization",
          createdAt: new Date().toISOString(),
          prior: 0.24,
          posterior: 0.29,
          drivers: [
            {
              indicatorId: "ind_polarizing_rhetoric_spike",
              name: "Polarizing rhetoric spike",
            },
            {
              indicatorId: "ind_cross_language_amplification",
              name: "Cross-language amplification",
            },
          ],
          note: "Acceleration in political rhetoric and cross-language amplification increased scenario weight.",
        },
      ];
    }),

  addNote: publicProcedure
    .input(
      z.object({ updateId: z.string(), note: z.string().min(1).max(2000) }),
    )
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async () => {
      return { ok: true };
    }),
});
