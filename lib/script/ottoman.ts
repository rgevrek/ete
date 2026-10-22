// The Ottoman spelling, as tools/osmanlica.py writes it: a word form of the books is looked up in
// data/sozluk.tsv (written by tools/osmanlica/KILAVUZ.md); a form missing there is derived from a
// shorter form and an ending, whose spelling after a consonant, ا و ى or ه is learned from the
// pairs of the dictionary ("hakikat" حقيقت, "hakikatlerini" حقيقتلرينى: "lerini" is لرينى after a
// consonant), taken when at least 3 pairs and 3 of 4 have it. Else a form is written by its
// hyphenated parts ("harb-i" + "umumîden"). No letter by letter map: what is neither stays Latin.

import { lower } from "./latin";

export const ZWNJ = "‌";

type Kind = "h" | "v" | "c";
type Spelling = { drop: boolean; ending: string };
export type Rules = Map<string, Spelling>;

export function parseDictionary(tsv: string): Map<string, string> {
  const words = new Map<string, string>();
  for (const line of tsv.split("\n")) {
    if (!line.includes("\t") || line.startsWith("#")) continue;
    const [latin, ottoman] = line.split("\t");
    words.set(lower(latin), ottoman.trim());
  }
  return words;
}

/** The end of an Ottoman word an ending's spelling depends on: ه, a long vowel letter or else. */
function kind(ottoman: string): Kind {
  const o = ottoman.replaceAll(ZWNJ, "");
  return o.endsWith("ه") ? "h" : /[اوى]$/.test(o) ? "v" : "c";
}

/** `out` after its first `n` letters, the ZWNJs not counted; without one at the start. */
function after(out: string, n: number): string {
  let i = 0;
  while (n) {
    if (out[i] !== ZWNJ) n--;
    i++;
  }
  return out.slice(i).replace(/^‌+/, "");
}

const key = (ending: string, k: Kind) => `${ending}\u0000${k}`;

/** The endings learned from the forms of `words` that extend another. */
export function endings(words: Map<string, string>): Rules {
  const seen = new Map<string, Map<string, number>>();
  for (const [form, out] of words) {
    const whole = out.replaceAll(ZWNJ, "");
    for (let i = 2; i < form.length - 1; i++) {
      const base = form.slice(0, i);
      const baseOut = words.get(base);
      if (baseOut === undefined || form.length - i > 9) continue;
      const k = kind(baseOut);
      const stem = baseOut.replaceAll(ZWNJ, "");
      let spelling: string;
      if (whole.startsWith(stem)) spelling = "0" + after(out, stem.length);
      else if (k === "h" && whole.startsWith(stem.slice(0, -1)))
        spelling = "1" + after(out, stem.length - 1);
      else continue;
      const id = key(form.slice(i), k);
      let count = seen.get(id);
      if (!count) seen.set(id, (count = new Map()));
      count.set(spelling, (count.get(spelling) ?? 0) + 1);
    }
  }
  const rules: Rules = new Map();
  for (const [id, count] of seen) {
    // the most common spelling, the first seen of equally common ones
    let best = "";
    let n = 0;
    let total = 0;
    for (const [spelling, c] of count) {
      total += c;
      if (c > n) [best, n] = [spelling, c];
    }
    if (n >= 3 && n * 4 >= total * 3) rules.set(id, { drop: best[0] === "1", ending: best.slice(1) });
  }
  return rules;
}

function join(base: string, { drop, ending }: Spelling, around: string): string {
  // the possessive ى before the pronominal n is not written: "budağı" بوداغى, "budağından" بوداغندن
  if (/[sğ][ıiuü]n/.test(around) && base.endsWith("ى") && ending.startsWith("ن")) {
    base = base.slice(0, -1);
  }
  if (drop) return base.replace(/‌+$/, "").slice(0, -1) + ending;
  return base + (kind(base) === "h" && ending ? ZWNJ : "") + ending;
}

/** Whether `base` is a genitive that takes no `ending`: "abdin" عبدك + "den" is no "abdinden",
 *  but "onun" + "dur" is "onundur" انكدر, "onun" + "ki" "onunki". */
function genitive(base: string, ottoman: string, ending: string): boolean {
  return /[ıiuü]n$/.test(base) && ottoman.endsWith("ك") && !/^(?:[dt][ıiuü]r|ki)/.test(ending);
}

/** The Ottoman of `form` from the shortest base of three letters at least in `known` that has a
 *  learned ending: "abd" + "inden", not "abdin" + "den". */
export function deriveOne(form: string, known: Map<string, string>, rules: Rules): string | null {
  for (let i = 3; i < form.length; i++) {
    const base = form.slice(0, i);
    const baseOut = known.get(base);
    if (baseOut === undefined || genitive(base, baseOut, form.slice(i))) continue;
    const spelling = rules.get(key(form.slice(i), kind(baseOut)));
    if (spelling) return join(baseOut, spelling, form.slice(base.length - 2, base.length + 1));
  }
  return null;
}

/** `words` with the `forms` not in it that a shorter form and an ending give, the shorter derived
 *  first, so that they are bases of the longer ones. */
export function derive(
  words: Map<string, string>,
  forms: Iterable<string>,
  rules: Rules,
): Map<string, string> {
  const known = new Map(words);
  const todo = [...forms].filter((f) => !words.has(f)).sort((a, b) => a.length - b.length);
  for (const form of todo) {
    const out = deriveOne(form, known, rules);
    if (out !== null) known.set(form, out);
  }
  return known;
}

/** The Ottoman of a lower case form, null when it is not known; `more` writes a form that is
 *  not known (the converter derives it). */
export function ottoman(
  form: string,
  known: Map<string, string>,
  more?: (form: string) => string | null,
): string | null {
  const out = known.get(form) ?? more?.(form);
  if (out != null) return out;
  const parts = form.split("-");
  if (parts.length > 1) {
    const written = parts.map((p) => known.get(p) ?? more?.(p) ?? null);
    if (written.every((p) => p !== null)) return written.join(" ");
  }
  return null;
}

/** An Ottoman word as a key for looking it up: no ZWNJ, no harakat, the letters of KILAVUZ.md. */
export function ottomanKey(word: string): string {
  return word
    .replace(/[ً-ٰٟ‌‍ـ]/g, "")
    .replaceAll("ک", "ك")
    .replace(/[یيى]/g, "ى")
    .replaceAll("ۀ", "ه");
}
