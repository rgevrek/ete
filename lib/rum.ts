import { faro, getWebInstrumentations, initializeFaro, type TransportItem } from "@grafana/faro-web-sdk";

// Real user monitoring (README, Metrics: MET-020): the Faro Web SDK reports errors, web vitals, page views
// and frustration signals (rage, dead and error clicks) to /rum/collect on this host, which the platform
// routes to its own collector (Alloy → Loki, Prometheus). No third party, no cookies, no user id; URLs
// lose their query and fragment; console output isn't sent. Off on localhost.

const stripUrl = (url: string) => url.replace(/[?#].*$/, "");

function scrub(item: TransportItem): TransportItem {
  if (item.meta.page?.url) item.meta.page = { ...item.meta.page, url: stripUrl(item.meta.page.url) };
  const attributes = (item.payload as { attributes?: Record<string, string> }).attributes;
  for (const key of Object.keys(attributes ?? {})) if (/url$/i.test(key)) attributes![key] = stripUrl(attributes![key]);
  return item;
}

// Faro's `faro.api` is a no-op API before initializing, so it can't tell whether we started.
let started = false;

export function startRum(app: { name: string; version?: string }): void {
  if (started || ["localhost", "127.0.0.1"].includes(location.hostname)) return;
  started = true;
  initializeFaro({
    url: `${location.origin}/rum/collect`,
    app: { ...app, environment: "production" },
    instrumentations: getWebInstrumentations({ captureConsole: false }),
    trackResources: false,
    sessionTracking: { persistent: false },
    beforeSend: scrub,
  });
}

/** The view is the first path segment ("/kitap"), never the path with its ids. */
export const setRumView = (path: string) => faro.api?.setView({ name: `/${path.split("/")[1] ?? ""}` });
