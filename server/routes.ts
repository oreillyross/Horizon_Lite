import type { Express } from "express";
import {  type Server } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers/appRouter";
import {createContext} from "./trpc/context"

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // app.use("/api/trpc", (req, _res, next) => {
  //   console.log("TRPC rawBody:", (req as any).rawBody?.toString?.() ?? req.body);
  //   next();
  // });

  
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return httpServer;
}
