import { router, publicProcedure } from "../trpc";

export const healthRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
});
