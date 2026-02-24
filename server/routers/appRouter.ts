import { router } from "../trpc";

import { themesRouter } from "./themes.router";
import { snippetsRouter } from "./snippets.router";
import { sourcesRouter } from "./sources.router";
import { usersRouter } from "./users.router";
import { webcutRouter } from "./webcut.router";
import { healthRouter } from "./health.router";
import { themeSynopsisRouter } from "./themeSynopsis.router";
import { authRouter } from "./auth.router";
import { adminRouter } from "./adminRouter";
import { dashboardRouter } from "./horizon.router";
import { horizonThemesRouter } from "./horizonThemes.router";
import { scenariosRouter } from "./scenarios.router";
import { signalsRouter } from "./signals.router";
import { updatesRouter } from "./updates.router";
import { reportsRouter } from "./reports.router";
export { scenariosRouter } from "./scenarios.router";
export {signalsRouter} from "./signals.router"
export {updatesRouter} from "./updates.router"
export {reportsRouter} from "./reports.router"



export const appRouter = router({
  themes: themesRouter,
  webcut: webcutRouter,
  sources: sourcesRouter,
  snippets: snippetsRouter,
  users: usersRouter,
  synopsis: themeSynopsisRouter,
  auth: authRouter,
  admin: adminRouter,
  horizonDashboard: dashboardRouter,
  horizonThemes: horizonThemesRouter,
  scenarios: scenariosRouter,
  signals: signalsRouter,
  updates: updatesRouter,
  reports: reportsRouter,
  

  // keep health as a top-level convenience OR nest it too
  ...healthRouter._def.record,
});

export type AppRouter = typeof appRouter;
