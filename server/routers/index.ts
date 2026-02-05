import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { storage } from "../storage";
import { snippetStorage } from "../storage";
import { fetchReadable } from "../utils/webcut";
import { insertUserSchema, insertSnippetSchema } from "@shared/schema";
import { TRPCError } from "@trpc/server";
import { themesRouter } from "./themes.router";

export const appRouter = router({
  webcutFetchReadable: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      return await fetchReadable(input.url);
    }),

  getRecentSourceItems: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return await snippetStorage.getRecentSourceItems(input.limit);
    }),

  refreshSources: publicProcedure.mutation(async () => {
    return await snippetStorage.refreshSources();
  }),

  /**
   * Takes a recent-source-item and creates a Snippet from it (content could be title + url for now)
   */
  captureSourceItem: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await snippetStorage.captureSourceItem(input.id);
    }),

  createSnippet: publicProcedure
    .input(insertSnippetSchema)
    .mutation(async ({ input }) => {
      return await snippetStorage.createSnippet(input);
    }),

  getSnippets: publicProcedure.query(async () => {
    return await snippetStorage.getSnippets();
  }),

  getSnippetById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
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
      }),
    )
    .mutation(async ({ input }) => {
      console.log(input.tags);
      return await snippetStorage.updateSnippet(input.id, {
        content: input.content,
        tags: input.tags,
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
    .query(({ input }) =>
      snippetStorage.globalSearch(input.q, input.limit ?? 20),
    ),

  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),

  getUsers: publicProcedure.query(async () => {
    return await storage.getUsers();
  }),

  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await storage.getUser(input.id);
    }),

  createUser: publicProcedure
    .input(insertUserSchema)
    .mutation(async ({ input }) => {
      return await storage.createUser(input);
    }),

  deleteUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await storage.deleteUser(input.id);
    }),
  themes: themesRouter,
});

export type AppRouter = typeof appRouter;
