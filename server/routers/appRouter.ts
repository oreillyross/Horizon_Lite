import { router } from "../trpc";

import { themesRouter } from "./themes.router";
import { snippetsRouter } from "./snippets.router";
import { sourcesRouter } from "./sources.router";
import { usersRouter } from "./users.router";
import { webcutRouter } from "./webcut.router";
import { healthRouter } from "./health.router";
import {themeSynopsisRouter} from "./themeSynopsis.router"
import {authRouter} from "./auth.router"
import {adminRouter} from "./adminRouter"

export const appRouter = router({
  themes: themesRouter,
  webcut: webcutRouter,
  sources: sourcesRouter,
  snippets: snippetsRouter,
  users: usersRouter,
  synopsis: themeSynopsisRouter,
  auth: authRouter,
  admin: adminRouter,

  // keep health as a top-level convenience OR nest it too
  ...healthRouter._def.record,
});

export type AppRouter = typeof appRouter;
