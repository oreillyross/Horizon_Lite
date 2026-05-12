import { router, publicProcedure } from "../trpc";
import { snippetStorage } from "../storage";

export const snippetsRouter = router({
  getSnippets: publicProcedure.query(async () => {
    return await snippetStorage.getSnippets();
  }),

  getTags: publicProcedure.query(async () => {
    return await snippetStorage.getTags();
  }),
});
