import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { sessionMiddleware } from "./session";
import { ingestGdelt } from "./jobs/gdeltIngest";
import { generateSignals } from "./jobs/generateSignals";
import { db } from "./db";
import { sql } from "drizzle-orm";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.set("trust proxy", 1);

app.use(sessionMiddleware());

const GDELT_JOB_LOCK_ID = 987654321;

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.post("/internal/jobs/gdelt", async (req, res) => {
  const authHeader = req.headers["x-job-secret"];
  const expected = process.env.JOB_SECRET;

  if (!expected || authHeader !== expected) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  let lockAcquired = false;

  try {
    const lockResult = await db.execute(
      sql`SELECT pg_try_advisory_lock(${GDELT_JOB_LOCK_ID}) as locked`
    );

    const locked = Boolean(lockResult.rows[0]?.locked);

    if (!locked) {
      return res.status(409).json({
        ok: false,
        error: "job already running",
      });
    }

    lockAcquired = true;

    const startedAt = Date.now();
    log("GDELT job started", "gdelt-job");

    const ingestResult = await ingestGdelt();
    const signalResult = await generateSignals();

    const durationMs = Date.now() - startedAt;

    log(
      `GDELT job finished in ${durationMs}ms :: ${JSON.stringify({
        ingestResult,
        signalResult,
      })}`,
      "gdelt-job",
    );

    return res.json({
      ok: true,
      job: "gdelt",
      durationMs,
      ingestResult,
      signalResult,
    });
  } catch (error) {
    console.error("GDELT job failed:", error);

    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    });
  } finally {
    if (lockAcquired) {
      try {
        await db.execute(
          sql`SELECT pg_advisory_unlock(${GDELT_JOB_LOCK_ID})`
        );
      } catch (unlockError) {
        console.error("Failed to release GDELT advisory lock:", unlockError);
      }
    }
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (path.startsWith("/api") || path.startsWith("/internal/jobs")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();