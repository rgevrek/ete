import { notFound, redirect } from "next/navigation";
import { book } from "@/lib/books/library";

/** /kitap/sozler?id=13/13 (the links of the books), ?sayfa=273 (the page form), or the first page. */
export default async function BookStart({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string; sayfa?: string }>;
}) {
  const { slug } = await params;
  const { id, sayfa } = await searchParams;
  const b = book(slug);
  if (!b) notFound();
  const at = (i: number, anchor?: string) =>
    `/kitap/${slug}/${encodeURIComponent(b.pages[i].label)}${anchor ? `#${encodeURIComponent(anchor)}` : ""}`;

  if (id !== undefined) {
    const i = b.ids.get(id);
    if (i !== undefined) redirect(at(i, `k-${id}`));
  }
  if (sayfa !== undefined) {
    const wanted = sayfa.trim();
    const exact = b.labels.get(wanted);
    if (exact !== undefined) redirect(at(exact));
    // the nearest printed page
    const n = Number.parseInt(wanted, 10);
    if (Number.isFinite(n)) {
      let best = 0;
      b.pages.forEach((p, i) => {
        const m = Number.parseInt(p.label, 10);
        if (Number.isFinite(m) && Math.abs(m - n) < Math.abs(Number.parseInt(b.pages[best].label, 10) - n)) best = i;
      });
      redirect(at(best));
    }
  }
  redirect(at(0));
}
