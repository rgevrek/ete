/** Reads the books and the dictionary when the server starts, not on the first request. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { library } = await import("./lib/books/library");
    library();
  }
}
