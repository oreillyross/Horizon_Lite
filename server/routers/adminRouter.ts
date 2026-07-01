import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { protectedProcedure, router } from "../trpc";
import { users, analystGroups, themes, themeGroupLinks, appConfig, indicatorCategories, indicators } from "@shared/db";
import { count } from "drizzle-orm";
import bcrypt from "bcrypt";
import { ingestAcled, isAcledEnabled } from "../jobs/acledIngest";
import { generateSignals } from "../jobs/generateSignals";
import { runGdeltJob, GdeltJobLockedError } from "../jobs/runGdeltJob";
import { logger } from "../logger";

const isAdminEmail = (email?: string | null) => {
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
};

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!isAdminEmail(ctx.user?.email)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next();
});

export const adminRouter = router({
  runGdelt: adminProcedure.mutation(async ({}) => {
    try {
      return await runGdeltJob();
    } catch (error) {
      if (error instanceof GdeltJobLockedError) {
        throw new TRPCError({ code: "CONFLICT", message: "Job already Running" });
      }
      logger.error({ module: "admin-router", err: error instanceof Error ? error.message : error }, "GDELT job failed");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
  }),
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

  inviteAnalyst: adminProcedure
    .input(z.object({ email: z.string().email(), groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const existing = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
      }
      const temporaryPassword = Array.from(
        { length: 16 },
        () => "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 54)]
      ).join("");
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      const [created] = await ctx.db
        .insert(users)
        .values({ email, passwordHash, role: "analyst", analystGroupId: input.groupId })
        .returning({ id: users.id, email: users.email });
      return { userId: created.id, email: created.email, temporaryPassword };
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

  // CONFIG
  getConfig: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ value: appConfig.value })
        .from(appConfig)
        .where(eq(appConfig.key, input.key))
        .limit(1);
      return row?.value ?? null;
    }),

  setConfig: adminProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(appConfig)
        .values({ key: input.key, value: input.value })
        .onConflictDoUpdate({
          target: appConfig.key,
          set: { value: input.value, updatedAt: new Date() },
        });
      return { ok: true };
    }),

  // ACLED FEED
  runAcled: adminProcedure.mutation(async ({}) => {
    if (!process.env.ACLED_API_KEY || !process.env.ACLED_EMAIL) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "ACLED_API_KEY and ACLED_EMAIL environment variables are not set",
      });
    }

    const enabled = await isAcledEnabled();
    if (!enabled) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "ACLED feed is disabled. Enable it in the Admin panel first.",
      });
    }

    const startedAt = Date.now();
    logger.info({ module: "acled-job" }, "ACLED job started");

    const ingestResult = await ingestAcled();
    const signalResult = await generateSignals();
    const durationMs = Date.now() - startedAt;

    logger.info(
      { module: "acled-job", durationMs, ingestResult, signalResult },
      "ACLED job finished",
    );

    return {
      ok: true,
      job: "acled",
      durationMs,
      ingestResult,
      signalResult,
    };
  }),

  // INDICATOR CATEGORIES
  listIndicatorCategories: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(indicatorCategories)
      .orderBy(indicatorCategories.label);
  }),

  createIndicatorCategory: adminProcedure
    .input(z.object({ value: z.string().min(1).max(60), label: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const value = input.value.trim().toLowerCase().replace(/\s+/g, "_");
      const [row] = await ctx.db
        .insert(indicatorCategories)
        .values({ value, label: input.label.trim() })
        .returning();
      return row;
    }),

  updateIndicatorCategory: adminProcedure
    .input(z.object({ id: z.string().uuid(), label: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(indicatorCategories)
        .set({ label: input.label.trim() })
        .where(eq(indicatorCategories.id, input.id));
      return { ok: true };
    }),

  deleteIndicatorCategory: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [cat] = await ctx.db
        .select()
        .from(indicatorCategories)
        .where(eq(indicatorCategories.id, input.id))
        .limit(1);
      if (!cat) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });

      const [usage] = await ctx.db
        .select({ n: count() })
        .from(indicators)
        .where(eq(indicators.category, cat.value));

      if ((usage?.n ?? 0) > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot delete: ${usage!.n} indicator${usage!.n === 1 ? "" : "s"} still use this category. Reassign them first.`,
        });
      }

      await ctx.db.delete(indicatorCategories).where(eq(indicatorCategories.id, input.id));
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
