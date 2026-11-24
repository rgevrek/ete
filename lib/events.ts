// Funnel steps of the north star journey that happen in the page only (README, Metrics: MET-001,
// MET-005): the page reports them with POST /api/events, the server counts them as
// ete_funnel_step_total{step}. A fixed list: anything else is refused.

export const FUNNEL_STEPS = ["book_opened", "page_read"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const isFunnelStep = (value: unknown): value is FunnelStep => FUNNEL_STEPS.includes(value as FunnelStep);

/** How long a book page must be visible to count as read (MET-001). */
export const READ_AFTER_MS = 10_000;

/** A reader page: /kitap/<slug>/<sayfa>. */
export const isReaderPage = (path: string) => /^\/kitap\/[^/]+\/[^/]+\/?$/.test(path) && !path.endsWith("/pdf");
