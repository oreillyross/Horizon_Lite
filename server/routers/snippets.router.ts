import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { insertSnippetSchema } from "@shared/db";
import { snippetStorage } from "../storage";

export const snippetsRouter = router({
  createSnippet: publicProcedure.input(insertSnippetSchema).mutation(async ({ input }) => {
    return await snippetStorage.createSnippet(input);
  }),

  getSnippets: publicProcedure.query(async () => {
    return await snippetStorage.getSnippets();
  }),

  getSnippetById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const s = await snippetStorage.getSnippetById(input.id);
      if (!s) throw new TRPCError({ code: "NOT_FOUND" });
      return s;
    }),

  updateSnippet: publicProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string(),
        tags: z.array(z.string()),
        themeId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await snippetStorage.updateSnippet(input.id, {
        content: input.content,
        tags: input.tags,
        themeId: input.themeId,
      });
    }),

  deleteSnippet: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await snippetStorage.deleteSnippet(input.id);
    }),

  getTags: publicProcedure.query(async () => {
    return await snippetStorage.getTags();
  }),

  globalSearch: publicProcedure
    .input(
      z.object({
        q: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .query(({ input }) => snippetStorage.globalSearch(input.q, input.limit ?? 20)),
});
