import { initTRPC, TRPCError } from "@trpc/server";
import { SpanStatusCode } from "@opentelemetry/api";
import superjson from "superjson";
import type { TRPCContext  } from "./trpc/context";
import { logger, summarizeValue } from "./logger";
import { tracer } from "./otel/tracer";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;

// One middleware instruments every procedure on every router: a span named
// trpc.<path> plus a structured log line carrying an input shape summary
// (not the raw payload) and the trace/span id via the pino mixin.
const logMiddleware = t.middleware(async ({ path, type, getRawInput, next }) => {
  return tracer.startActiveSpan(`trpc.${path}`, { attributes: { "trpc.type": type } }, async (span) => {
    const start = Date.now();
    const rawInput = await getRawInput().catch(() => undefined);
    const result = await next();
    const durationMs = Date.now() - start;

    const logFields = {
      trpc: path,
      type,
      durationMs,
      ok: result.ok,
      input: summarizeValue(rawInput),
      ...(!result.ok ? { err: result.error.message } : {}),
    };

    if (result.ok) {
      logger.info(logFields, "trpc.call");
    } else {
      span.recordException(result.error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message });
      logger.warn(logFields, "trpc.call");
    }

    span.end();
    return result;
  });
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
