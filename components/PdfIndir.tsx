"use client";

import { useRef, useState } from "react";

type Kind = "sayfa" | "aralik" | "kitap";

/** "PDF": a dialog of the pages to print, this one, some or the whole book; they open in a new tab
 *  (app/(site)/kitap/[slug]/pdf), whose print dialog saves them as a PDF. */
export function PdfIndir({ slug, labels, page }: { slug: string; labels: string[]; page: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<Kind>("sayfa");
  const [bas, setBas] = useState(page);
  const [son, setSon] = useState(Math.min(labels.length - 1, page + 9));

  const [from, to] = kind === "sayfa" ? [page, page] : kind === "kitap" ? [0, labels.length - 1] : [Math.min(bas, son), Math.max(bas, son)];
  const count = to - from + 1;

  function open() {
    // the range the page is in
    setBas(page);
    setSon(Math.min(labels.length - 1, page + 9));
    dialog.current?.showModal();
  }

  function submit() {
    const query = kind === "kitap" ? "" : `?${new URLSearchParams({ bas: labels[from], son: labels[to] })}`;
    window.open(`/kitap/${slug}/pdf${query}`, "_blank");
  }

  const select = (value: number, set: (i: number) => void, label: string) => (
    <select
      value={value}
      aria-label={label}
      onChange={(e) => {
        set(Number(e.target.value));
        setKind("aralik");
      }}
    >
      {labels.map((l, i) => (
        <option key={i} value={i}>
          {l}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <button type="button" className="dugme" onClick={open} aria-haspopup="dialog">
        PDF
      </button>
      <dialog
        ref={dialog}
        className="ayarlar pdf-indir"
        aria-labelledby="pdf-baslik"
        // a click on the backdrop closes it
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <form method="dialog" onSubmit={submit}>
          <h2 id="pdf-baslik">PDF indir</h2>

          <fieldset>
            <legend>Sayfalar</legend>
            <label>
              <input type="radio" name="sayfalar" checked={kind === "sayfa"} onChange={() => setKind("sayfa")} />
              <span>Bu sayfa ({labels[page]})</span>
            </label>
            <label>
              <input type="radio" name="sayfalar" checked={kind === "aralik"} onChange={() => setKind("aralik")} />
              <span>Sayfa</span>
              {select(bas, setBas, "İlk sayfa")}
              <span>–</span>
              {select(son, setSon, "Son sayfa")}
            </label>
            <label>
              <input type="radio" name="sayfalar" checked={kind === "kitap"} onChange={() => setKind("kitap")} />
              <span>Bütün kitap ({labels.length} sayfa)</span>
            </label>
          </fieldset>

          <p className="aciklama">
            Sayfalar yeni bir sekmede açılır; yazdırma penceresinde hedef olarak “PDF olarak kaydet”i seçin. Şimdi
            gösterilen yazılar basılır.
            {count > 100 && " Çok sayfa hazırlanırken biraz beklemek gerekir."}
          </p>

          <div className="kapat">
            <button className="dugme" type="button" onClick={() => dialog.current?.close()}>
              Vazgeç
            </button>
            <button className="dugme ana" type="submit">
              {count === 1 ? "1 sayfa" : `${count} sayfa`} indir
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
