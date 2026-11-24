// Metrics, funnel steps and the pages read (README, Metrics).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/events/route";
import { READ_AFTER_MS, isFunnelStep, isReaderPage } from "@/lib/events";
import { metrics } from "@/lib/observability/metrics";

const count = async (step: string) => Number((await metrics.registry.metrics()).match(new RegExp(`ete_funnel_step_total\\{step="${step}"\\} (\\d+)`))?.[1] ?? 0);
const post = (body: unknown, origin = "https://ete.rgevrek.de") =>
  POST(new Request("https://ete.rgevrek.de/api/events", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("funnel steps from the pages", () => {
  it("MET-005-AC1: a page read is counted once per report", async () => {
    const before = await count("page_read");
    expect((await post({ step: "page_read" })).status).toBe(204);
    expect(await count("page_read")).toBe(before + 1);
  });

  it("MET-005-AC2: an unknown step or another origin is refused and counts nothing", async () => {
    expect((await post({ step: "x" })).status).toBe(400);
    expect((await post({ step: "page_read" }, "https://evil.example")).status).toBe(403);
    expect(isFunnelStep("book_opened")).toBe(true);
    expect(await metrics.registry.metrics()).not.toContain('step="x"');
  });

  it("MET-001-AC2: only a book's pages count as reader pages, not its print page", () => {
    expect(isReaderPage("/kitap/sozler/12")).toBe(true);
    expect(isReaderPage("/kitap/sozler")).toBe(false);
    expect(isReaderPage("/kitap/sozler/pdf")).toBe(false);
    expect(isReaderPage("/sozluk")).toBe(false);
  });
});

describe("pages read (MET-001)", () => {
  let visible = true;
  const listeners: (() => void)[] = [];
  const sent: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    sent.length = 0;
    listeners.length = 0;
    visible = true;
    vi.stubGlobal("document", { get visibilityState() { return visible ? "visible" : "hidden"; }, addEventListener: (_: string, f: () => void) => listeners.push(f) });
    vi.stubGlobal("fetch", (_url: string, init: { body: string }) => (sent.push(JSON.parse(init.body).step), Promise.resolve(new Response(null, { status: 204 }))));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const hide = () => ((visible = false), listeners.forEach((f) => f()));
  const show = () => ((visible = true), listeners.forEach((f) => f()));

  it("MET-001-AC1: a book page visible for 10 s counts as read, once", async () => {
    const { readingPage } = await import("@/lib/reading");
    readingPage("/kitap/sozler/12");
    vi.advanceTimersByTime(READ_AFTER_MS - 1);
    expect(sent).toEqual([]);
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(READ_AFTER_MS * 3);
    expect(sent).toEqual(["page_read"]);
  });

  it("MET-001-AC3: time in a background tab doesn't count, and leaving the page earlier counts nothing", async () => {
    const { readingPage } = await import("@/lib/reading");
    readingPage("/kitap/sozler/12");
    vi.advanceTimersByTime(4_000);
    hide();
    vi.advanceTimersByTime(60_000);
    expect(sent).toEqual([]);
    show();
    vi.advanceTimersByTime(5_000);
    readingPage("/sozluk");
    vi.advanceTimersByTime(60_000);
    expect(sent).toEqual([]);
  });
});
