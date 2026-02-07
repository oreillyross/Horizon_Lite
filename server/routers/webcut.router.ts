import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { fetchReadable } from "../utils/webcut";

export const webcutRouter = router({
  fetchReadable: publicProcedure
    .input(z.object({ url: z.string().min(1) }))
    .query(async ({ input }) => {
      return await fetchReadable(input.url);
    }),
});
