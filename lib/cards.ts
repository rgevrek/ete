// Words of the books as learning cards for other apps (/api/v1/cards), new ones at random each
// time: a word of the lügat in its three alphabets with its meanings and where it stands, or a word
// of the books to learn how it is written in Ottoman and ETE letters.

import { convert } from "./convert";
import { library } from "./books/library";
import { isLugatWord, lugatWords, meaningsOf } from "./lugat";
import { ete } from "./script/ete";
import { lower } from "./script/latin";

/** A word of the books in the three alphabets. */
export type Spelled = { latin: string; ottoman: string; ete: string };

/** A Latin text in Ottoman and ETE letters, or null when a word of it has no Ottoman spelling. */
export function spell(latin: string): Spelled | null {
  let ottoman = "";
  let eteText = "";
  for (const token of convert(latin, "latin")) {
    if (!token.word) {
      ottoman += token.arabic;
      eteText += token.arabic;
      continue;
    }
    if (!token.ottoman || !token.ete) return null;
    ottoman += token.ottoman;
    eteText += token.ete;
  }
  return { latin, ottoman, ete: eteText };
}

/** `count` different items of a list at random, tried in a random order until enough fit. */
export function pick<T, R>(list: readonly T[], count: number, make: (item: T) => R | null, random: () => number = Math.random): R[] {
  const out: R[] = [];
  const tried = new Set<number>();
  while (out.length < count && tried.size < Math.min(list.length, count * 20)) {
    const i = Math.floor(random() * list.length);
    if (tried.has(i)) continue;
    tried.add(i);
    const made = make(list[i]);
    if (made) out.push(made);
  }
  return out;
}

const titleOf = (slug: string) => library().books.get(slug)?.title;

/** Vocabulary: a word of the lügat that stands in the books, in its three alphabets, with its
 *  meanings and the first pages it stands on. */
export function vocabularyCards(count: number, random?: () => number) {
  const words = lugatWords().filter((m) => m.pages.length > 0);
  return pick(
    words,
    count,
    (m) => {
      const spelled = spell(m.word);
      if (!spelled) return null;
      const refs = m.pages.flatMap((p) => {
        const book = titleOf(p.book);
        return book && p.page ? [{ book, page: p.page }] : [];
      });
      return { id: `v:${lower(m.word)}`, ...spelled, meanings: m.meanings, refs: refs.slice(0, 3) };
    },
    random,
  );
}

/** How often a word must stand in the books to be learned by its spelling. */
const SPELLING_MIN = 20;

/** Spelling: a word of the dictionary (not derived) that stands often in the books, in Latin, then
 *  in Ottoman and ETE letters, with its first meaning when it is a word of the lügat itself (not
 *  only one of its forms, whose meaning may be another word's). */
export function spellingCards(count: number, random?: () => number) {
  const { words, counts } = library();
  const often = [...words.keys()].filter((form) => form.length >= 4 && (counts.get(form) ?? 0) >= SPELLING_MIN);
  return pick(
    often,
    count,
    (form) => {
      const eteForm = ete(form);
      if (!eteForm) return null;
      return { id: `s:${form}`, latin: form, ottoman: words.get(form)!, ete: eteForm, count: counts.get(form) ?? 0, meaning: isLugatWord(form) ? (meaningsOf(form)[0]?.meanings[0] ?? null) : null };
    },
    random,
  );
}
