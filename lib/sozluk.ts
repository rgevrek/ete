// The dictionary page (/sozluk): every Ottoman form the app knows, sozluk.tsv and the forms of the
// books derived from it, with its ETE and how often it is in the books; searched in any of the three.

import { library } from "./books/library";
import { ete } from "./script/ete";
import { lower } from "./script/latin";
import { ottomanKey } from "./script/ottoman";

export type Entry = {
  latin: string;
  ottoman: string;
  ete: string | null;
  count: number;
  /** derived from sozluk.tsv, not in it */
  derived: boolean;
};

type Indexed = Entry & { fold: string; okey: string };

/** A Latin form for searching: no circumflexes, apostrophes and hyphens. */
export function fold(text: string): string {
  return lower(text)
    .normalize("NFD")
    .replace(/[̂́̀̇]/g, "")
    .normalize("NFC")
    .replace(/[’'‘\-\s]/g, "");
}

let entries: Indexed[] | undefined;

function all(): Indexed[] {
  if (entries) return entries;
  const { words, known, counts } = library();
  const collator = new Intl.Collator("tr");
  entries = [...known]
    .map(([latin, ottoman]) => ({
      latin,
      ottoman,
      ete: ete(latin),
      count: counts.get(latin) ?? 0,
      derived: !words.has(latin),
      fold: fold(latin),
      okey: ottomanKey(ottoman).replaceAll(" ", ""),
    }))
    .sort((a, b) => collator.compare(a.latin, b.latin));
  return entries;
}

const ARABIC = /[؀-ۿ]/;

export type Result = { total: number; entries: Entry[]; words: number; derived: number };

/** The entries matching `query` (all for none), exact ones first, then the ones beginning with it;
 *  `derived` false: only the forms of sozluk.tsv. */
export function search(query: string, { derived = true, offset = 0, limit = 100 } = {}): Result {
  const list = all();
  const q = query.trim();
  let found: Indexed[] = derived ? list : list.filter((e) => !e.derived);
  if (q) {
    const arabic = ARABIC.test(q);
    const key = arabic ? ottomanKey(q).replaceAll(" ", "") : fold(q);
    const eteKey = q.replace(/\s/g, "");
    const rank = (e: Indexed): number => {
      const hay = arabic ? e.okey : e.fold;
      const exact = hay === key || (arabic && e.ete === eteKey);
      if (exact) return 0;
      if (hay.startsWith(key) || (arabic && e.ete?.startsWith(eteKey))) return 1;
      if (hay.includes(key) || (arabic && e.ete?.includes(eteKey))) return 2;
      return 3;
    };
    const ranked = found.map((e) => [rank(e), e] as const).filter(([r]) => r < 3);
    // stable: alphabetical within a rank
    found = ranked.sort((a, b) => a[0] - b[0]).map(([, e]) => e);
  }
  return {
    total: found.length,
    entries: found.slice(offset, offset + limit).map(({ fold: _f, okey: _o, ...e }) => e),
    words: list.filter((e) => !e.derived).length,
    derived: list.filter((e) => e.derived).length,
  };
}
