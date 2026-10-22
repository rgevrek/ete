// ETE (Esas Türk Elifbası), as tools/ete.py writes it: every letter of the Turkish alphabet is one
// letter (or letter and mark) of data/cetvel.tsv, the vowels written; a vowel at the start of a word
// has its initial form, within and at the end its middle form, also in a suffix after an
// apostrophe. Apostrophes and hyphens are not written. â î û are a i u with the maddah, a final h
// is هـ. q w x are written by their nearest letters. So Latin and ETE map one to one, apart from
// the apostrophes and hyphens and the initial â (written آ like a).

import { readFileSync } from "node:fs";
import path from "node:path";

const TATWEEL = "ـ";
const MADDAH = "ٓ";
const FINAL_H = "ه" + TATWEEL;
const NEAREST: Record<string, string> = { q: "k", w: "v", x: "ks" };
const LONG: Record<string, string> = { â: "a", î: "i", û: "u" };

/** letter: [middle, initial, final] */
export type Table = Map<string, [string, string, string]>;

export function parseTable(tsv: string): Table {
  const table: Table = new Map();
  for (const line of tsv.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [letter, middle, initial, final] = line.split("\t");
    table.set(letter, [middle, initial || middle, final || middle]);
  }
  for (const [long, short] of Object.entries(LONG)) {
    const forms = table.get(short)!;
    table.set(
      long,
      forms.map((f) => (f.includes("آ") ? f : (f + MADDAH).normalize("NFC"))) as [
        string,
        string,
        string,
      ],
    );
  }
  return table;
}

let cached: Table | undefined;
export function table(): Table {
  cached ??= parseTable(readFileSync(path.join(process.cwd(), "data", "cetvel.tsv"), "utf8"));
  return cached;
}

/** The lower case `form` in the letters of the table and â î û: no apostrophes and hyphens. */
function plain(form: string): string {
  let out = "";
  for (let ch of form.replace(/[’'‘-]/g, "").normalize("NFC")) {
    ch = NEAREST[ch] ?? ch;
    // é, ê, ä …: the letter without its mark
    if (ch.length === 1 && !"çğıöşüâîû".includes(ch) && ch.charCodeAt(0) > 0x7f) {
      ch = ch.normalize("NFD")[0];
    }
    out += ch;
  }
  return out;
}

/** The ETE of a lower case word form, null when a letter is not in the table; a form beginning
 *  with an apostrophe or hyphen is a suffix, its first vowel in its middle form. */
export function ete(form: string, t: Table = table()): string | null {
  const suffix = /^[’'‘-]/.test(form);
  const letters = [...plain(form)];
  let out = "";
  for (const [i, ch] of letters.entries()) {
    const forms = t.get(ch);
    if (!forms) return null;
    const [middle, initial, final] = forms;
    if (i === 0 && !suffix) out += initial;
    else if (i === letters.length - 1) out += ch === "h" ? FINAL_H : final;
    else out += middle;
  }
  return out;
}

type Reverse = { initial: [string, string][]; other: [string, string][] };
const reverses = new WeakMap<Table, Reverse>();

/** The ETE spellings and their letters, the longest first, the short vowels before the long. */
function reverse(t: Table): Reverse {
  let r = reverses.get(t);
  if (r) return r;
  const initial = new Map<string, string>();
  const other = new Map<string, string>();
  for (const [letter, [middle, init, final]] of t) {
    // the initial آ is a (â is written so as well)
    if (!initial.has(init)) initial.set(init, letter);
    for (const f of [middle, final]) if (!other.has(f)) other.set(f, letter);
  }
  other.set(FINAL_H, "h");
  // the plain ه at the end of a word read as h too, and the alif without a mark as a
  if (!other.has("ه")) other.set("ه", "h");
  const byLength = (m: Map<string, string>) =>
    [...m].sort((a, b) => b[0].length - a[0].length) as [string, string][];
  r = { initial: byLength(initial), other: byLength(other) };
  reverses.set(t, r);
  return r;
}

/** The Latin of an ETE word, null when it has a letter that is not ETE. */
export function eteToLatin(word: string, t: Table = table()): string | null {
  const { initial, other } = reverse(t);
  const text = word.normalize("NFC").replaceAll("‌", "");
  let out = "";
  let i = 0;
  while (i < text.length) {
    const candidates = i === 0 ? [...initial, ...other] : other;
    const hit = candidates.find(([spelling]) => text.startsWith(spelling, i));
    if (!hit) return null;
    out += hit[1];
    i += hit[0].length;
  }
  return out;
}
