import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { themeStorage } from "../storage";
import { generateThemeSynopsis, computeContextHash } from "../llm/generateThemeSynopsis";
import { assembleThemeContext } from "../llm/assembleThemeContext";

export const themeSynopsisRouter = router({
  refreshThemeSynopsis: publicProcedure
    .input(z.object({ themeId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const ctx = await assembleThemeContext(input.themeId);
      const contextHash = computeContextHash(ctx);

      const { rawJson, model } = await generateThemeSynopsis({
        theme: ctx.theme,
        snippets: ctx.snippets.map((s) => ({
          id: s.id,
          createdAt: new Date(s.createdAt),
          tags: s.tags,
          content: s.content,
        })),
        scenarios: ctx.scenarios,
      });

      return await themeStorage.updateThemeSynopsis({
        themeId: input.themeId,
        synopsis: rawJson,
        synopsisModel: model,
        synopsisContextHash: contextHash,
      });
    }),

  getCurrentContextHash: publicProcedure
    .input(z.object({ themeId: z.string().uuid() }))
    .query(async ({ input }) => {
      const ctx = await assembleThemeContext(input.themeId);
      return { hash: computeContextHash(ctx) };
    }),
});
