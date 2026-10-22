// The converter: a text in one of the three alphabets in all three. Latin is the hub: ETE and
// Latin map one to one (lib/script/ete.ts), the Ottoman of a Latin word is the dictionary's or
// derived from it, the Latin of an Ottoman word the most frequent form of the books written so.

import { deriveNew, library } from "./books/library";
import { ete, eteToLatin } from "./script/ete";
import { latinMarks, lower, marks, splitWords } from "./script/latin";
import { ottoman, ottomanKey } from "./script/ottoman";

export type Script = "latin" | "ottoman" | "ete";

export type Token =
  | { word: false; latin: string; arabic: string }
  | {
      word: true;
      latin: string | null;
      ottoman: string | null;
      ete: string | null;
      /** other Latin forms of an Ottoman word */
      alternatives?: string[];
    };

/** A word of the Arabic letters (also ETE's ە ۇ ۆ and the marks), the ZWNJ within it. */
const ARABIC_WORD = /[\u0621-\u065F\u0670-\u06D3\u06D5-\u06ED\u200C]+/gu;

type Word = Extract<Token, { word: true }>;

function fromLatinWord(word: string): Word {
  const form = lower(word);
  return { word: true, latin: word, ottoman: ottoman(form, library().known, deriveNew), ete: ete(form) };
}

function splitArabic(text: string): { word: boolean; text: string }[] {
  const out: { word: boolean; text: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(ARABIC_WORD)) {
    if (m.index > last) out.push({ word: false, text: text.slice(last, m.index) });
    out.push({ word: true, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ word: false, text: text.slice(last) });
  return out;
}

export function convert(text: string, from: Script): Token[] {
  if (from === "latin") {
    return splitWords(text).map((p) =>
      p.word ? fromLatinWord(p.text) : { word: false, latin: p.text, arabic: marks(p.text) },
    );
  }
  const { latinOf } = library();
  const parts = splitArabic(text);
  const out: Token[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p.word) {
      out.push({ word: false, latin: latinMarks(p.text), arabic: p.text });
      continue;
    }
    if (from === "ete") {
      const latin = eteToLatin(p.text);
      out.push(latin === null ? { word: true, latin: null, ottoman: null, ete: p.text } : { ...fromLatinWord(latin), ete: p.text });
      continue;
    }
    // an Ottoman spelling of two or three words ("bismillâh" بسم الله), the longest first
    let n = 1;
    let forms = latinOf.get(ottomanKey(p.text));
    for (const words of [3, 2]) {
      const group = parts.slice(i, i + 2 * words - 1);
      if (group.length < 2 * words - 1 || group.some((g, j) => (j % 2 ? g.text !== " " : !g.word))) continue;
      const found = latinOf.get(ottomanKey(group.map((g) => g.text).join("")));
      if (found) {
        [n, forms] = [words, found];
        break;
      }
    }
    const written = parts.slice(i, i + 2 * n - 1).map((g) => g.text).join("");
    i += 2 * (n - 1);
    const [latin, ...alternatives] = forms ?? [];
    if (!latin) out.push({ word: true, latin: null, ottoman: written, ete: null });
    else out.push({ word: true, latin, ottoman: written, ete: ete(latin), alternatives: alternatives.slice(0, 8) });
  }
  return out;
}
