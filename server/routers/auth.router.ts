// server/routers/auth.router.ts
import { router, publicProcedure } from "../trpc";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    if (!ctx.user) return null;

    return {
      user: {
        id: ctx.user.id,
        role: ctx.user.role,
        analystGroupId: ctx.user.analystGroupId,
      },
    };
  }),
});
