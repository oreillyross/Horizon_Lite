// server/routers/auth.router.ts
import { z } from "zod";
import bcrypt from "bcrypt";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { users, analystGroups } from "@shared/db";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function saveSession(req: any) {
  return new Promise<void>((resolve, reject) => {
    req.session.save((err: any) => (err ? reject(err) : resolve()));
  });
}


function safeUser(u: {
  id: string;
  email: string;
  role: "admin" | "analyst";
  analystGroupId: string | null;
}) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    analystGroupId: u.analystGroupId,
  };
}

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    if (!ctx.user) return null;
    return { user: safeUser(ctx.user) };
  }),

  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(10).max(200),
        // optional for later UI
        displayName: z.string().min(1).max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = normalizeEmail(input.email);

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Email already in use");
      }

      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

      const [group] = await db
        .select({ id: analystGroups.id })
        .from(analystGroups)
        .where(eq(analystGroups.name, "Default"))
        .limit(1);

      if (!group)
        throw new Error("Default analyst group missing (run db:seed)");

      const [created] = await db
        .insert(users)
        .values({
          email,
          passwordHash,
          role: "analyst",
          analystGroupId: group.id,
        })
        .returning();

      ctx.req.session.user = {
        id: created.id,
        role: created.role,
        analystGroupId: created.analystGroupId,
        email: created.email,
      };
      await saveSession(ctx.req)
      return { user: safeUser(created as any) };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = normalizeEmail(input.email);

      const [u] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // Don’t leak whether email exists
      if (!u || !u.passwordHash) {
        throw new Error("Invalid credentials");
      }

      const ok = await bcrypt.compare(input.password, u.passwordHash);
      if (!ok) throw new Error("Invalid credentials");

      ctx.req.session.user = {
        id: u.id,
        role: u.role,
        analystGroupId: u.analystGroupId,
        email: u.email,
      };
      await saveSession(ctx.req)
      return { user: safeUser(u as any) };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    await new Promise<void>((resolve, reject) => {
      ctx.req.session.destroy((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // clear cookie
    ctx.res.clearCookie("hl_session");
    return { ok: true };
  }),
});
