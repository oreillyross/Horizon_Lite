import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { themeStorage, snippetStorage } from "../storage";
import { generateThemeSynopsis } from "../llm/generateThemeSynopsis";

export const themeSynopsisRouter = router({
  // ...existing procedures

  refreshThemeSynopsis: publicProcedure
    .input(z.object({ themeId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const theme = await themeStorage.getThemeById(input.themeId);
      if (!theme) throw new Error("Theme not found");

      const snippets = await snippetStorage.getSnippetsByThemeId(input.themeId);
      // ^ if you don’t have this helper yet, implement a storage method that filters by themeId.

      const { rawJson, model } = await generateThemeSynopsis({
        theme: { id: theme.id, name: theme.name, description: theme.description ?? null },
        snippets: snippets.map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          tags: s.tags ?? [],
          content: s.content,
        })),
      });

      const updated = await themeStorage.updateThemeSynopsis({
        themeId: input.themeId,
        synopsis: rawJson, // stored as JSON string
        synopsisModel: model,
      });

      return updated;
    }),
});
