import { router } from "../trpc";

import { themesRouter } from "./themes.router";
import { snippetsRouter } from "./snippets.router";
import { healthRouter } from "./health.router";
import { themeSynopsisRouter } from "./themeSynopsis.router";
import { authRouter } from "./auth.router";
import { adminRouter } from "./adminRouter";
import { dashboardRouter } from "./horizon.router";
import { scenariosRouter } from "./scenarios.router";
import { signalsRouter } from "./signals.router";
import { updatesRouter } from "./updates.router";
import { reportsRouter } from "./reports.router";
import { intelRouter } from "./intelRouter";
import { gdeltRouter } from "./gdelt.router";

export const appRouter = router({
  themes: themesRouter,
  snippets: snippetsRouter,
  synopsis: themeSynopsisRouter,
  auth: authRouter,
  admin: adminRouter,
  intel: intelRouter,
  horizon: router({
    dashboard: dashboardRouter,
    themes: themesRouter,
    scenarios: scenariosRouter,
    signals: signalsRouter,
    updates: updatesRouter,
    reports: reportsRouter,
    gdelt: gdeltRouter,
  }),

  ...healthRouter._def.record,
});

export type AppRouter = typeof appRouter;
