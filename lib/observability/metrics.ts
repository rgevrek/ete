import { createServer, type Server } from "node:http";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

// Prometheus metrics of the server (README, Metrics), on their own port (METRICS_PORT, 9464) that the
// Gateway never routes. Labels are bounded: operation names, outcomes, funnel steps; never texts,
// ids or URLs. ETE has no database: the north star (pages read) is the funnel step page_read. The registry lives on globalThis, so every bundle of one
// process (Next.js builds routes and instrumentation separately) records into the same one.

const g = globalThis as typeof globalThis & { __eteMetrics?: ReturnType<typeof create> };

function create() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: "ete_" });
  const registers = [registry];
  return {
    registry,
    /** Conversions and print exports by outcome: ok, invalid, too_large, not_found, error. */
    operations: new Counter({ name: "ete_operation_total", help: "Operations by outcome", labelNames: ["operation", "outcome"] as const, registers }),
    duration: new Histogram({
      name: "ete_operation_duration_seconds",
      help: "Operation duration",
      labelNames: ["operation"] as const,
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers,
    }),
    /** Funnel steps that happen in the page only (POST /api/events). */
    funnel: new Counter({ name: "ete_funnel_step_total", help: "Funnel steps reached in the pages", labelNames: ["step"] as const, registers }),
  };
}

export const metrics = (g.__eteMetrics ??= create());

/** Records one operation with its outcome and duration; a thrown error counts as "error". */
export async function measured<T>(operation: string, run: () => Promise<T>, outcomeOf: (result: T) => string = () => "ok"): Promise<T> {
  const end = metrics.duration.startTimer({ operation });
  try {
    const result = await run();
    metrics.operations.inc({ operation, outcome: outcomeOf(result) });
    return result;
  } catch (error) {
    metrics.operations.inc({ operation, outcome: "error" });
    throw error;
  } finally {
    end();
  }
}

/** Serves /metrics on METRICS_PORT; started once per process by instrumentation.ts. */
export function serveMetrics(port = Number(process.env.METRICS_PORT ?? 9464)): Server {
  const server = createServer(async (req, res) => {
    if (req.url !== "/metrics") return void res.writeHead(404).end();
    res.writeHead(200, { "content-type": metrics.registry.contentType }).end(await metrics.registry.metrics());
  });
  return server.listen(port);
}
