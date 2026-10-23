import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { library } from "@/lib/books/library";
import { meaningsOf, type Meaning } from "@/lib/lugat";
import { origin, type Origin } from "@/lib/script/koken";
import { LATIN_LETTERS, OTTOMAN_LETTERS, search } from "@/lib/sozluk";
import "./sozluk.css";

export const metadata: Metadata = { title: "Sözlük" };

const PER_PAGE = 100;
/** meanings shown at once, the others behind "daha fazla" */
const SHOWN = 2;
/** pages of a word linked */
const PAGES = 5;

const ORIGIN: Record<Origin, { name: string; cls: string }> = {
  arapca: { name: "Arapça", cls: "ka" },
  farsca: { name: "Farsça", cls: "kf" },
  turkce: { name: "Türkçe", cls: "kt" },
  bati: { name: "Latince/Fransızca", cls: "kb" },
};

type Params = { q?: string; sayfa?: string; tur?: string; harf?: string };

function Anlam({ form, meanings }: { form: string; meanings: Meaning[] }) {
  const { books } = library();
  return (
    <div className="anlamlar">
      {meanings.map((m) => (
        <div key={m.word} className="anlam">
          {m.word.toLocaleLowerCase("tr") !== form && <span className="kok">{m.word}: </span>}
          {m.meanings.slice(0, SHOWN).join("; ")}
          {m.meanings.length > SHOWN && (
            <details>
              <summary>daha fazla ({m.meanings.length - SHOWN})</summary>
              {m.meanings.slice(SHOWN).join("; ")}
            </details>
          )}
          {m.pages.length > 0 && (
            <span className="yerler">
              {m.pages.slice(0, PAGES).map((p, i) => (
                <Fragment key={`${p.book}:${p.page}:${i}`}>
                  {i > 0 && " · "}
                  <Link href={`/kitap/${p.book}?sayfa=${encodeURIComponent(p.page)}`}>
                    {books.get(p.book)?.title ?? p.book} {p.page}
                  </Link>
                </Fragment>
              ))}
              {m.pageCount > PAGES && ` · … ${m.pageCount} sayfada`}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default async function Dictionary({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", sayfa = "1", tur, harf = "" } = await searchParams;
  const { known } = library();
  const onlyWords = tur === "sozluk";
  const letter = q ? "" : harf;
  const page = Math.max(1, Number.parseInt(sayfa, 10) || 1);
  const result = search(q, { derived: !onlyWords, offset: (page - 1) * PER_PAGE, limit: PER_PAGE, letter });
  const pages = Math.max(1, Math.ceil(result.total / PER_PAGE));
  const link = (p: number, l = letter) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (l) params.set("harf", l);
    if (onlyWords) params.set("tur", "sozluk");
    if (p > 1) params.set("sayfa", String(p));
    const s = params.toString();
    return `/sozluk${s ? `?${s}` : ""}`;
  };
  const letterLink = (l: string) => {
    const params = new URLSearchParams({ harf: l });
    if (onlyWords) params.set("tur", "sozluk");
    return `/sozluk?${params}`;
  };

  return (
    <main className="sayfa sozluk">
      <h1>Sözlük</h1>
      <p className="aciklama">
        Osmanlıca–Latin: Risale-i Nur sözlüğünün {result.words.toLocaleString("tr")} kelimesi ve onlardan türetilen{" "}
        {result.derived.toLocaleString("tr")} şekil (kitaplarda geçen), ETE yazılışları ve lügat mânâlarıyla. Latin,
        Osmanlıca veya ETE harfleriyle arayın.
      </p>
      <form className="arama" action="/sozluk">
        <input
          name="q"
          defaultValue={q}
          placeholder="kelime, كلمه, كەلىِمە"
          aria-label="Ara"
          dir="auto"
          spellCheck={false}
        />
        <label>
          <input type="checkbox" name="tur" value="sozluk" defaultChecked={onlyWords} />
          yalnız sözlükteki kelimeler
        </label>
        <button className="dugme ana" type="submit">
          Ara
        </button>
      </form>

      <nav className="harfler-latin" aria-label="Latin harfleri">
        {LATIN_LETTERS.map((l) => (
          <Link key={l} href={letterLink(l)} aria-current={letter === l ? "page" : undefined}>
            {l.toLocaleUpperCase("tr")}
          </Link>
        ))}
      </nav>
      <nav className="harfler-osmanli" aria-label="Osmanlıca harfler" dir="rtl">
        {OTTOMAN_LETTERS.map((l) => (
          <Link key={l} href={letterLink(l)} aria-current={letter === l ? "page" : undefined}>
            {l}
          </Link>
        ))}
      </nav>

      <p className="sonuc">
        {letter && <strong className="secili">{LATIN_LETTERS.includes(letter) ? letter.toLocaleUpperCase("tr") : letter} </strong>}
        {result.total.toLocaleString("tr")} kelime
        {pages > 1 && ` · sayfa ${page} / ${pages.toLocaleString("tr")}`}
      </p>

      {result.entries.length ? (
        <table>
          <thead>
            <tr>
              <th>Latin</th>
              <th>Osmanlıca</th>
              <th>ETE</th>
              <th className="sayi">
                <span className="uzun">Kitaplarda</span>
                <span className="kisa">Adet</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {result.entries.map((e) => {
              // only the words the lügat has, as a word or as one of its forms
              const meanings = meaningsOf(e.latin);
              return (
                <Fragment key={e.latin}>
                  <tr className={`${e.derived ? "turetilen" : ""}${meanings.length ? " anlamli" : ""}`}>
                    <td className="l">
                      {e.latin}
                      {(() => {
                        const o = origin(e.latin, (f) => known.get(f));
                        return o ? (
                          <span className={`koken ${ORIGIN[o].cls}`} title={`Kök: ${ORIGIN[o].name} (Vikisözlük)`}>
                            {ORIGIN[o].name}
                          </span>
                        ) : null;
                      })()}
                      {e.derived && (
                        <span className="etiket" title="Sözlükte yok, kitaplardaki şekliyle bir kökten türetildi">
                          türetilmiş
                        </span>
                      )}
                    </td>
                    <td className="o" lang="ota" dir="rtl">
                      {e.ottoman}
                    </td>
                    <td className="e" lang="tr-Arab" dir="rtl">
                      {e.ete ?? "–"}
                    </td>
                    <td className="sayi">{e.count ? e.count.toLocaleString("tr") : ""}</td>
                  </tr>
                  {meanings.length > 0 && (
                    <tr className="anlam-satiri">
                      <td colSpan={4}>
                        <Anlam form={e.latin} meanings={meanings} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="bos">Bulunamadı.</p>
      )}

      {pages > 1 && (
        <nav className="sayfalar" aria-label="Sayfalar">
          <Link className="dugme" href={link(page - 1)} aria-disabled={page <= 1}>
            ‹ Önceki
          </Link>
          <Link className="dugme" href={link(page + 1)} aria-disabled={page >= pages}>
            Sonraki ›
          </Link>
        </nav>
      )}
    </main>
  );
}
