import type { FunnelStep } from "./events";

/** Reports a funnel step reached in the page (README, Metrics: MET-005); fire and forget, never in the way. */
export function track(step: FunnelStep): void {
  fetch("/api/events", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ step }) }).catch(() => undefined);
}
