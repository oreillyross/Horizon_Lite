import "./otel/tracing";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { sessionMiddleware } from "./session";
import { runLifecycleManager } from "./jobs/lifecycleManager";
import { runGdeltJob, GdeltJobLockedError } from "./jobs/runGdeltJob";
import { runScheduledGdeltIngest } from "./jobs/gdeltScheduler";
import { fetchReadable } from "./utils/webcut";
import cron from "node-cron";
import { logger, summarizeValue } from "./logger";

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

app.get("/health", async (_req, res) => {
  try {
    const { getHealthData } = await import("./routers/health.router");
    const data = await getHealthData();
    const status = data.db === "ok" ? 200 : 503;
    return res.status(status).json(data);
  } catch (err) {
    return res.status(503).json({ db: "error", lastIngestAt: null, signalQueueDepth: 0 });
  }
});

// POST /api/webcut — server-side article fetch and text extraction.
// Accepts { url } and returns { text } (plain text, block-level nodes only).
app.post("/api/webcut", async (req, res) => {
  const { url } = req.body as { url?: unknown };
  if (typeof url !== "string" || !url) {
    return res.status(400).json({ error: "url is required" });
  }
  try {
    const result = await fetchReadable(url);
    return res.json({ text: result.textContent, title: result.title });
  } catch (err) {
    return res
      .status(422)
      .json({ error: err instanceof Error ? err.message : "Failed to fetch article" });
  }
});

// Cron schedule: twice daily at 06:00 UTC and 18:00 UTC.
// Hook for external schedulers — call with X-Job-Secret header matching JOB_SECRET env var.
app.post("/internal/jobs/gdelt", async (req, res) => {
  const jobSecretHeader = req.headers["x-job-secret"];
  const expectedSecret = process.env.JOB_SECRET;

  const isCronAuthorized =
    expectedSecret && jobSecretHeader === expectedSecret;

  
  if (!isCronAuthorized ) {
    return res.status(401).json({
      ok: false,
      error: "unauthorized",
    });
  }


  try {
    const result = await runGdeltJob();
    return res.json(result);
  } catch (error) {
    if (error instanceof GdeltJobLockedError) {
      return res.status(409).json({ ok: false, error: "job already running" });
    }
    logger.error({ err: error instanceof Error ? error.message : error }, "GDELT job failed");
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    });
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
    const durationMs = Date.now() - start;

    if (path.startsWith("/api") || path.startsWith("/internal/jobs")) {
      logger.info(
        {
          method: req.method,
          path,
          statusCode: res.statusCode,
          durationMs,
          ...(capturedJsonResponse ? { response: summarizeValue(capturedJsonResponse) } : {}),
        },
        "http.request",
      );
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
      logger.info({ port }, "serving");

      // Data lifecycle: HOT→WARM→COLD archival, runs daily at 10:00 UTC
      cron.schedule("0 10 * * *", () => {
        logger.info({ module: "lifecycle" }, "Lifecycle cron triggered");
        runLifecycleManager().catch((err) =>
          logger.error(
            { module: "lifecycle", err: err instanceof Error ? err.message : err },
            "Lifecycle cron error",
          ),
        );
      });

      logger.info({ module: "lifecycle" }, "Lifecycle cron scheduled (daily at 10:00 UTC)");

      // GDELT auto-ingest: hourly tick checks app_config for the analyst's
      // configured enabled/frequency and runs the job when it's due.
      cron.schedule("0 * * * *", () => {
        runScheduledGdeltIngest().catch((err) =>
          logger.error(
            { module: "gdelt-scheduler", err: err instanceof Error ? err.message : err },
            "GDELT scheduler error",
          ),
        );
      });

      logger.info({ module: "gdelt-scheduler" }, "GDELT auto-ingest scheduler running (hourly check)");
    },
  );
})();