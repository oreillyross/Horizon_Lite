import type { Express } from "express";
import { createServer, type Server } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
    })
  );

  return httpServer;
}
