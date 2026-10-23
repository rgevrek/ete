/** Reads the books and the dictionary when the server starts, not on the first request. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { library } = await import("./lib/books/library");
    library();
    // the index of the dictionary page
    (await import("./lib/sozluk")).search("");
    (await import("./lib/lugat")).meaningsOf("");
  }
}
