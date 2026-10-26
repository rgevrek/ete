import type { NextRequest } from "next/server";
import { pageRange, printedPages } from "@/lib/books/baski";
import { book, library } from "@/lib/books/library";
import { writer } from "@/lib/books/render";

/** The pages ?bas= to ?son= (labels) of a book for print, the whole book without them: HTML that
 *  the print page (app/(site)/kitap/[slug]/pdf) puts in its text. Fetched, not in the page, for the
 *  whole book is tens of megabytes. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const b = book(slug);
  if (!b) return new Response("Kitap yok", { status: 404 });
  const { searchParams } = request.nextUrl;
  const range = pageRange(b, searchParams.get("bas"), searchParams.get("son"));
  if (!range) return new Response("Sayfa yok", { status: 404 });
  return new Response(printedPages(b, range[0], range[1], writer(library().known)), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, max-age=3600" },
  });
}
