import type { Metadata } from "next";
import Link from "next/link";
import { search } from "@/lib/sozluk";
import "./sozluk.css";

export const metadata: Metadata = { title: "Sözlük" };

const PER_PAGE = 100;

export default async function Dictionary({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sayfa?: string; tur?: string }>;
}) {
  const { q = "", sayfa = "1", tur } = await searchParams;
  const onlyWords = tur === "sozluk";
  const page = Math.max(1, Number.parseInt(sayfa, 10) || 1);
  const result = search(q, { derived: !onlyWords, offset: (page - 1) * PER_PAGE, limit: PER_PAGE });
  const pages = Math.max(1, Math.ceil(result.total / PER_PAGE));
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (onlyWords) params.set("tur", "sozluk");
    if (p > 1) params.set("sayfa", String(p));
    const s = params.toString();
    return `/sozluk${s ? `?${s}` : ""}`;
  };

  return (
    <main className="sayfa sozluk">
      <h1>Sözlük</h1>
      <p className="aciklama">
        Osmanlıca–Latin: Risale-i Nur sözlüğünün {result.words.toLocaleString("tr")} kelimesi ve onlardan türetilen{" "}
        {result.derived.toLocaleString("tr")} şekil (kitaplarda geçen), ETE yazılışlarıyla. Latin, Osmanlıca veya ETE
        harfleriyle arayın.
      </p>
      <form className="arama" action="/sozluk">
        <input
          name="q"
          defaultValue={q}
          placeholder="kelime, كلمه, كەلىِمە"
          aria-label="Ara"
          dir="auto"
          autoFocus
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

      <p className="sonuc">
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
            {result.entries.map((e) => (
              <tr key={e.latin} className={e.derived ? "turetilen" : undefined}>
                <td className="l">
                  {e.latin}
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
            ))}
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
