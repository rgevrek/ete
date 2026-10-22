import { library } from "@/lib/books/library";

/** Ready once the books and the dictionary are read. */
export function GET() {
  const { books } = library();
  return Response.json({ ok: true, books: books.size });
}
