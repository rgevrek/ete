/** Reads the books and the dictionary when the server starts, not on the first request, and starts the
 *  metrics endpoint on METRICS_PORT (set by the chart, reached by no route; unset locally). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.METRICS_PORT) (await import("./lib/observability/metrics")).serveMetrics(Number(process.env.METRICS_PORT));
    const { library } = await import("./lib/books/library");
    library();
    // the index of the dictionary page
    (await import("./lib/sozluk")).search("");
    (await import("./lib/lugat")).meaningsOf("");
  }
}
