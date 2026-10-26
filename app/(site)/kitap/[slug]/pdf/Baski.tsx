"use client";

import { useEffect, useRef, useState } from "react";

/** The text of the pages to print, fetched from `src` (app/api/baski); when it, its fonts and its
 *  images are there, the print dialog opens. */
export function Baski({ src, className, dir }: { src: string; className: string; dir: "ltr" | "rtl" }) {
  const text = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"yukleniyor" | "hazir" | "hata">("yukleniyor");

  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(String(response.status));
        const html = await response.text();
        if (gone || !text.current) return;
        text.current.innerHTML = html;
        const images = [...text.current.querySelectorAll("img")];
        for (const img of images) img.loading = "eager";
        await Promise.all([document.fonts.ready, ...images.map((img) => img.decode().catch(() => {}))]);
        if (gone) return;
        setState("hazir");
        // after the paint of the text
        requestAnimationFrame(() => setTimeout(() => window.print(), 50));
      } catch {
        if (!gone) setState("hata");
      }
    })();
    return () => {
      gone = true;
    };
  }, [src]);

  return (
    <>
      <div className="araclar baski-durum" role="status">
        {state === "yukleniyor" && <span>Sayfalar hazırlanıyor…</span>}
        {state === "hata" && <span>Sayfalar yüklenemedi.</span>}
        {state === "hazir" && (
          <>
            <span>Yazdırma penceresinde hedef olarak “PDF olarak kaydet”i seçin.</span>
            <button type="button" className="dugme ana" onClick={() => window.print()}>
              Yazdır / PDF kaydet
            </button>
          </>
        )}
      </div>
      <div className={className} dir={dir} ref={text} />
    </>
  );
}
