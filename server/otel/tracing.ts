// Must be imported before any other server module — instrumentations patch
// http/express/pg/undici at require() time, so anything imported earlier
// would run unpatched.
import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ConsoleSpanExporter, type SpanExporter } from "@opentelemetry/sdk-trace-base";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";

function buildExporter(): SpanExporter | undefined {
  const mode = process.env.OTEL_TRACES_EXPORTER ?? "otlp";
  if (mode === "none") return undefined;
  if (mode === "console") return new ConsoleSpanExporter();
  // Defaults to http://localhost:4318/v1/traces, or OTEL_EXPORTER_OTLP_ENDPOINT.
  return new OTLPTraceExporter();
}

const traceExporter = buildExporter();

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "horizon-lite",
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.0.0",
  }),
  ...(traceExporter ? { traceExporter } : {}),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PgInstrumentation(),
    new UndiciInstrumentation(),
  ],
});

// OTEL_TRACES_EXPORTER=none skips sdk.start() entirely, so instrumentations
// are never registered and tracing has zero runtime overhead.
if (traceExporter) {
  sdk.start();
}

process.on("SIGTERM", () => {
  sdk.shutdown().finally(() => process.exit(0));
});
