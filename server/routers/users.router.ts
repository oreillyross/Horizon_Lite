import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { insertUserSchema } from "@shared/db";
import { storage } from "../storage";

export const usersRouter = router({
  getUsers: publicProcedure.query(async () => {
    return await storage.getUsers();
  }),

  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await storage.getUser(input.id);
    }),

  createUser: publicProcedure.input(insertUserSchema).mutation(async ({ input }) => {
    return await storage.createUser(input);
  }),

  deleteUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await storage.deleteUser(input.id);
    }),
});
