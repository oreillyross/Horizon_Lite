import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { storage } from "../storage";
import { snippetStorage } from "../storage";
import { insertUserSchema, insertSnippetSchema } from "@shared/schema";

export const appRouter = router({
  createSnippet: publicProcedure
    .input(insertSnippetSchema)
    .mutation(async ({ input }) => {
      return await snippetStorage.createSnippet(input);
    }),

  getSnippets: publicProcedure.query(async () => {
    return await snippetStorage.getSnippets();
  }),

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
});

export type AppRouter = typeof appRouter;
