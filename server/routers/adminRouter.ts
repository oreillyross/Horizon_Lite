import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import { users, analystGroups, themes, themeGroupLinks } from "@shared/db";

const isAdminEmail = (email?: string | null) => {
  
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
};

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!isAdminEmail(ctx.user?.email)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next();
});

export const adminRouter = router({
  // USERS
  listUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(users).orderBy(users.createdAt);
  }),

  setUserGroup: adminProcedure
    .input(
      z.object({ userId: z.string(), groupId: z.string().uuid().nullable() }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({ analystGroupId: input.groupId })
        .where(eq(users.id, input.userId));
      return { ok: true };
    }),

  // GROUPS
  listGroups: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(analystGroups).orderBy(analystGroups.createdAt);
  }),

  createGroup: adminProcedure
    .input(z.object({ name: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const [g] = await ctx.db
        .insert(analystGroups)
        .values({ name: input.name })
        .returning();
      return g;
    }),

  renameGroup: adminProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(analystGroups)
        .set({ name: input.name })
        .where(eq(analystGroups.id, input.id));
      return { ok: true };
    }),

  deleteGroup: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(analystGroups).where(eq(analystGroups.id, input.id));
      return { ok: true };
    }),

  // THEME LINKS
  listThemeLinks: adminProcedure.query(async ({ ctx }) => {
    // return a joined view for easy UI
    return ctx.db
      .select({
        themeId: themes.id,
        themeName: themes.name,
        groupId: analystGroups.id,
        groupName: analystGroups.name,
      })
      .from(themeGroupLinks)
      .innerJoin(themes, eq(themeGroupLinks.themeId, themes.id))
      .innerJoin(analystGroups, eq(themeGroupLinks.groupId, analystGroups.id))
      .orderBy(analystGroups.name, themes.name);
  }),

  setThemeGroup: adminProcedure
    .input(
      z.object({
        themeId: z.string().uuid(),
        groupId: z.string().uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // MVP: enforce one group per theme by deleting existing then inserting (if groupId provided)
      await ctx.db
        .delete(themeGroupLinks)
        .where(eq(themeGroupLinks.themeId, input.themeId));
      if (input.groupId) {
        await ctx.db
          .insert(themeGroupLinks)
          .values({ themeId: input.themeId, groupId: input.groupId });
      }
      return { ok: true };
    }),
});
