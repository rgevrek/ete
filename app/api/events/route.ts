import { isFunnelStep } from "@/lib/events";
import { metrics } from "@/lib/observability/metrics";

/** A funnel step reached in the page (README, Metrics): `{ step }` from FUNNEL_STEPS, counted, nothing
 *  stored. Signed in (proxy.ts), same origin only. */
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "origin" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { step?: unknown } | null;
  if (!isFunnelStep(body?.step)) return Response.json({ error: "step" }, { status: 400 });
  metrics.funnel.inc({ step: body.step });
  return new Response(null, { status: 204 });
}
