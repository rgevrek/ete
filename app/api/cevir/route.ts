import { convert, type Script } from "@/lib/convert";
import { metrics } from "@/lib/observability/metrics";

const SCRIPTS = new Set<Script>(["latin", "ottoman", "ete"]);
const MAX = 20_000;

/** Converts a text between the three alphabets; counted by outcome (README, Metrics: MET-010). */
export async function POST(request: Request) {
  const end = metrics.duration.startTimer({ operation: "convert" });
  const response = await converted(request);
  end();
  const outcome = response.status === 200 ? "ok" : response.status === 413 ? "too_large" : "invalid";
  metrics.operations.inc({ operation: "convert", outcome });
  return response;
}

async function converted(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { text?: unknown; from?: unknown };
  if (typeof body.text !== "string" || !SCRIPTS.has(body.from as Script)) {
    return Response.json({ error: "text and from (latin, ottoman, ete) are needed" }, { status: 400 });
  }
  if (body.text.length > MAX) {
    return Response.json({ error: `En fazla ${MAX} karakter.` }, { status: 413 });
  }
  return Response.json({ tokens: convert(body.text, body.from as Script) });
}
