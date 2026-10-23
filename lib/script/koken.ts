// The origin of the root of a word, for coloring the Latin text (settings): Arabic, Persian, old
// Turkic (a Turkic word not of today's Turkish, or written otherwise in Ottoman: "arslan" aslan) or
// Western (Latin, French, Italian, Greek …); a Turkic word of today ("el", "ayak"), the grammar words
// and the endings stay black. data/koken.tsv is Wiktionary's
// (scripts/koken.mjs), data/koken-ek.tsv the words of the books it does not have (checked by hand,
// it wins). A form of the books is its word, or a word followed by Turkish endings
// ("hakikatlerini": "hakikat"), else Arabic when its Ottoman spelling has letters only Arabic words
// have (ح ص ع ق …).

import { readFileSync } from "node:fs";
import path from "node:path";
import { isLugatWord, meaningsOf } from "../lugat";

/** "turkce": a Turkic word of today's Turkish (black); "eski": an old Turkic one (red) */
export type Origin = "arapca" | "farsca" | "eski" | "turkce" | "bati";
/** "diger": of another language (Armenian, Mongolian …), decided but not colored */
type Known = Origin | "diger";
const ORIGINS = new Set<string>(["arapca", "farsca", "eski", "turkce", "bati", "diger"]);

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
  // making words: also of verbs ("sön-ük", "kır-gın", "bil-gi")
  `${V}[kğ]`, `${A}[kğ]`, `[gk]${V}n`, `g${V}`, `l${V}[kğ]`, `l${V}`, `s${V}z`, `[cç]${V}`, `[cç]${V}[kğ]`, `[dt]${A}ş`, `l${A}ş`, `l${A}`, `${V}c${V}`, `s${A}l`, `s${V}`,
]
const CHAIN = new RegExp(`^(?:${MORPHEMES.join("|")})+$`);
/** endings that make a word of a word: "kuvvet-li", "hizmet-çi", "insan-lık", "imân-sız" */
const DERIVING = new RegExp(`^(?:[cç]${V}|l${V}|l${V}[kğ]|s${V}z|l${A}ş|l${A}n|[cç]${V}l${V}[kğ]|[cç]${A})(?:${MORPHEMES.join("|")})*$`);
/** endings only verbs take: before them the stem of a verb wins over a word ("bil-ir", not "bil") */
const VERB_ONLY = new RegExp(`^(?:${V}?yor|m${A}k|y?${A}c${A}[kğ]|y?${A}r${A}k|y?${V}p|y?${V}nc${A}|m${A}d${A}n|y?${A}bil|y?${A}m${A}[dmz]|[dt]${V}r${V}l)`);
const VERBAL = new RegExp(
  `^(?:${V}?yor|m${V}yor|m${A}|m${A}z|[ae]r|${V}r|[dt]${V}(?!r)|m${V}ş|m${A}k|y?${A}c${A}[kğ]|y?${V}p|y?${A}r${A}k|y?${A}bil|s${A}|y?${A}n)`,
);
/** letters of Arabic words only: ق ط ص غ are also in Turkish ones (قره, طاغ, صو) */
const ARABIC_ONLY = /[ثحذضظعة]/;
/** signs of an Arabic word for the shorter roots and the tentative Turkic ones: also ئ ء (كبائر) */
const ARABIC_SIGN = /[ثحذضظعةئء]/;
const ARABIC_ENDING = /(iyet|ıyet|iyat|ıyat|iyye|iyyet|iyyat)/;
const CIRCUMFLEX = /[âîû]/;

/** an origin, "tentative" when Wiktionary names only Ottoman Turkish for a Turkic one; "verb" a verb stem */
type Entry = {
  origin: Known;
  tentative: boolean;
  verb: boolean;
  /** a romanized Ottoman entry only: a form of a Turkish word may have its letters ("seni"); a
   *  Turkic one is not of today's Turkish */
  weak: boolean;
  /** a Turkish word whose Ottoman form is written otherwise ("aslan" arslan, "vurmak" urmak) */
  old: boolean;
};
/** the words; the stems of the verbs apart, for their forms only */
type Table = { words: Map<string, Entry>; stems: Map<string, Entry> };
const fold = (w: string) => w.normalize("NFD").replace(/̂/g, "").normalize("NFC");
const global = globalThis as unknown as { __eteKoken?: Table; __eteKokenCache?: Map<string, Explained> };

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
    const kinds = new Set(kind.split(","));
    const verb = kinds.has("fiil");
    const entry: Entry = { origin: origin as Known, tentative, verb, weak: kinds.has("ota"), old: kinds.has("eski") };
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
  /** the spelling to check the roots against, else the word's */
  wholeSpelling?: string | null,
): { root: string; entry: Entry } | null {
  const { words, stems } = table();
  for (const w of shorter ? [] : [word, fold(word)]) {
    const own = words.get(w);
    // a verb stem as a whole word: the imperative ("ver", "bak")
    const bare = stems.get(w);
    if (!own && bare?.origin === "turkce") return { root: w, entry: bare };
    if (!own) continue;
    // the letters of a Turkish verb stem and a Persian word: the verb ("bak", "der"), not before Arabic signs
    const stem = stems.get(w);
    const whole = wholeSpelling ?? spell?.(word);
    if (stem?.origin === "turkce" && own.origin === "farsca" && !(whole && ARABIC_SIGN.test(whole))) {
      return { root: w, entry: stem };
    }
    // a word of another language that is also a Turkish verb and an ending only verbs take, as its
    // spelling writes it ("edip" ايدوب is ed-ip, not the Arabic edîb ادیب)
    if (own.origin !== "turkce" && whole && /(?:وب|يور[^ ]*|مك|مق|ه‌?جك|ه‌?جق|ه‌?رك|ه‌?رق)$/.test(whole.replace(/‌/g, ""))) {
      const inner = findRoot(word, spell, true, wholeSpelling);
      if (inner?.entry.verb && inner.entry.origin === "turkce" && VERB_ONLY.test(fold(word).slice(inner.root.length))) return inner;
    }
    // a romanized Ottoman word only: a Turkish word and its endings first ("seni": "sen" + "i")
    if (own.weak) {
      const inner = findRoot(word, spell, true);
      if (inner && inner.entry.origin === "turkce" && !inner.entry.weak) return inner;
    }
    return { root: w, entry: own };
  }
  const f = fold(word);
  const whole = wholeSpelling ?? spell?.(word);
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
      // after the vowel of a verb: the aorist -r ("iste-r"), the causative -t ("uza-t-tır-an"), the
      // passive -n and -l ("yuvarla-n-an")
      const aorist =
        entry.verb && /[aeıioöuü]$/.test(root) && /^[rtnl]/.test(rest) && (rest.length === 1 || CHAIN.test(rest.slice(1)));
      // a Western root of three letters or less only as the word itself ("siyasiye" is no "si" + …)
      if ((CHAIN.test(rest) || aorist) && !(entry.origin === "bati" && root.length < 4)) candidates.push({ root, entry });
    }
  }
  // by the consonants: the vowel letters of a word change with its endings ("doğru" طوغرى,
  // "doğruya" طوغرويه; "lira" ليره, "liranı" ليراڭى)
  const spelledAs = (root: string) => {
    // a Western word is spelled in many ways in Ottoman ("parti" پارتى, پاردى): never against it
    if (words.get(root)?.origin === "bati" && !stems.has(root)) return null;
    const s = spell?.(root);
    if (!whole || !s) return null;
    const r = skeleton(s);
    // too few consonants to tell ("ne" نه, "el" ال): the letters as they are
    if (r.length < 2) return bare(whole).startsWith(bare(s));
    return skeleton(whole).startsWith(r);
  };
  // a verb stem before verb endings ("bilir", "bilmiyorlar"), not before Arabic signs and not when a
  // longer word the spelling begins with is there ("insanlar" is "insan" + "lar", not "in-" + …)
  for (const c of candidates) {
    const rest = f.slice(c.root.length);
    // the aorist -r after the vowel of a stem is a verb ending too ("tanı-r"), but not before a
    // word the spelling confirms with a plural ("hatır-ları", not "hatırla-rı")
    const aoristOnly = !VERBAL.test(rest) && /[aeıioöuü]$/.test(c.root) && /^r/.test(rest) && c.root.length > 2;
    const verbal = VERBAL.test(rest) || aoristOnly || VERB_ONLY.test(rest);
    if (!c.entry.verb || c.entry.origin !== "turkce" || !verbal) continue;
    // no Turkish verb form has the endings of Arabic abstracts ("enaniyeti" is no "en-" + …)
    if (ARABIC_ENDING.test(f)) continue;
    if (aoristOnly && candidates.some((w) => !w.entry.verb && spelledAs(w.root) && /^l[ae]r/.test(f.slice(w.root.length)))) continue;
    if (whole && ARABIC_SIGN.test(whole)) continue;
    // an ending only a verb takes: the verb ("ed-ebilir", not "edeb" + "ilir"; "ed-ip")
    if (VERB_ONLY.test(rest)) return c;
    // a longer word wins when what it leaves is no ending of a verb only and more than a letter
    // ("insan-lar"; not "soru-yor", "bile-n")
    const longer = candidates.some((w) => {
      // (not a grammar word: "bile" takes no endings, "bil-en-dir")
      if (w.entry.verb || w.root.length <= c.root.length || GRAMMAR.has(w.root) || !spelledAs(w.root)) return false;
      const after = f.slice(w.root.length);
      return after.length > 1 && !VERB_ONLY.test(after);
    });
    if (longer) break;
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
      // a stem of two letters only before a verb ending ("sırat" is no "sı-" + "rat")
      if (root.length === 2 && !VERBAL.test(f.slice(root.length)) && !VERB_ONLY.test(f.slice(root.length))) continue;
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

/** The consonants of an Ottoman spelling: without its vowel letters and marks. */
const skeleton = (o: string) => bare(o).replace(/[اوىيهةءئؤ]/g, "");

/** An Ottoman spelling for comparing: no ZWNJ, no marks, the yeh and the kaf as in KILAVUZ.md. */
const bare = (o: string) =>
  o
    .replace(/[ً-ٰ‌ـ]/g, "")
    .replace(/[یي]/g, "ى")
    .replace(/[أإآ]/g, "ا")
    .replace(/ۀ/g, "ه")
    .replace(/[ڭگ]/g, "ك");

/** Persian by its letters (پ چ ژ گ) or a Persian affix, else Arabic: a word of the lügat. */
function persianOrArabic(word: string, spelling?: string | null): Origin {
  if (spelling && ARABIC_SIGN.test(spelling)) return "arapca";
  return (spelling && PERSIAN_LETTERS.test(spelling)) || PERSIAN_AFFIX.test(fold(word)) ? "farsca" : "arapca";
}

type Found = { origin: Known | null; root: string | null };

function ofWord(
  word: string,
  spell?: (form: string) => string | null | undefined,
  /** the spelling of the whole form, when `word` is cut from it ("kur’a" of "kur’a’nın") */
  formSpelling?: string | null,
  cut = false,
): Found {
  const found = findRoot(word, spell, false, cut ? formSpelling : undefined);
  if (!found) return { origin: null, root: null };
  const { root, entry } = found;
  const is = (origin: Known | null): Found => ({ origin, root });
  // a short word cut from a form is not Western ("kur’a" is no "kur")
  if (cut && entry.origin === "bati" && root.length < 4) return is(null);
  // Arabic letters make an Arabic word, also of a root Wiktionary has as Turkic, Western or Persian
  // ("hal" حال; "bazı" بعضى came to Turkish through Persian)
  const spelling = (cut ? formSpelling : spell?.(word)) ?? formSpelling ?? spell?.(root);
  if (entry.origin !== "arapca" && entry.origin !== "diger" && spelling && ARABIC_ONLY.test(spelling)) return is("arapca");
  // Western words have no circumflex: "Mâce", "Geylânî" are names
  if (entry.origin === "bati") return is(CIRCUMFLEX.test(word) ? null : "bati");
  if (entry.origin !== "turkce" && entry.origin !== "eski") return is(entry.origin);
  // native words have no circumflex ("vâhid" is no "vah" + "id"), unless their root has one: the
  // letters of the word the root was cut from
  if (CIRCUMFLEX.test(word) && !CIRCUMFLEX.test(word.normalize("NFC").slice(0, root.length))) return is(null);
  // a Turkic word made of an Arabic or Persian root: by its root ("kuvvetli": "kuvvet" + "li",
  // "hizmetçi": "hizmet" + "çi"), a root of four letters at least ("haydi" is no "hay" + "di")
  // (a word Wiktionary has as Turkic itself only when what follows the root makes a word of it:
  // "aslan" is no "asla" + "n")
  if (root === word || root === fold(word)) {
    const inner = findRoot(word, spell, true);
    const rest = inner ? fold(word).slice(inner.root.length) : "";
    if (
      inner &&
      inner.root.length >= 4 &&
      !inner.entry.tentative &&
      !["turkce", "eski"].includes(inner.entry.origin) &&
      (entry.tentative || DERIVING.test(rest))
    ) {
      return { origin: inner.entry.origin, root: inner.root };
    }
  }
  // a word of the lügat, which explains the Arabic and Persian words, is one of them ("dikkat")
  // (a word of it, not one of its forms); also a Turkic word of a romanized Ottoman entry only
  // ("kubur" the quiver, "kuburun" of the graves)
  if ((entry.tentative || (entry.weak && entry.origin === "turkce")) && isLugatWord(root)) {
    return is(persianOrArabic(root, spelling));
  }
  if (entry.tentative) {
    // Arabic endings or letters: an Arabic word ("ehemmiyetli"); a circumflex: Arabic or Persian
    if (ARABIC_ENDING.test(word) || (spelling && ARABIC_SIGN.test(spelling))) return is("arapca");
    if (CIRCUMFLEX.test(word)) return is(null);
  }
  // old Turkic: not of today's Turkish (an Ottoman entry only), written otherwise in Ottoman by
  // Wiktionary, or by its Ottoman letters ("dağ" طاغ is ṭağ, "vurmak" اورمق urmak)
  // (a grammar word as a root is black: "bile")
  if (GRAMMAR.has(root)) return is("turkce");
  if (entry.origin === "eski" || entry.weak || entry.old) return is("eski");
  // (the root's spelling, else the whole word's: "gid-" has none, "gideceğimi" كيده‌جكمى has)
  const rootSpelling = spell?.(root);
  const wordSpelling = rootSpelling ? null : spelling;
  if (rootSpelling) return is(readsAs(root, rootSpelling) ? "turkce" : "eski");
  // (only the root of it: the ğ of an ending is written ك, "-diği" ديكى)
  return is(wordSpelling && !readsAs(root, wordSpelling, true) ? "eski" : "turkce");
}

/** The Latin consonants an Ottoman letter of a Turkish word is read as: ك k or ğ (the g is گ, the ñ
 *  ڭ), ط t or d. */
const READS: Record<string, string> = {
  ب: "bp", پ: "p", ت: "t", ط: "td", د: "dt", ج: "cç", چ: "ç", خ: "h", ح: "h", ه: "h", ة: "t", ر: "r", ز: "z",
  ذ: "z", ض: "zd", ظ: "z", س: "s", ص: "s", ث: "s", ش: "ş", ف: "f", ق: "k", ك: "kğ", ڭ: "n", گ: "g", غ: "ğg",
  ل: "l", م: "m", ن: "n", و: "v", ي: "y", ى: "y", ئ: "y", ژ: "j",
};
/** the letters that may also be vowels, or not be read at all */
const VOWEL_LETTERS = new Set([..."اآأإوىيهةءئؤع"]);

/** Whether the Ottoman spelling `ottoman` of a Turkish word reads as its Latin `latin`: its consonants
 *  in order, each from a letter that can be read so; vowels from vowel letters or none. "gelmek"
 *  گلمك, "dağ" طاغ, "değil" دكل do; "gelmek" كلمك (kelmek), "yirmi" يكرمى (yigirmi) do not. */
export function readsAs(latin: string, ottoman: string, prefix = false): boolean {
  const l = [...fold(latin).replace(/[’'-]/g, "")];
  // (the letters as written: ڭ is n, not the k of ك as for comparing spellings)
  const o = [...ottoman.replace(/[ً-ٰ‌ـ\s]/g, "").replace(/[یي]/g, "ى").replace(/[أإآ]/g, "ا").replace(/ۀ/g, "ه")];
  // can l[i:] be read from o[j:]: memoized
  const memo = new Map<number, boolean>();
  const go = (i: number, j: number): boolean => {
    const k = i * 100 + j;
    if (memo.has(k)) return memo.get(k)!;
    let ok = false;
    // (prefix: the Latin read from the beginning of the spelling, the rest the endings')
    if (i === l.length && (j === o.length || prefix)) ok = true;
    else {
      const c = l[i];
      const letter = o[j];
      const vowel = c !== undefined && "aeıioöuü".includes(c);
      // a Latin vowel without a letter
      if (vowel && go(i + 1, j)) ok = true;
      // a vowel letter without a Latin letter (ه of a final -e is the vowel, ع silent)
      else if (letter !== undefined && VOWEL_LETTERS.has(letter) && go(i, j + 1)) ok = true;
      else if (c !== undefined && letter !== undefined) {
        // a vowel and a vowel letter; a consonant and a letter read so
        const reads = vowel ? VOWEL_LETTERS.has(letter) : (READS[letter] ?? "").includes(c);
        if (reads && go(i + 1, j + 1)) ok = true;
        // a doubled Latin consonant written once
        else if (!vowel && l[i - 1] === c && go(i + 1, j)) ok = true;
      }
    }
    memo.set(k, ok);
    return ok;
  };
  return go(0, 0);
}

/** The grammar words: the Turkic ones black, the Arabic and Persian ones by their origin; the forms
 *  of the pronouns ("bunun", "onlara", "benim") black. */
const GRAMMAR = new Set(
  (
    "ve veya yahut veyahut ya yani hem de da ki ise ile ama fakat lâkin lakin ancak çünkü eğer şayet gerçi " +
    "belki zira hatta hattâ madem mademki bile dahi mi mı mu mü değil evet hayır ey yâ işte halbuki meğer " +
    "yoksa için gibi kadar göre beri sonra önce evvel üzere karşı rağmen dair diye iken ken var yok her hiç " +
    "bütün bazı hep kendi bu şu o bir ben sen biz siz onlar ne kim hangi nasıl niçin niye neden nere nerede " +
    "öyle böyle şöyle pek çok az daha en artık hâlâ şimdi ora bura şura"
  ).split(" "),
);
/** the endings the books write apart from their word (after a name, a number, a quotation) */
const APART = new Set(
  (
    "deki daki teki taki ler lar leri ları lerin ların nin nın nun nün in ın un ün dir dır dur dür tir tır tur " +
    "tür de da te ta den dan ten tan e a ye ya i ı u ü yi yı yu yü si sı su sü yle yla le la ce ca çe ça nci ncı " +
    "inci ıncı uncu üncü dı di du dü tı ti tu tü"
  ).split(" "),
);
/** the stems of the pronouns before their endings */
const PRONOUN = /^(?:bun|şun|on|ben|ban|sen|san|biz|siz|kendi|ney|kim|bir|ora|bura|şura|nere)/;

function grammar(word: string): boolean {
  if (GRAMMAR.has(word)) return true;
  // endings written apart ("deki", "ler"): black
  if (APART.has(word)) return true;
  const m = PRONOUN.exec(word);
  // a pronoun and its endings, not a word of its letters ("sene" is no "sen" + "e")
  return !!m && CHAIN.test(word.slice(m[0].length)) && !table().words.has(word) && !table().words.has(fold(word));
}

export type Explained = {
  origin: Origin | null;
  /** the root, as the letters it begins the form with (lower case, apostrophes and circumflexes as
   *  the form has them); the rest is endings, black */
  root: string | null;
  /** a Persian affix of the word, colored apart: the suffix after the root ("mâni" + "dâr") or the
   *  prefix before it ("nâ" + "mütenâhî"), its letters as the form has them; `ottoman` its spelling */
  affix?: { text: string; origin: Origin; prefix: boolean; ottoman: string };
};

/** The Persian affixes that make a word of an Arabic or Persian one, and their Ottoman spelling. */
const PERSIAN_SUFFIXES: [string, string][] = [
  ["perest", "پرست"], ["şinas", "شناس"], ["engiz", "انگيز"], ["istan", "ستان"], ["efza", "افزا"], ["hane", "خانه"],
  ["name", "نامه"], ["zade", "زاده"], ["numa", "نما"], ["nüma", "نما"], ["amiz", "آميز"], ["mend", "مند"], ["dar", "دار"],
  ["kar", "كار"], ["gah", "كاه"], ["bend", "بند"], ["dan", "دان"], ["nak", "ناك"], ["var", "وار"], ["keş", "كش"],
  ["baz", "باز"], ["ane", "انه"],
];
/** the Persian prefixes, as the books write them (with the circumflex: "nazar" is no "na" + "zar");
 *  "der" and "ber" before an Arabic or Persian word ("der" + "hâl", "ber" + "taraf") */
const PERSIAN_PREFIXES: [string, string][] = [["bî", "بى"], ["nâ", "نا"], ["pür", "پر"], ["der", "در"], ["ber", "بر"]];

/** The letters of `form` that `latin` (compared without circumflexes) takes from `start`. */
function lettersAt(form: string, start: number, latin: string): string | null {
  for (let end = start + 1; end <= form.length; end++) {
    const have = fold(form.slice(start, end)).replaceAll("’", "");
    if (have === latin) return form.slice(start, end);
    if (have.length > latin.length) break;
  }
  return null;
}

/** The root and a Persian affix of an Arabic or Persian word: "mânidâr" is "mâni" (Arabic) and
 *  "dâr"; "nâmütenâhî" "nâ" and "mütenâhî" (Arabic). A known word of three letters at least on
 *  the other side ("kadar" is no "ka" + "dar"). */
function withAffix(first: string, root: string): Pick<Explained, "root" | "affix"> {
  const { words } = table();
  const r = fold(root).replaceAll("’", "");
  const eastern = (w: string) => ["arapca", "farsca"].includes(words.get(w)?.origin ?? "");
  // a suffix at the end of the root or right after it
  const f = fold(first).replaceAll("’", "");
  for (const [suffix, ottoman] of PERSIAN_SUFFIXES) {
    for (const base of [r.endsWith(suffix) ? r.slice(0, -suffix.length) : null, f.startsWith(r + suffix) ? r : null]) {
      // (a base of four letters at least before a short suffix: "devvar" is no "dev" + "var")
      if (!base || base.length < (suffix.length <= 3 ? 4 : 3) || !eastern(base)) continue;
      const baseText = lettersAt(first, 0, base);
      if (!baseText) continue;
      const text = lettersAt(first, baseText.length, suffix);
      if (text) return { root: baseText, affix: { text, origin: "farsca", prefix: false, ottoman } };
    }
  }
  // a prefix before an Arabic or Persian word
  for (const [pre, ottoman] of PERSIAN_PREFIXES) {
    const rest = r.slice(fold(pre).length);
    if (!first.startsWith(pre) || rest.length < 3 || !eastern(rest)) continue;
    return { root: lettersAt(first, pre.length, rest) ?? root, affix: { text: pre, origin: "farsca", prefix: true, ottoman } };
  }
  return { root };
}

/** The origin of the root of a lower case form of the books and the root (its first part,
 *  "hakikat-i" by "hakikat"); `spell` gives the Ottoman of a form, when known. */
export function explain(form: string, spell?: (form: string) => string | null | undefined): Explained {
  const cache = (global.__eteKokenCache ??= new Map());
  // the result depends on whether the spellings are given
  const key = `${spell ? 1 : 0}${form}`;
  if (cache.has(key)) return cache.get(key)!;
  const first = form.replace(/^[’'-]+/, "").split(/-/)[0];
  let found: Found = { origin: null, root: null };
  if (grammar(first) || grammar(fold(first))) {
    // a grammar word: Turkic ones black (also when written otherwise: "gibi" كبى), Arabic and
    // Persian ones by their origin ("ve", "yani" green; "ki", "çünkü" yellow)
    const own = ofWord(first, spell, spell?.(first), false);
    found =
      own.origin === "arapca" || own.origin === "farsca" || own.origin === "bati"
        ? { origin: own.origin, root: first }
        : { origin: "turkce", root: first };
  } else {
    // without the suffix after its last apostrophe: "Kur’ân’la" is "kur’ân", not "kur" (only when
    // what follows is Turkish endings: the ’ of "mu’cizat" is the hamza of the Arabic)
    const last = first.lastIndexOf("’");
    const word = last >= 3 && CHAIN.test(fold(first.slice(last + 1))) ? first.slice(0, last) : first;
    const spelling = spell?.(first) ?? spell?.(form);
    for (const p of [first, word, word.replaceAll("’", ""), first.replaceAll("’", "")]) {
      // a word of one letter only as it is ("o")
      if (p.length < 2 && !table().words.has(p)) continue;
      const f = ofWord(p, spell, spelling, p !== first);
      if (f.origin) {
        found = f;
        break;
      }
    }
    // an Arabic or Persian word and a form of etmek or olmak written as one ("neşr-etmemek",
    // "seyr-eden", "mahv-olmuş"): by that word
    const helper = /^(.{3,}?)(ed|et|eyle|ol)([a-zçğıöşü]*)$/.exec(fold(word.replaceAll("’", "")));
    if (helper && (found.origin === "turkce" || found.origin === "eski" || !found.origin)) {
      const head = table().words.get(helper[1]);
      const rest = helper[2] + helper[3];
      if (head && (head.origin === "arapca" || head.origin === "farsca") && (rest === helper[2] || CHAIN.test(helper[3]) || VERBAL.test(helper[3]) || /^(?:m[ae]k|ip|ebil|ece|en|er|ti|di|miş)/.test(helper[3]))) {
        found = { origin: head.origin, root: helper[1] };
      }
    }
    // a word of the lügat is no Turkish root and endings ("emare" is no "em-" + "are")
    // (unless a verb and an ending only verbs take: "ed-ip", not the edîb of the lügat)
    const verbForm = !!found.root && table().stems.has(fold(found.root)) && VERB_ONLY.test(fold(word).slice(found.root.length));
    if ((found.origin === "turkce" || found.origin === "eski") && !verbForm && isLugatWord(word) && rootOf(word, spell) !== word && !table().words.has(fold(word))) {
      found = { origin: eastern(word, spelling, true), root: word };
    }
    // an Arabic phrase with its article: "fahrü’d-deveran", "ehlü’s-sünnet"
    if (!found.origin && /[’'](?:l|d|n|r|s|ş|t|z|zz|ss)-/.test(form)) found = { origin: "arapca", root: first };
    // the letters of Arabic words before a compound of Turkish words ("dalâlat" ضلالات is no "dal")
    if ((!found.origin || found.origin === "turkce") && spelling && ARABIC_ONLY.test(spelling) && found.root !== first) {
      found = { origin: "arapca", root: first };
    }
    if (!found.origin) {
      const plain = word.replaceAll("’", "");
      found = compound(plain, spell) ?? eastern(plain, spelling, false, true) ?? found;
    }
    // the endings of Arabic abstracts ("mükemmeliyet")
    if (!found.origin && ARABIC_ENDING.test(fold(first))) found = { origin: "arapca", root: first };
    // the Arabic letters of the word or of the whole form ("lil-âlemîn" للعالمين)
    const whole = spell?.(form);
    if (!found.origin && ((spelling && ARABIC_ONLY.test(spelling)) || (whole && ARABIC_ONLY.test(whole)))) {
      found = { origin: "arapca", root: first };
    }
  }
  // another language (Armenian, Mongolian …): not colored
  const known = found.origin && found.origin !== "diger" ? found.origin : null;
  const root = known ? rootIn(first, found.root) : null;
  // an Arabic or Persian word with a Persian affix: the two colored apart
  const result: Explained = { origin: known, root, ...(root && (known === "arapca" || known === "farsca") ? withAffix(first, root) : {}) };
  // the root of a word with an affix has its own origin ("misafir" Arabic of "misafirhane",
  // "mütenâhî" of "nâmütenâhî")
  if (result.affix && result.root) {
    const own = table().words.get(fold(result.root).replaceAll("’", ""))?.origin;
    if (own === "arapca" || own === "farsca") result.origin = own;
  }
  cache.set(key, result);
  return result;
}

/** The origin of the root of a lower case form of the books. */
export function origin(form: string, spell?: (form: string) => string | null | undefined): Origin | null {
  return explain(form, spell).origin;
}

/** The letters of `form` the `root` takes, as the form writes them: the root is compared without
 *  circumflexes and apostrophes ("kur’ân" of "kur’ân’ın", "kâinat" of "kâinatın"); all of it when
 *  the root is unknown or not found in it. */
function rootIn(form: string, root: string | null): string {
  if (!root) return form;
  const want = fold(root).replaceAll("’", "");
  for (let i = 1; i <= form.length; i++) {
    const have = fold(form.slice(0, i)).replaceAll("’", "");
    if (have === want) return form.slice(0, i);
    if (have.length > want.length) break;
  }
  return form;
}

/** A compound written as one word, by its first word: "âhirzaman" is "âhir" + "zaman". */
function compound(word: string, spell?: (form: string) => string | null | undefined): Found | null {
  const { words } = table();
  const f = fold(word);
  for (let i = f.length - 3; i >= 3; i--) {
    const first = words.get(f.slice(0, i));
    if (first && first.origin !== "bati" && first.origin !== "diger" && findRoot(f.slice(i), spell)) {
      return { origin: first.origin === "turkce" && (first.weak || first.old) ? "eski" : first.origin, root: f.slice(0, i) };
    }
  }
  return null;
}

const PERSIAN_LETTERS = /[پچژگ]/;
const PERSIAN_AFFIX = /(?:hane|hâne|gâh|gah|kâr|zade|zâde|name|nâme|âne|istan|istân|perest|engiz|nüma|nümâ|bâz|dâr|bend|şinas|güzar|ver)$|^(?:bî|nâ|ser|hem|pür|der)(?=[^aeıioöuü])/;

/** A word of the lügat, which explains the Arabic and Persian words of the books, also followed by
 *  Turkish endings ("berzahta": "berzah" + "ta"; `exact`: only as it is): Persian by its letters or
 *  affixes, else Arabic. */
function eastern(word: string, spelling?: string | null, exact?: boolean): Origin | null;
function eastern(word: string, spelling: string | null | undefined, exact: boolean, withRoot: true): Found | null;
function eastern(word: string, spelling?: string | null, exact = false, withRoot = false): Origin | Found | null {
  const f = fold(word);
  let root: string | null = meaningsOf(word).length > 0 || (!exact && meaningsOf(f).length > 0) ? word : null;
  for (let i = f.length - 1; !root && !exact && i >= 3; i--) {
    if (meaningsOf(f.slice(0, i)).length > 0 && CHAIN.test(f.slice(i))) root = f.slice(0, i);
  }
  if (!root) return null;
  const origin = persianOrArabic(word, spelling);
  return withRoot ? { origin, root } : origin;
}
