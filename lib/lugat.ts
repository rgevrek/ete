// The lügat of the books (data/lugat.tsv from lugat/lugat.html, scripts/lugat.mjs): the meanings of
// a word, found by the word or by one of its forms in the books.

import { readFileSync } from "node:fs";
import path from "node:path";
import { lower } from "./script/latin";

export type Meaning = {
  word: string;
  meanings: string[];
  /** book slug and printed page, the first ones */
  pages: { book: string; page: string }[];
  /** on how many pages it is */
  pageCount: number;
};

type Index = { byWord: Map<string, Meaning[]>; byForm: Map<string, Meaning[]> };

const global = globalThis as unknown as { __eteLugat?: Index };

function load(): Index {
  const byWord = new Map<string, Meaning[]>();
  const byForm = new Map<string, Meaning[]>();
  const add = (map: Map<string, Meaning[]>, key: string, m: Meaning) => {
    const list = map.get(key);
    if (!list) map.set(key, [m]);
    else if (!list.includes(m)) list.push(m);
  };
  const tsv = readFileSync(path.join(process.cwd(), "data", "lugat.tsv"), "utf8");
  for (const line of tsv.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [word, forms, meanings, pages, count] = line.split("\t");
    const m: Meaning = {
      word,
      meanings: meanings.split(" ¦ "),
      pages: pages
        ? pages.split(",").map((p) => {
            const [book, page] = p.split(":");
            return { book, page };
          })
        : [],
      pageCount: Number(count) || 0,
    };
    add(byWord, lower(word), m);
    if (forms) for (const f of forms.split(",")) add(byForm, lower(f), m);
  }
  return { byWord, byForm };
}

function index(): Index {
  global.__eteLugat ??= load();
  return global.__eteLugat;
}

/** The lügat entries of a lower case form: the word itself first, then the words it is a form of. */
export function meaningsOf(form: string): Meaning[] {
  const { byWord, byForm } = index();
  const own = byWord.get(form) ?? [];
  return [...own, ...(byForm.get(form) ?? []).filter((m) => !own.includes(m))];
}

/** Whether a lower case word is a word of the lügat (a headword, not only one of their forms). */
export function isLugatWord(word: string): boolean {
  return index().byWord.has(word);
}
