import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageKeys } from "@/components/PageKeys";
import { href, trail } from "@/components/Toc";
import { TocMark } from "@/components/TocMark";
import { Yazi } from "@/components/Yazi";
import { book, library } from "@/lib/books/library";
import { renderPage, writer } from "@/lib/books/render";
import { parseShown, YAZI_COOKIE } from "@/lib/yazi";

type Params = { params: Promise<{ slug: string; sayfa: string }> };

function find(slug: string, sayfa: string) {
  const b = book(slug);
  if (!b) return null;
  const index = b.labels.get(sayfa) ?? b.labels.get(decodeURIComponent(sayfa));
  return index === undefined ? null : { b, index };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, sayfa } = await params;
  const found = find(slug, sayfa);
  return { title: found ? `${found.b.title}, ${found.b.pages[found.index].label}` : "Sayfa yok" };
}

export default async function BookPage({ params }: Params) {
  const { slug, sayfa } = await params;
  const found = find(slug, sayfa);
  if (!found) notFound();
  const { b, index } = found;
  const page = b.pages[index];
  const html = renderPage(page.html, writer(library().known));
  const shown = parseShown((await cookies()).get(YAZI_COOKIE)?.value);
  const link = (i: number) => `/kitap/${slug}/${encodeURIComponent(b.pages[i].label)}`;
  const prev = index > 0 ? link(index - 1) : undefined;
  const next = index < b.pages.length - 1 ? link(index + 1) : undefined;

  const nav = (
    <div className="gezinti">
      <Link className="dugme" href={prev ?? "#"} aria-disabled={!prev} aria-label="Önceki sayfa">
        ‹
      </Link>
      <form action={`/kitap/${slug}`}>
        <input name="sayfa" defaultValue={page.label} aria-label="Sayfa" inputMode="numeric" />
        <span className="toplam">/ {b.pages.at(-1)!.label}</span>
      </form>
      <Link className="dugme" href={next ?? "#"} aria-disabled={!next} aria-label="Sonraki sayfa">
        ›
      </Link>
    </div>
  );

  return (
    <>
      <main>
        <p className="yol">
          <Link href="/">Kitaplar</Link> › <Link href={`/kitap/${slug}`}>{b.title}</Link>
          {trail(b.toc, index).map((e) => (
            <span key={e.anchor}>
              {" › "}
              <Link href={href(b, e)}>{e.label}</Link>
            </span>
          ))}
        </p>
        <Yazi initial={shown} tools={nav}>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </Yazi>
        <p className="sayfa-no">
          {b.title} · sayfa {page.label}
        </p>
      </main>
      <PageKeys prev={prev} next={next} />
      <TocMark page={index} />
    </>
  );
}
