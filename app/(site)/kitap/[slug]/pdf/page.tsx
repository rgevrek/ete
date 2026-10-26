import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageRange, sheetName } from "@/lib/books/baski";
import { book } from "@/lib/books/library";
import { AYAR_COOKIE, parseAyar } from "@/lib/ayar";
import { parseShown, rightToLeft, yaziClass, YAZI_COOKIE } from "@/lib/yazi";
import { Baski } from "./Baski";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bas?: string; son?: string }>;
};

async function find({ params, searchParams }: Props) {
  const { slug } = await params;
  const { bas, son } = await searchParams;
  const b = book(slug);
  const range = b && pageRange(b, bas ?? null, son ?? null);
  return b && range ? { b, from: range[0], to: range[1] } : null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const found = await find(props);
  if (!found) return { title: "Sayfa yok" };
  const { b, from, to } = found;
  return { title: from === to ? `${b.title}, ${b.pages[from].label}` : `${b.title}, ${b.pages[from].label}–${b.pages[to].label}` };
}

/** /kitap/sozler/pdf?bas=12&son=40: the pages for print, in the alphabets shown; the whole book
 *  without ?bas and ?son. Every page of the book begins a sheet, its headline and its page above
 *  it (lib/books/baski.ts). */
export default async function PrintPage(props: Props) {
  const found = await find(props);
  if (!found) notFound();
  const { b, from, to } = found;
  const { bas, son } = await props.searchParams;
  const jar = await cookies();
  const shown = parseShown(jar.get(YAZI_COOKIE)?.value);
  const ayar = parseAyar(jar.get(AYAR_COOKIE)?.value);
  const query = new URLSearchParams();
  if (bas) query.set("bas", b.pages[from].label);
  if (son) query.set("son", b.pages[to].label);
  const pages = from === to ? `sayfa ${b.pages[from].label}` : `sayfa ${b.pages[from].label}–${b.pages[to].label}`;

  return (
    // the header on the first sheet of the first page
    <main style={{ page: sheetName(from) }}>
      <p className="yol">
        <Link href="/">Kitaplar</Link> › <Link href={`/kitap/${b.slug}/${encodeURIComponent(b.pages[from].label)}`}>{b.title}</Link> ›
        PDF, {pages}
      </p>
      <header className="baski">
        <p className="kitap">
          {b.title}
          <span>{pages}</span>
        </p>
      </header>
      <Baski
        src={`/api/baski/${b.slug}${query.size ? `?${query}` : ""}`}
        className={`${yaziClass(shown, ayar.yon)}${ayar.koken ? " koken" : ""}`}
        dir={rightToLeft(shown, ayar.yon) ? "rtl" : "ltr"}
      />
    </main>
  );
}
