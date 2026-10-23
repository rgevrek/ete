// The origin of the root of a word, for coloring the Latin text (settings): Arabic, Persian, Turkic
// (all Turkic together) or Western (Latin, French, Italian …). data/koken.tsv is Wiktionary's
// (scripts/koken.mjs), data/koken-ek.tsv the words of the books it does not have (checked by hand,
// it wins). A form of the books is its word, or a word followed by Turkish endings
// ("hakikatlerini": "hakikat"), else Arabic when its Ottoman spelling has letters only Arabic words
// have (ح ص ع ق …).

import { readFileSync } from "node:fs";
import path from "node:path";
import { isLugatWord, meaningsOf } from "../lugat";

export type Origin = "arapca" | "farsca" | "turkce" | "bati";
const ORIGINS = new Set<string>(["arapca", "farsca", "turkce", "bati"]);

const V = "[ıiuü]";
const A = "[ae]";
/** The Turkish endings a root can be followed by, as a chain of them. */
const MORPHEMES = [
  // plural, possessive, case, copula
  `l${A}r`, `${V}?m`, `${V}?n`, `s?${V}`, `${V}?m${V}z`, `${V}?n${V}z`, `y?${V}`, `y?${A}`, `n?[dt]${A}`, `n?[dt]${A}n`,
  `n?${V}n`, `y?l${A}`, `k[ıi]`, `[cç]${A}`, `[dt]${V}r`, `y?ken`, `y?k${A}n`,
  // verbs
  `${V}?yor`, `${A}r`, `${V}r`, `y?[dt]${V}`, `y?m${V}ş`, `y?${A}c${A}[kğ]`, `m${A}z`, `m${A}`, `y?${V}p`, `y?${A}r${A}k`,
  `y?${A}n`, `s${V}n`, `y?s${A}`, `[dt]${V}[kğ]`, `m${A}k`, `m${A}l${V}`, `y?${A}bil`, `y?${A}m${A}`, `y?${V}ş`, `${V}l`,
  `${V}n`, `${V}t`, `${A}t`, `y?${V}ver`, `y?${A}y${A}m`, `y?${A}l${V}m`, `y?${V}m`, `y?${V}z`, `y?${V}n${V}z`, `${A}y${V}m`,
  // making words
  `l${V}[kğ]`, `l${V}`, `s${V}z`, `[cç]${V}`, `[cç]${V}[kğ]`, `[dt]${A}ş`, `l${A}ş`, `l${A}`, `${V}c${V}`, `s${A}l`, `s${V}`,
]
const CHAIN = new RegExp(`^(?:${MORPHEMES.join("|")})+$`);
/** endings only verbs take: before them the stem of a verb wins over a word ("bil-ir", not "bil") */
const VERBAL = new RegExp(
  `^(?:${V}?yor|m${V}yor|m${A}|m${A}z|[ae]r|${V}r|[dt]${V}(?!r)|m${V}ş|m${A}k|y?${A}c${A}[kğ]|y?${V}p|y?${A}r${A}k|y?${A}bil|s${A}|y?${A}n$|y?${A}n[ıi])`,
);
/** letters of Arabic words only: ق ط ص غ are also in Turkish ones (قره, طاغ, صو) */
const ARABIC_ONLY = /[ثحذضظعة]/;
/** signs of an Arabic word for the shorter roots and the tentative Turkic ones: also ئ ء (كبائر) */
const ARABIC_SIGN = /[ثحذضظعةئء]/;
const ARABIC_ENDING = /(iyet|ıyet|iyat|ıyat|iyye|iyyet|iyyat)/;
const CIRCUMFLEX = /[âîû]/;

/** an origin, "tentative" when Wiktionary names only Ottoman Turkish for a Turkic one; "verb" a verb stem */
type Entry = {
  origin: Origin;
  tentative: boolean;
  verb: boolean;
  /** a romanized Ottoman entry only: a form of a Turkish word may have its letters ("seni") */
  weak: boolean;
};
/** the words; the stems of the verbs apart, for their forms only */
type Table = { words: Map<string, Entry>; stems: Map<string, Entry> };
const fold = (w: string) => w.normalize("NFD").replace(/̂/g, "").normalize("NFC");
const global = globalThis as unknown as { __eteKoken?: Table; __eteKokenCache?: Map<string, Origin | null> };

function readTable(file: string, into: Table, override: boolean) {
  const p = path.join(process.cwd(), "data", file);
  let text = "";
  try {
    text = readFileSync(p, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [word, o = "", kind = ""] = line.split("\t").map((c) => c.trim());
    const tentative = o.endsWith("?");
    const origin = o.replace("?", "");
    if (!ORIGINS.has(origin)) continue;
    const verb = kind === "fiil";
    const entry: Entry = { origin: origin as Origin, tentative, verb, weak: kind === "ota" };
    const map = verb ? into.stems : into.words;
    // also without circumflexes: the roots are looked up so ("berekâtı": "berekat" + "ı"); that
    // form overrides no word written so ("benî" not "beni")
    if (override || !map.has(word)) map.set(word, entry);
    // the form without circumflexes may be a Turkish word ("beni" of "benî"): weak
    if (!map.has(fold(word))) map.set(fold(word), fold(word) === word ? entry : { ...entry, weak: true });
  }
}

function table(): Table {
  if (!global.__eteKoken) {
    const t: Table = { words: new Map(), stems: new Map() };
    readTable("koken.tsv", t, false);
    readTable("koken-ek.tsv", t, true);
    global.__eteKoken = t;
  }
  return global.__eteKoken;
}

/** The root of a word in the tables: the word, or the longest one followed by Turkish endings.
 *  `ottoman` (the Ottoman spellings) keeps a root only when the word is spelled beginning with it:
 *  "taamı" طعامى is no "ta" + "amı". */
export function rootOf(word: string, spell?: (form: string) => string | null | undefined): string | null {
  return findRoot(word, spell)?.root ?? null;
}

/** The root of a word and its entry: a word and a verb stem of the same letters are both tried,
 *  the word when its spelling is confirmed ("ne" نه of "nedir"), else the stem ("kal-" of "kaldı"). */
function findRoot(
  word: string,
  spell?: (form: string) => string | null | undefined,
  /** a root shorter than the word, not the word itself */
  shorter = false,
): { root: string; entry: Entry } | null {
  const { words, stems } = table();
  for (const w of shorter ? [] : [word, fold(word)]) {
    const own = words.get(w);
    if (!own) continue;
    // the letters of a Turkish verb stem and a Persian word: the verb ("bak", "der"), not before Arabic signs
    const stem = stems.get(w);
    const whole = spell?.(word);
    if (stem?.origin === "turkce" && own.origin === "farsca" && !(whole && ARABIC_SIGN.test(whole))) {
      return { root: w, entry: stem };
    }
    // a romanized Ottoman word only: a Turkish word and its endings first ("seni": "sen" + "i")
    if (own.weak) {
      const inner = findRoot(word, spell, true);
      if (inner && inner.entry.origin === "turkce" && !inner.entry.weak) return inner;
    }
    return { root: w, entry: own };
  }
  const f = fold(word);
  const whole = spell?.(word);
  /** the roots followed by Turkish endings, the longest first, a stem before a word */
  const candidates: { root: string; entry: Entry }[] = [];
  for (let i = f.length - 1; i >= 2; i--) {
    let root = f.slice(0, i);
    const rest = f.slice(i);
    // the vowel of a verb narrowed before -yor: "isti" + "yor" of "iste", "di" + "yor" of "de"
    if (rest.startsWith("yor") && /[ıiuü]$/.test(root) && !stems.has(root)) {
      for (const v of ["e", "a"]) if (stems.has(root.slice(0, -1) + v)) root = root.slice(0, -1) + v;
    }
    for (const entry of [stems.get(root), words.get(root)]) {
      if (!entry) continue;
      // a Persian word of the letters of a Turkish verb stem: the verb ("deriz", "derler")
      if (!entry.verb && entry.origin === "farsca" && stems.get(root)?.origin === "turkce") continue;
      // the aorist -r right after the vowel of a verb: "iste" + "r", "anla" + "r"
      const aorist =
        entry.verb && /[aeıioöuü]$/.test(root) && rest.startsWith("r") && (rest.length === 1 || CHAIN.test(rest.slice(1)));
      // a Western root of three letters or less only as the word itself ("siyasiye" is no "si" + …)
      if ((CHAIN.test(rest) || aorist) && !(entry.origin === "bati" && root.length < 4)) candidates.push({ root, entry });
    }
  }
  // a word keeps its final ه before an ending ("bende‌den" بنده‌دن: "benden" بندن is "ben" + "den")
  const spelledAs = (root: string) => {
    const s = spell?.(root);
    if (!whole || !s) return null;
    return bare(whole).startsWith(bare(s));
  };
  // a verb stem before verb endings ("bilir", "bilmiyorlar"), not before Arabic signs and not when a
  // longer word the spelling begins with is there ("insanlar" is "insan" + "lar", not "in-" + …)
  for (const c of candidates) {
    if (!c.entry.verb || c.entry.origin !== "turkce" || !VERBAL.test(f.slice(c.root.length))) continue;
    if (whole && ARABIC_SIGN.test(whole)) continue;
    if (candidates.some((w) => !w.entry.verb && w.root.length > c.root.length && spelledAs(w.root))) break;
    return c;
  }
  // then a word the spelling of the form begins with: "şu" + "dur" شودر, not "şud" + "ur"
  for (const c of candidates) if (!c.entry.verb && spelledAs(c.root)) return c;
  for (const c of candidates) {
    const { root, entry } = c;
    // a verb stem is not spelled like the word it may also be ("de-" دي, "de" ده; "kal-" قال, "kal" قلع),
    // but no verb before Arabic signs; a Western stem not when an eastern word has the letters
    if (entry.verb) {
      if (whole && ARABIC_SIGN.test(whole)) continue;
      if (entry.origin === "bati" && words.get(root) && words.get(root)!.origin !== "bati") continue;
      return c;
    }
    const verified = spelledAs(root);
    if (verified === false) continue;
    // a short root that is not spelled: three letters at least, not before Arabic signs and not
    // Western ("nedir" is no "ned" + "ir")
    if (verified === null && root.length <= 3) {
      if (root.length === 2 || entry.origin === "bati") continue;
      if (whole && ARABIC_SIGN.test(whole)) continue;
    }
    return c;
  }
  return null;
}

/** An Ottoman spelling for comparing: no ZWNJ, no marks, the yeh and the kaf as in KILAVUZ.md. */
const bare = (o: string) =>
  o
    .replace(/[ً-ٰ‌ـ]/g, "")
    .replace(/[یي]/g, "ى")
    .replace(/[أإآ]/g, "ا")
    .replace(/ۀ/g, "ه");

function ofWord(
  word: string,
  spell?: (form: string) => string | null | undefined,
  formSpelling?: string | null,
): Origin | null {
  const found = findRoot(word, spell);
  if (!found) return null;
  const { root, entry } = found;
  // Arabic letters make an Arabic word, also of a root Wiktionary has as Turkic, Western or Persian
  // ("hal" حال; "bazı" بعضى came to Turkish through Persian)
  const spelling = spell?.(word) ?? formSpelling ?? spell?.(root);
  if (entry.origin !== "arapca" && spelling && ARABIC_ONLY.test(spelling)) return "arapca";
  // Western words have no circumflex: "Mâce", "Geylânî" are names
  if (entry.origin === "bati") return CIRCUMFLEX.test(word) ? null : "bati";
  if (entry.origin !== "turkce") return entry.origin;
  // native words have no circumflex ("vâhid" is no "vah" + "id"); a tentative Turkic one not
  // with Arabic signs or endings either ("milliyet")
  if (CIRCUMFLEX.test(word) && !CIRCUMFLEX.test(root)) return null;
  // a word only said to be Ottoman, of a root with an origin: by its root ("kuvvetli": "kuvvet" + "li")
  if (entry.tentative && (root === word || root === fold(word))) {
    const inner = findRoot(word, spell, true);
    if (inner && !inner.entry.tentative && inner.entry.origin !== "turkce") return inner.entry.origin;
  }
  // a word of the lügat, which explains the Arabic and Persian words, is one of them ("dikkat")
  // (a word of it, not one of its forms); also a Turkic word of a romanized Ottoman entry only
  // ("kubur" the quiver, "kuburun" of the graves)
  if ((entry.tentative || (entry.weak && entry.origin === "turkce")) && isLugatWord(root)) {
    return spelling && PERSIAN_LETTERS.test(spelling) && !ARABIC_ONLY.test(spelling) ? "farsca" : "arapca";
  }
  if (entry.tentative) {
    // Arabic endings or letters: an Arabic word ("ehemmiyetli"); a circumflex: Arabic or Persian
    if (ARABIC_ENDING.test(word) || (spelling && ARABIC_SIGN.test(spelling))) return "arapca";
    if (CIRCUMFLEX.test(word)) return null;
  }
  return "turkce";
}

/** The origin of the root of a lower case form of the books (its first part, "hakikat-i" by
 *  "hakikat"); `spell` gives the Ottoman of a form, when known. */
export function origin(form: string, spell?: (form: string) => string | null | undefined): Origin | null {
  const cache = (global.__eteKokenCache ??= new Map());
  if (cache.has(form)) return cache.get(form)!;
  const first = form.replace(/^[’'-]+/, "").split(/-/)[0];
  let o: Origin | null = null;
  // a word of one letter only as it is ("o")
  // without the suffix after its last apostrophe: "Kur’ân’la" is "kur’ân", not "kur"
  // (only when what follows is Turkish endings: the ’ of "mu’cizat" is the hamza of the Arabic)
  const last = first.lastIndexOf("’");
  const word = last >= 3 && CHAIN.test(fold(first.slice(last + 1))) ? first.slice(0, last) : first;
  const spelling = spell?.(first) ?? spell?.(form);
  for (const p of [first, word, word.replaceAll("’", ""), first.replaceAll("’", "")]) {
    if ((p.length >= 2 || table().words.has(p)) && (o = ofWord(p, spell, spelling))) break;
  }
  // a word of the lügat is no Turkish root and endings ("emare" is no "em-" + "are")
  if (o === "turkce" && isLugatWord(word) && rootOf(word, spell) !== word && !table().words.has(fold(word))) {
    o = eastern(word, spelling, true);
  }
  o ??= compound(word.replaceAll("’", ""), spell) ?? eastern(word.replaceAll("’", ""), spelling);
  if (!o && spelling && ARABIC_ONLY.test(spelling)) o = "arapca";
  cache.set(form, o);
  return o;
}

/** A compound written as one word, by its first word: "âhirzaman" is "âhir" + "zaman". */
function compound(word: string, spell?: (form: string) => string | null | undefined): Origin | null {
  const { words } = table();
  const f = fold(word);
  for (let i = f.length - 3; i >= 3; i--) {
    const first = words.get(f.slice(0, i));
    if (first && first.origin !== "bati" && findRoot(f.slice(i), spell)) return first.origin;
  }
  return null;
}

const PERSIAN_LETTERS = /[پچژگ]/;
const PERSIAN_AFFIX = /(?:hane|hâne|gâh|gah|kâr|zade|zâde|name|nâme|âne|istan|istân|perest|engiz|nüma|nümâ|bâz|dâr|bend|şinas|güzar|ver)$|^(?:bî|nâ|ser|hem|pür|der)(?=[^aeıioöuü])/;

/** A word of the lügat, which explains the Arabic and Persian words of the books, also followed by
 *  Turkish endings ("berzahta": "berzah" + "ta"; `exact`: only as it is): Persian by its letters or
 *  affixes, else Arabic. */
function eastern(word: string, spelling?: string | null, exact = false): Origin | null {
  const f = fold(word);
  let lugat = meaningsOf(word).length > 0 || (!exact && meaningsOf(f).length > 0);
  for (let i = f.length - 1; !lugat && !exact && i >= 3; i--) {
    lugat = meaningsOf(f.slice(0, i)).length > 0 && CHAIN.test(f.slice(i));
  }
  if (!lugat) return null;
  if (spelling && ARABIC_SIGN.test(spelling)) return "arapca";
  return (spelling && PERSIAN_LETTERS.test(spelling)) || PERSIAN_AFFIX.test(f) ? "farsca" : "arapca";
}
