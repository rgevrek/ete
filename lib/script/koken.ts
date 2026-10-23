// The origin of the root of a word, for coloring the Latin text (settings): Arabic, Persian, Turkic
// (all Turkic together) or Western (Latin, French, Italian …). data/koken.tsv is Wiktionary's
// (scripts/koken.mjs), data/koken-ek.tsv the words of the books it does not have (checked by hand,
// it wins). A form of the books is its word, or a word followed by Turkish endings
// ("hakikatlerini": "hakikat"), else Arabic when its Ottoman spelling has letters only Arabic words
// have (ح ص ع ق …).

import { readFileSync } from "node:fs";
import path from "node:path";

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
/** letters of Arabic words only: ق ط ص غ are also in Turkish ones (قره, طاغ, صو) */
const ARABIC_ONLY = /[ثحذضظعة]/;
/** signs of an Arabic word for the shorter roots and the tentative Turkic ones: also ئ ء (كبائر) */
const ARABIC_SIGN = /[ثحذضظعةئء]/;
const ARABIC_ENDING = /(iyet|ıyet|iyat|ıyat|iyye|iyyet|iyyat)/;
const CIRCUMFLEX = /[âîû]/;

/** an origin, "tentative" when Wiktionary names only Ottoman Turkish for a Turkic one; "verb" a verb stem */
type Entry = { origin: Origin; tentative: boolean; verb: boolean };
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
    const entry: Entry = { origin: origin as Origin, tentative, verb };
    const map = verb ? into.stems : into.words;
    // also without circumflexes: the roots are looked up so ("berekâtı": "berekat" + "ı")
    for (const w of [word, fold(word)]) if (override || !map.has(w)) map.set(w, entry);
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
function findRoot(word: string, spell?: (form: string) => string | null | undefined): { root: string; entry: Entry } | null {
  const { words, stems } = table();
  for (const w of [word, fold(word)]) {
    const own = words.get(w);
    if (own) return { root: w, entry: own };
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
      // the aorist -r right after the vowel of a verb: "iste" + "r", "anla" + "r"
      const aorist =
        entry.verb && /[aeıioöuü]$/.test(root) && rest.startsWith("r") && (rest.length === 1 || CHAIN.test(rest.slice(1)));
      // a Western root of three letters or less only as the word itself ("siyasiye" is no "si" + …)
      if ((CHAIN.test(rest) || aorist) && !(entry.origin === "bati" && root.length < 4)) candidates.push({ root, entry });
    }
  }
  const spelledAs = (root: string) => {
    const s = spell?.(root);
    if (!whole || !s) return null;
    // the final ه or ى of a longer root may go before the ending ("söyle" سويله, "söylüyor" سويليور)
    const prefix = root.length > 3 ? bare(s).replace(/[هى]$/, "") : bare(s);
    return bare(whole).startsWith(prefix);
  };
  // first a word the spelling of the form begins with: "şu" + "dur" شودر, not "şud" + "ur"
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
  const word = first.replace(/’[^’]*$/, "");
  const spelling = spell?.(first) ?? spell?.(form);
  for (const p of [first, word, word.replaceAll("’", ""), first.replaceAll("’", "")]) {
    if ((p.length >= 2 || table().words.has(p)) && (o = ofWord(p, spell, spelling))) break;
  }
  if (!o && spelling && ARABIC_ONLY.test(spelling)) o = "arapca";
  cache.set(form, o);
  return o;
}
