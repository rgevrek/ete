// The Latin text of the books as tools/osmanlica.py reads it: its words, their lower case and the
// marks of the Arabic letters.

const LETTER = "[A-Za-zÀ-ɏ\\u0307]";
/** A word: letters, joined by apostrophes and hyphens ("Kur’ân’ın", "Risale-i", "a’mal-i"). */
export const WORD_SOURCE = `${LETTER}+(?:(?:[’'‘]-?|-)${LETTER}+)*`;
export const WORD = new RegExp(WORD_SOURCE, "gu");

const DIGITS: Record<string, string> = Object.fromEntries(
  [..."0123456789"].map((d, i) => [d, String.fromCharCode(0x0660 + i)]),
);
const MARKS: Record<string, string> = { ",": "،", "?": "؟", ";": "؛" };

/** Turkish lower case, the apostrophes as ’. */
export function lower(word: string): string {
  return word
    .replaceAll("I", "ı")
    .replaceAll("İ", "i")
    .toLowerCase()
    .replaceAll("i̇", "i")
    .replace(/['‘]/g, "’");
}

/** `text` with Arabic digits and the Arabic comma, question mark and semicolon. */
export function marks(text: string): string {
  return text.replace(/[0-9,?;]/g, (c) => DIGITS[c] ?? MARKS[c] ?? c);
}

const LATIN_DIGITS: Record<string, string> = Object.fromEntries(
  Object.entries(DIGITS).map(([l, a]) => [a, l]),
);
const LATIN_MARKS: Record<string, string> = Object.fromEntries(
  Object.entries(MARKS).map(([l, a]) => [a, l]),
);

/** The other way: Latin digits and marks for the Arabic ones (also the Persian digits). */
export function latinMarks(text: string): string {
  return text.replace(/[٠-٩۰-۹،؟؛]/g, (c) => {
    const code = c.charCodeAt(0);
    if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
    return LATIN_DIGITS[c] ?? LATIN_MARKS[c] ?? c;
  });
}

/** Splits `text` into words and what is between them, in order. */
export function splitWords(text: string): { word: boolean; text: string }[] {
  const out: { word: boolean; text: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (m.index > last) out.push({ word: false, text: text.slice(last, m.index) });
    out.push({ word: true, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ word: false, text: text.slice(last) });
  return out;
}
