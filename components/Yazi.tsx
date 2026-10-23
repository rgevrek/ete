"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AYAR_EVENT, type Ayar } from "@/lib/ayar";
import { ALPHABETS, rightToLeft, shownValue, YAZI_COOKIE, yaziClass, type Alphabet, type Shown } from "@/lib/yazi";

const NAMES: Record<Alphabet, { name: string; sample: string }> = {
  l: { name: "Latin", sample: "" },
  o: { name: "Osmanlıca", sample: "عثمانلى" },
  e: { name: "ETE", sample: "أتە" },
};

const SIZES = [1.3, 1.45, 1.6, 1.8, 2.05];
const SIZE_KEY = "ete_olcek";

/** The text with the chosen alphabets, and the bar to choose them (with `tools` beside). */
export function Yazi({
  initial,
  ayar,
  tools,
  children,
}: {
  initial: Shown;
  ayar: Ayar;
  tools?: ReactNode;
  children: ReactNode;
}) {
  const [shown, setShown] = useState(initial);
  const [yon, setYon] = useState(ayar.yon);
  const [koken, setKoken] = useState(ayar.koken);
  const [size, setSize] = useState(2);

  useEffect(() => {
    const stored = Number(localStorage.getItem(SIZE_KEY));
    if (stored >= 0 && stored < SIZES.length) setSize(stored);
    const onAyar = (e: Event) => {
      const next = (e as CustomEvent<Ayar>).detail;
      setYon(next.yon);
      setKoken(next.koken);
    };
    window.addEventListener(AYAR_EVENT, onAyar);
    return () => window.removeEventListener(AYAR_EVENT, onAyar);
  }, []);

  function toggle(a: Alphabet) {
    const next = { ...shown, [a]: !shown[a] };
    // one at least
    if (!ALPHABETS.some((x) => next[x])) return;
    setShown(next);
    document.cookie = `${YAZI_COOKIE}=${shownValue(next)}; path=/; max-age=31536000; samesite=lax`;
  }

  function resize(step: number) {
    const next = Math.min(SIZES.length - 1, Math.max(0, size + step));
    setSize(next);
    localStorage.setItem(SIZE_KEY, String(next));
  }

  return (
    <>
      <div className="araclar">
        <fieldset>
          <legend>Yazılar</legend>
          {ALPHABETS.map((a) => (
            <label key={a}>
              <input type="checkbox" checked={shown[a]} onChange={() => toggle(a)} />
              {NAMES[a].name}
              {NAMES[a].sample && <span className={`ornek ${a}`}>{NAMES[a].sample}</span>}
            </label>
          ))}
        </fieldset>
        <span className="olcek">
          <button type="button" className="dugme" onClick={() => resize(-1)} aria-label="Yazıyı küçült">
            A−
          </button>
          <button type="button" className="dugme" onClick={() => resize(1)} aria-label="Yazıyı büyüt">
            A+
          </button>
        </span>
        {tools}
        {koken && shown.l && (
          <p className="koken-renkler" aria-label="Kelime kökenleri">
            <span className="ka">Arapça</span> <span className="kf">Farsça</span> <span className="kt">Türkçe</span>{" "}
            <span className="kb">Latince/Fransızca</span>
          </p>
        )}
      </div>
      <div
        className={`${yaziClass(shown, yon)}${koken ? " koken" : ""}`}
        dir={rightToLeft(shown, yon) ? "rtl" : "ltr"}
        style={{ "--olcek": SIZES[size] } as React.CSSProperties}
      >
        {children}
      </div>
    </>
  );
}
