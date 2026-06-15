import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TRPCContext  } from "./trpc/context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;

const logMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  const log = {
    trpc: path,
    type,
    durationMs,
    ok: result.ok,
    ...(!result.ok && result.error ? { error: result.error.message } : {}),
  };
  console.log(JSON.stringify(log));
  return result;
});

export const publicProcedure = t.procedure.use(logMiddleware);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
