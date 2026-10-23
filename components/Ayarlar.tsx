"use client";

import { useRef, useState } from "react";
import { AYAR_COOKIE, AYAR_EVENT, ayarValue, fontClass, type Ayar } from "@/lib/ayar";

/** The settings: a button that opens a dialog of the preferences, applied at once. */
export function Ayarlar({ initial }: { initial: Ayar }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [ayar, setAyar] = useState(initial);

  function change(next: Ayar) {
    setAyar(next);
    document.cookie = `${AYAR_COOKIE}=${ayarValue(next)}; path=/; max-age=31536000; samesite=lax`;
    document.body.classList.remove(fontClass(ayar));
    document.body.classList.add(fontClass(next));
    window.dispatchEvent(new CustomEvent(AYAR_EVENT, { detail: next }));
  }

  return (
    <>
      <button type="button" className="dugme" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        Ayarlar
      </button>
      <dialog
        ref={dialog}
        className="ayarlar"
        aria-labelledby="ayarlar-baslik"
        // a click on the backdrop closes it
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <form method="dialog">
          <h2 id="ayarlar-baslik">Ayarlar</h2>

          <fieldset>
            <legend>Osmanlıca yazı tipi</legend>
            <label>
              <input
                type="radio"
                name="osmanlica"
                checked={ayar.osmanlica === "husrev"}
                onChange={() => change({ ...ayar, osmanlica: "husrev" })}
              />
              <span>Hüsrev</span>
              <span className="onizleme husrev" lang="ota" dir="rtl">رسالۀ نور</span>
            </label>
            <label>
              <input
                type="radio"
                name="osmanlica"
                checked={ayar.osmanlica === "seherazade"}
                onChange={() => change({ ...ayar, osmanlica: "seherazade" })}
              />
              <span>Seherazade</span>
              <span className="onizleme seherazade" lang="ota" dir="rtl">رسالۀ نور</span>
            </label>
          </fieldset>

          <fieldset>
            <legend>Satır yönü</legend>
            <p className="aciklama">Latin ile birlikte Osmanlıca veya ETE gösterilirken.</p>
            <label>
              <input type="radio" name="yon" checked={ayar.yon === "ltr"} onChange={() => change({ ...ayar, yon: "ltr" })} />
              <span>Soldan sağa: Latin önde</span>
            </label>
            <label>
              <input type="radio" name="yon" checked={ayar.yon === "rtl"} onChange={() => change({ ...ayar, yon: "rtl" })} />
              <span>Sağdan sola: Osmanlıca ve ETE önde</span>
            </label>
          </fieldset>

          <fieldset>
            <legend>Kelime kökenleri</legend>
            <label>
              <input type="checkbox" checked={ayar.koken} onChange={() => change({ ...ayar, koken: !ayar.koken })} />
              <span>Latin kelimeleri kökenlerine göre renklendir</span>
            </label>
            <p className="aciklama koken-renkler">
              <span className="ka">Arapça</span> <span className="kf">Farsça</span> <span className="kt">Türkçe</span>{" "}
              <span className="kb">Latince/Fransızca</span>
            </p>
          </fieldset>

          <div className="kapat">
            <button className="dugme ana" type="submit">
              Tamam
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
