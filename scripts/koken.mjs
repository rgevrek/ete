// data/koken.tsv: the origin of Turkish words by Wiktionary (the kaikki.org extracts of its Turkish and
// Ottoman Turkish entries), the oldest language of a word's etymology: arapca, farsca, turkce (all
// Turkic: Proto-Turkic, Old Turkic, Old Anatolian and Ottoman Turkish), bati (Latin, French, Italian …),
// diger. With the stems of the verbs (etmek: et, ed) and the softened stems (kitap: kitab).
//   node scripts/koken.mjs [download directory]
// The downloads go to their own directory (default /tmp/ete-kaikki) and are read as data only.
import { createReadStream, createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const DIR = process.argv[2] ?? "/tmp/ete-kaikki";
const SOURCES = {
  "turkish.jsonl": "https://kaikki.org/dictionary/Turkish/kaikki.org-dictionary-Turkish.jsonl",
  "ottoman.jsonl": "https://kaikki.org/dictionary/Ottoman%20Turkish/kaikki.org-dictionary-OttomanTurkish.jsonl",
};
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "data", "koken.tsv");

const LANGS = [
  ["arapca", /^(Arabic|Classical Arabic|Egyptian Arabic|Aramaic|Classical Syriac|Hebrew|Akkadian)\b/],
  ["farsca", /^(Persian|Classical Persian|Middle Persian|Old Persian|Parthian|Sogdian|Kurdish|Tajik|Avestan)\b/],
  // Western, also Greek: "Batı"
  ["bati", /^(French|Middle French|Old French|Latin|Late Latin|Medieval Latin|New Latin|Ecclesiastical Latin|Italian|Venetian|Venetan|Genoese|Sicilian|Spanish|Old Spanish|Portuguese|English|German|Dutch|Romanian|Ladino|Greek|Byzantine Greek|Medieval Greek|Pontic Greek|Ancient Greek|Koine Greek)\b/],
  ["turkce", /^(Turkish|Ottoman Turkish|Old Anatolian Turkish|Old Turkic|Proto-Turkic|Proto-Common Turkic|Common Turkic|Turkic|Proto-Oghuz|Early Old Oghuz|Oghuz|Proto-Kipchak|Kipchak|Crimean Tatar|Middle Turkic|Chagatai|Karakhanid|Old Uyghur|Azerbaijani|Turkmen|Uzbek|Kazakh|Kyrgyz|Tatar|Uyghur)\b/],
  ["diger", /^(Armenian|Middle Armenian|Georgian|Mongolian|Classical Mongolian|Middle Mongol|Proto-Mongolic|Mongolic|Sanskrit|Chinese|Russian|Bulgarian|Serbo-Croatian|Hungarian|Albanian|Slavic|Proto-Slavic|Old Church Slavonic|Hindi|Prakrit)\b/],
];
const OTTOMAN = /^(Turkish|Ottoman Turkish|Old Anatolian Turkish)\b/;
const ofName = (name) => LANGS.find(([, re]) => re.test(name))?.[0] ?? null;
const PARTS = new Set(["suffix", "af", "affix", "compound", "com", "prefix", "confix"]);

/** The origin of an entry: the deepest Arabic, Persian or Western language its etymology names
 *  ("from Ottoman Turkish …, from Persian …, from Arabic …": Arabic), else of its tree; Turkic when
 *  it names an older Turkic one (Proto-Turkic, Old Turkic …); "parca:<word>" when made of parts. */
function classify(e) {
  const text = e.etymology_text ?? "";
  // the chain of the word: without what is in parentheses (glosses, "compare …"), up to its cognates
  const chain = (text.startsWith("Etymology tree") ? text.split("\n").slice(1).join(" ") : text)
    .replace(/\([^()]*\)/g, " ")
    .split(/\b(?:Cognate|cognate with|Cognates|Compare|Doublet|doublet of|Related to|Akin to|akin to|See also|cf\.)/)[0];
  // the root: the deepest language the chain names ("from Persian جنت, from Arabic جنة": Arabic);
  // a deeper Persian does not change an Arabic root ("rızık"), nothing a Western one ("from Italian
  // …, from Latin …, from Greek …"); a deeper Turkic one changes a Persian or Arabic ("hakan")
  let turkic = false;
  let root = null;
  let other = null;
  let unknown = false;
  for (const m of chain.matchAll(/\b(?:[Ff]rom|of|via)\s+(?:the (?:root |stem )?)?((?:[A-Z][a-z]+[- ]?){1,3})/g)) {
    const name = m[1].trim();
    const o = ofName(name);
    // Turkic only when an older Turkic language is named: "from Ottoman Turkish …" alone says
    // nothing of the root ("milliyet")
    if (o === "turkce") {
      if (OTTOMAN.test(name)) continue;
      turkic = true;
      if (root && root !== "bati") root = "turkce";
    } else if (o === "diger") other ??= o;
    else if (o) {
      if (!(root === "bati" && o !== "bati") && !(root === "arapca" && o === "farsca")) root = o;
    } else if (/^(?:[A-Z][a-z]+ )?[A-Z][a-z]+$/.test(name) && !/^(?:The|This|Ottoman)\b/.test(name)) {
      // a language not in the lists: not to be taken as Turkic
      unknown = true;
    }
  }
  if (root) return root;
  if (turkic) return "turkce";
  // made of parts: the origin of the first ("kardeş": "karın" + "-daş"; "nasıl": "ne" + "asl")
  for (const t of e.etymology_templates ?? []) if (PARTS.has(t.name) && t.args?.["2"]) return `parca:${t.args["2"]}`;
  // else the tree, from its oldest line: the first of its languages that is Arabic, Persian or Western
  if (text.startsWith("Etymology tree")) {
    for (const line of text.split("\n").slice(1)) {
      const name = line.trim();
      if (!name || /^(Inherited|Borrowed|From|Learned)\b/.test(name)) break;
      const o = ofName(name);
      if (o && o !== "turkce" && o !== "diger") return o;
    }
  }
  if (other || unknown) return "diger";
  // named only Ottoman Turkish: Turkic unless the word looks otherwise (lib/script/koken.ts)
  if (/\b(?:[Ff]rom|of)\s+Ottoman Turkish\b/.test(chain)) return "turkce?";
  return null;
}

const lower = (w) =>
  w.replaceAll("I", "ı").replaceAll("İ", "i").toLowerCase().replaceAll("i̇", "i").replace(/['‘]/g, "’");
const fold = (w) => w.normalize("NFD").replace(/̂/g, "").normalize("NFC");
const SOFT = { t: "d", k: "ğ", p: "b", ç: "c" };

async function download(file, url) {
  const target = path.join(DIR, file);
  if (existsSync(target)) return target;
  mkdirSync(DIR, { recursive: true });
  console.log(`downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(target));
  return target;
}

// every origin of a word: a word may be several (homographs, "hal" of Arabic and of French)
const all = new Map();
// the words of the Turkish entries; an Ottoman one alone is a romanization ("seni" سنى) that may
// be a form of a Turkish word ("sen" + "i"), marked "ota"
const turkishWords = new Set();
// the verbs: their stems apart ("damak" is no verb, no stem "da")
const verbs = new Set();
const put = (w, o, ottoman, pos) => {
  if (!w) return;
  if (!ottoman) turkishWords.add(w);
  if (pos === "verb") verbs.add(w);
  const list = all.get(w);
  if (!list) all.set(w, [o]);
  else if (!list.includes(o)) list.push(o);
};
/** The origin of a word of several: Western only when there is no other (they are rare in the
 *  books: "el" is the Turkic hand, not a loan), Turkic before Arabic and Persian ("biz"), a sure one
 *  before "turkce?" and the parts. */
function choose(list) {
  const sure = list.filter((o) => !o.startsWith("parca:") && !o.endsWith("?"));
  const eastern = sure.filter((o) => o !== "bati" && o !== "diger");
  return (eastern.includes("turkce") ? "turkce" : eastern[0]) ?? list.find((o) => o === "turkce?") ?? sure[0] ?? list[0];
}

/** The Turkish words whose Ottoman form is written otherwise ("kelmek" of "gelmek"): their Ottoman
 *  entry, romanized, has another consonant than the Turkish word it is the ancestor of. */
const oldForms = new Set();
const ROMAN = { ḳ: "k", ġ: "g", ṣ: "s", ż: "z", ẓ: "z", ḍ: "d", ṭ: "t", ḥ: "h", ḫ: "h", ñ: "n", ŋ: "n", ẕ: "z", s̱: "s", ʿ: "", ʾ: "", "'": "", "’": "" };
const consonants = (w) =>
  [...lower(w).normalize("NFD").replace(/[\u0300-\u036f]/g, "")]
    .map((c) => ROMAN[c] ?? c)
    .join("")
    .replace(/[aeıioöuüâîû\-\s]/g, "")
    .replace(/ğ/g, "g")
    .replace(/(.)\1/g, "$1")
    // the final consonant as today's spelling writes it: cihad cihat, ard art, cebhe cephe
    .replace(/b(?=[^aeıioöuü]|$)/g, "p")
    .replace(/d$/, "t")
    .replace(/c$/, "ç")
    .replace(/g$/, "k");

async function read(file, ottoman) {
  for await (const line of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) {
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    const o = classify(e);
    if (!o) continue;
    const latin = ottoman
      ? (e.forms?.find((f) => f.tags?.includes("romanization"))?.form ?? e.head_templates?.[0]?.args?.tr)
      : e.word;
    if (typeof latin === "string" && !latin.includes(" ")) put(lower(latin), o, ottoman, e.pos);
    if (ottoman && typeof latin === "string") {
      for (const d of e.descendants ?? []) {
        if (d.lang_code === "tr" && d.word && !d.word.startsWith("-") && !latin.startsWith("-") && consonants(d.word) !== consonants(latin)) {
          oldForms.add(lower(d.word));
        }
      }
    }
  }
}

await read(await download("turkish.jsonl", SOURCES["turkish.jsonl"]), false);
await read(await download("ottoman.jsonl", SOURCES["ottoman.jsonl"]), true);

const words = new Map([...all].map(([w, list]) => [w, choose(list)]));

// made of parts: the origin of the first part ("kardeş": "karın" + "-daş")
for (const [w, o] of words) {
  if (!o.startsWith("parca:")) continue;
  // the first part, also a verb by its stem ("sön-" of "sönmek", "uza-" of "uzamak")
  const part = lower(o.slice(6)).replace(/^-|-$/g, "");
  const first = words.get(part) ?? words.get(part + "mak") ?? words.get(part + "mek");
  if (first && !first.startsWith("parca:")) words.set(w, first);
  else words.delete(w);
}

// the words, and apart from them the stems of the verbs ("ne" is a word, not the stem of "nemek")
const out = new Map();
const stems = new Map();
/** the word a written form comes from ("ağz" of "ağız"): its flags are that word's */
const source = new Map();
const add = (map, w, o, from = w) => {
  if (w.length < 2) return;
  // a form of a Turkish word over a romanized Ottoman entry only of its letters ("dib" of "dip")
  const over = map.has(w) && !turkishWords.has(source.get(w) ?? w) && turkishWords.has(from);
  if (!map.has(w) || over) {
    map.set(w, o);
    source.set(w, from);
  }
};
for (const [w, o] of words) add(out, w, o);
for (const [w, o] of words) {
  add(out, fold(w), o, w);
  // a final p ç t k before a vowel: kitap kitab, ağaç ağac
  const last = w.at(-1);
  if (SOFT[last] && w.length >= 3) add(out, w.slice(0, -1) + SOFT[last], o, w);
  // the narrow vowel of the last syllable dropped before a vowel: ağız ağz(ı), akıl akl(ı), isim ism(i)
  const narrow = /^(.*[aeıioöuüâîû].*[^aeıioöuüâîû])[ıiuü]([^aeıioöuüâîû])$/.exec(w);
  if (narrow && w.length >= 4) add(out, narrow[1] + narrow[2], o, w);
  // the stem of a verb, also softened: etmek et, ed; basmak bas (not the Italian "bas"); the first one
  const verb = verbs.has(w) ? /^(.{2,})m[ae]k$/.exec(w) : null;
  if (!verb) continue;
  const stem = verb[1];
  const end = stem.at(-1);
  for (const v of SOFT[end] ? [stem, stem.slice(0, -1) + SOFT[end]] : [stem]) {
    if (stems.has(v)) continue;
    stems.set(v, o);
    source.set(`-${v}`, w);
  }
}

const lines = [
  "# word\torigin (arapca farsca turkce bati diger; turkce? when only Ottoman Turkish is named)\tfiil: a verb stem; ota: a romanized Ottoman entry only (not of today's Turkish); eski: a Turkish word whose Ottoman form is written otherwise. From Wiktionary (kaikki.org)",
];
// eski: a Turkic word not of today's Turkish (only an Ottoman entry: "ota") or of another old form
const rows = [
  ...[...out].map(([w, o]) => {
    const from = source.get(w) ?? w;
    return [w, o, !turkishWords.has(from) ? "ota" : oldForms.has(from) && o.startsWith("turkce") ? "eski" : ""];
  }),
  ...[...stems].map(([w, o]) => {
    const from = source.get(`-${w}`) ?? w;
    return [w, o, !turkishWords.has(from) ? "fiil,ota" : oldForms.has(from) && o.startsWith("turkce") ? "fiil,eski" : "fiil"];
  }),
];
for (const [w, o, kind] of rows.sort((a, b) => a[0].localeCompare(b[0], "tr") || a[2].localeCompare(b[2]))) {
  lines.push(kind ? `${w}\t${o}\t${kind}` : `${w}\t${o}`);
}
writeFileSync(OUT, lines.join("\n") + "\n");
const by = {};
for (const o of out.values()) by[o] = (by[o] ?? 0) + 1;
console.log(`koken.tsv: ${out.size} words, ${stems.size} verb stems, ${oldForms.size} old forms`, by);
