// The books of data/books (scripts/sync-data.sh) and the Ottoman dictionary that goes with them:
// data/sozluk.tsv with the forms of all books derived from it, as tools/osmanlica.py convert does
// (a base may be in another book). Read once per process.

import { readFileSync } from "node:fs";
import path from "node:path";
import { lower, WORD } from "../script/latin";
import { derive, deriveOne, endings, ottomanKey, parseDictionary, type Rules } from "../script/ottoman";
import { parseBook, type Book } from "./parse";

/** The books in the order of the Külliyat. */
export const SLUGS = [
  "sozler",
  "mektubat",
  "lemalar",
  "sualar",
  "tarihceihayat",
  "mesnevi_nuriye",
  "isaretulicaz",
  "barla_lahikasi",
  "kastamonu_lahikasi",
  "emirdag_lahikasi",
  "sikkei_tasdiki_gaybi",
  "asayi_musa",
  "muhakemat",
  "iman_kufur",
  "tilsimlar",
  "zulfikar",
  "eski_said_donemi",
  "hizmet_rehberi",
  "fihrist",
  "hizbul_kuran",
] as const;

export type Library = {
  books: Map<string, Book>;
  /** sozluk.tsv */
  words: Map<string, string>;
  /** sozluk.tsv and the forms of the books derived from it */
  known: Map<string, string>;
  rules: Rules;
  /** how often a Latin form is in the books */
  counts: Map<string, number>;
  /** Ottoman (ottomanKey) → its Latin forms, the most frequent first */
  latinOf: Map<string, string[]>;
};

const DATA = path.join(process.cwd(), "data");

function load(): Library {
  const started = Date.now();
  const slugs = new Set<string>(SLUGS);
  const counts = new Map<string, number>();
  const sink = (text: string) => {
    for (const m of text.matchAll(WORD)) {
      const form = lower(m[0]);
      counts.set(form, (counts.get(form) ?? 0) + 1);
    }
  };
  const books = new Map<string, Book>();
  for (const slug of SLUGS) {
    const source = readFileSync(path.join(DATA, "books", `${slug}.html`), "utf8");
    books.set(slug, parseBook(slug, source, slugs, sink));
  }
  const words = parseDictionary(readFileSync(path.join(DATA, "sozluk.tsv"), "utf8"));
  const rules = endings(words);
  const known = derive(words, counts.keys(), rules);

  const latinOf = new Map<string, string[]>();
  for (const [form, out] of known) {
    const k = ottomanKey(out);
    const list = latinOf.get(k);
    if (list) list.push(form);
    else latinOf.set(k, [form]);
  }
  for (const list of latinOf.values()) {
    list.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  }
  console.log(
    `library: ${books.size} books, ${words.size} dictionary forms, ${rules.size} endings, ` +
      `${known.size - words.size} derived, ${Date.now() - started} ms`,
  );
  return { books, words, known, rules, counts, latinOf };
}

const global = globalThis as unknown as { __eteLibrary?: Library };

export function library(): Library {
  global.__eteLibrary ??= load();
  return global.__eteLibrary;
}

export function book(slug: string): Book | undefined {
  return library().books.get(slug);
}

/** The Ottoman of a form that is not in the books: derived from the known forms (converter). */
export function deriveNew(form: string): string | null {
  const { known, rules } = library();
  return deriveOne(form, known, rules);
}
