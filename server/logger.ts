import pino from "pino";
import { trace, context } from "@opentelemetry/api";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  mixin() {
    const span = trace.getSpan(context.active());
    if (!span) return {};
    const spanContext = span.spanContext();
    return { traceId: spanContext.traceId, spanId: spanContext.spanId };
  },
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
});

function summarizeListItem(item: unknown): unknown {
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    return record.id ?? record.globalEventId ?? record.url ?? "[object]";
  }
  return item;
}

// Turns an array into a count + small id sample instead of a full dump, so
// list flows can be traced through logs without flooding them.
export function summarizeList(items: unknown[]): { count: number; sampleIds: unknown[] } {
  return { count: items.length, sampleIds: items.slice(0, 5).map(summarizeListItem) };
}

// Turns any value into a log-safe shape: arrays become count+sample, objects
// become their key list, primitives pass through unchanged.
export function summarizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return summarizeList(value);
  if (value && typeof value === "object") return { keys: Object.keys(value as Record<string, unknown>) };
  return value;
}
