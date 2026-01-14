import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";

export const appRouter = router({
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
