import { READ_AFTER_MS, isReaderPage } from "./events";
import { track } from "./track";

// The north star (README, Metrics: MET-001): a book page counts as read once it has been visible for
// READ_AFTER_MS in all, in a tab in the foreground; switching tabs pauses the clock.

let timer: ReturnType<typeof setTimeout> | undefined;
let left = 0;
let since = 0;

function start() {
  if (timer || left <= 0 || document.visibilityState !== "visible") return;
  since = Date.now();
  timer = setTimeout(() => {
    timer = undefined;
    left = 0;
    track("page_read");
  }, left);
}

function pause() {
  if (!timer) return;
  clearTimeout(timer);
  timer = undefined;
  left -= Date.now() - since;
}

/** Call on every page shown (first load, each navigation). */
export function readingPage(path: string): void {
  pause();
  left = isReaderPage(path) ? READ_AFTER_MS : 0;
  start();
}

if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => (document.visibilityState === "visible" ? start() : pause()));
