import Link from "next/link";
import { library, SLUGS } from "@/lib/books/library";
import { ete } from "@/lib/script/ete";
import { lower, WORD } from "@/lib/script/latin";
import { ottoman } from "@/lib/script/ottoman";

export const dynamic = "force-dynamic";

/** A title in another alphabet, word by word; the words not known stay as they are. */
function write(title: string, by: (form: string) => string | null): string {
  return title.replace(WORD, (w) => by(lower(w)) ?? w);
}

export default function Books() {
  const { books, known } = library();
  return (
    <main className="sayfa">
      <h1>Risale-i Nur Külliyatı</h1>
      <p style={{ color: "var(--soluk)", marginTop: 0 }}>
        Kitaplar sayfa sayfa; her kelime Latin, Osmanlıca ve ETE (Esas Türk Elifbası) harfleriyle, alt alta.
      </p>
      <ul className="kitaplar">
        {SLUGS.map((slug) => {
          const b = books.get(slug)!;
          return (
            <li key={slug}>
              <Link href={`/kitap/${slug}`}>
                <span className="ad">{b.title}</span>
                <span className="osm">{write(b.title, (f) => ottoman(f, known))}</span>
                <span className="ete">{write(b.title, (f) => ete(f))}</span>
                <span className="bilgi">
                  {b.pages.length} sayfa{b.toc.length ? ` · ${b.toc.length} başlık` : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
