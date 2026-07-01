import { trace, SpanStatusCode, type Attributes, type Span } from "@opentelemetry/api";

export const tracer = trace.getTracer("horizon-lite");

// Wraps a block of work in a span: records exceptions, sets error status,
// and always ends the span. Used for the manual spans in jobs/ that aren't
// covered by the http/express/pg/undici auto-instrumentation.
export async function withSpan<T>(
  name: string,
  attributes: Attributes,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn(span);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
