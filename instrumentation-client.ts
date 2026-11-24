import { readingPage } from "./lib/reading";
import { setRumView, startRum } from "./lib/rum";
import { track } from "./lib/track";

// Runs in the browser before the app is interactive (Next.js instrumentation-client): real user
// monitoring, the pages read and the other page-only funnel steps (README, Metrics).

startRum({ name: "ete", version: process.env.NEXT_PUBLIC_APP_VERSION });
setRumView(location.pathname);
readingPage(location.pathname);

const bookOf = (path: string) => /^\/kitap\/([^/]+)/.exec(path)?.[1];

// Opened from outside (a bookmark, a link): counts unless it comes from the same book (a reload).
const first = bookOf(location.pathname);
if (first && bookOf(document.referrer ? new URL(document.referrer).pathname : "") !== first) track("book_opened");

export function onRouterTransitionStart(url: string) {
  const to = new URL(url, location.origin);
  const book = bookOf(to.pathname);
  if (book && book !== bookOf(location.pathname)) track("book_opened");
  setRumView(to.pathname);
  readingPage(to.pathname);
}
