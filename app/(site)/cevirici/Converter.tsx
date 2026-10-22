"use client";

import { useEffect, useRef, useState } from "react";
import type { Script, Token } from "@/lib/convert";

const SCRIPTS: { id: Script; name: string; example: string }[] = [
  { id: "latin", name: "Latin", example: "Bismillâh her hayrın başıdır." },
  { id: "ottoman", name: "Osmanlıca", example: "بسم الله هر خيرك باشيدر." },
  { id: "ete", name: "ETE", example: "بىِسمىِللآهـ هەر هايرىن باشىدىر." },
];

type Word = Extract<Token, { word: true }>;

function joined(tokens: Token[], script: Script): React.ReactNode[] {
  return tokens.map((t, i) => {
    if (!t.word) return script === "latin" ? t.latin : t.arabic;
    const text = t[script];
    if (text !== null) return <span key={i}>{text}</span>;
    // not known in this alphabet: the word as it was written
    const original = t.latin ?? t.ottoman ?? t.ete ?? "";
    return (
      <span key={i} className="eksik" title="Bilinmiyor">
        {original}
      </span>
    );
  });
}

function plain(tokens: Token[], script: Script): string {
  return tokens
    .map((t) => (t.word ? (t[script] ?? t.latin ?? t.ottoman ?? t.ete ?? "") : script === "latin" ? t.latin : t.arabic))
    .join("");
}

export function Converter() {
  const [from, setFrom] = useState<Script>("latin");
  const [text, setText] = useState(SCRIPTS[0].example);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    const timer = setTimeout(async () => {
      const res = await fetch("/api/cevir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, from }),
      }).catch(() => null);
      if (id !== request.current) return;
      const body = (await res?.json().catch(() => null)) as { tokens?: Token[]; error?: string } | null;
      if (body?.tokens) {
        setTokens(body.tokens);
        setError(null);
      } else setError(body?.error ?? "Çevrilemedi.");
    }, 250);
    return () => clearTimeout(timer);
  }, [text, from]);

  function choose(script: Script) {
    if (script === from) return;
    // the text goes on in the new alphabet
    if (tokens.length) setText(plain(tokens, script));
    setFrom(script);
  }

  const words = tokens.filter((t): t is Word => t.word);
  const missing = (s: Script) => words.filter((w) => w[s] === null).length;

  return (
    <div className="cevirici">
      <div className="kaynak">
        <div role="radiogroup" aria-label="Yazılan" className="secim">
          {SCRIPTS.map((s) => (
            <label key={s.id}>
              <input type="radio" name="from" checked={from === s.id} onChange={() => choose(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
        <textarea
          className={`girdi ${from}`}
          dir={from === "latin" ? "ltr" : "rtl"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          spellCheck={false}
          aria-label="Metin"
        />
        {error && <p className="hata">{error}</p>}
      </div>

      <div className="ciktilar">
        {SCRIPTS.map((s) => (
          <section key={s.id} className={`cikti ${s.id}`}>
            <header>
              <h2>{s.name}</h2>
              {missing(s.id) > 0 && <span className="not">{missing(s.id)} kelime bilinmiyor</span>}
              <button type="button" className="dugme" onClick={() => navigator.clipboard.writeText(plain(tokens, s.id))}>
                Kopyala
              </button>
            </header>
            <p dir={s.id === "latin" ? "ltr" : "rtl"}>{joined(tokens, s.id)}</p>
          </section>
        ))}
      </div>

      <h2>Alt alta</h2>
      <div className={`yazi l o e cok ${from === "latin" ? "" : "sag-sola"}`} dir={from === "latin" ? "ltr" : "rtl"}>
        <div className="p devam">
          {tokens.map((t, i) =>
            t.word ? (
              <span key={i}>
                <span className="w" title={t.alternatives?.length ? `Diğer okunuşlar: ${t.alternatives.join(", ")}` : undefined}>
                  <span className={`l${t.latin === null ? " x" : ""}`}>{t.latin ?? "?"}</span>
                  <span className={`o${t.ottoman === null ? " x" : ""}`}>{t.ottoman ?? t.latin}</span>
                  <span className={`e${t.ete === null ? " x" : ""}`}>{t.ete ?? t.latin}</span>
                </span>
              </span>
            ) : (
              <span key={i}>{from === "latin" ? t.latin : t.arabic}</span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
