// How many sign-in links an address and a client get: a few per quarter hour, in memory.

const WINDOW_MS = 15 * 60 * 1000;
const hits = new Map<string, number[]>();

/** Counts a request of `key`; false when it had `max` in the window already. */
export function take(key: string, max: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, ts] of hits) if (ts.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return true;
}
