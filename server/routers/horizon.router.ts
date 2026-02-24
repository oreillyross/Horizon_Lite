import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { OverviewDTOSchema } from "../../shared";
import { horizonStorage } from "../../data/horizon.mock.data";

export const dashboardRouter = router({
  getOverview: publicProcedure
    .input(
      z
        .object({
          themeId: z.string().optional(),
          geoMetric: z
            .enum(["volume", "acceleration", "emotionShift"])
            .optional(),
        })
        .optional(),
    )
    .output(OverviewDTOSchema)
    .query(async ({ input }) => {
      const dto = await horizonStorage.getOverview({
        themeId: input?.themeId,
        geoMetric: input?.geoMetric,
      });
      return dto; // already validated by .output()
    }),
});
