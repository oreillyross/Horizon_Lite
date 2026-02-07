import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { snippetStorage } from "../storage";

export const sourcesRouter = router({
  getRecentSourceItems: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return await snippetStorage.getRecentSourceItems(input.limit);
    }),

  refreshSources: publicProcedure.mutation(async () => {
    return await snippetStorage.refreshSources();
  }),

  /**
   * Takes a recent-source-item and creates a Snippet from it
   */
  captureSourceItem: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await snippetStorage.captureSourceItem(input.id);
    }),
});
