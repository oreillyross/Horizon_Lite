import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import { IsoDateTimeSchema, IdSchema } from "../../shared";

const ThemeSchema = z.object({
  id: IdSchema,
  name: z.string(),
  regionScope: z.string(),
  updatedAt: IsoDateTimeSchema,
});

export const horizonThemesRouter = router({
  listThemes: publicProcedure.output(z.array(ThemeSchema)).query(async () => {
    return [
      {
        id: "theme_hybrid_europe",
        name: "Hybrid Warfare — Europe",
        regionScope: "Europe-wide",
        updatedAt: new Date().toISOString(),
      },
    ];
  }),

  getTheme: publicProcedure
    .input(z.object({ themeId: z.string() }))
    .output(ThemeSchema)
    .query(async ({ input }) => {
      return {
        id: input.themeId,
        name: "Hybrid Warfare — Europe",
        regionScope: "Europe-wide",
        updatedAt: new Date().toISOString(),
      };
    }),
});