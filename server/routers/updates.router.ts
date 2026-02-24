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
        .optional()
    )
    .output(z.array(BeliefUpdateSchema))
    .query(async () => {
      return [];
    }),

  addNote: publicProcedure
    .input(z.object({ updateId: z.string(), note: z.string().min(1).max(2000) }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async () => {
      return { ok: true };
    }),
});