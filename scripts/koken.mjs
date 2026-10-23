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
  ["bati", /^(French|Middle French|Old French|Latin|Late Latin|Medieval Latin|New Latin|Italian|Venetian|Genoese|Spanish|Portuguese|English|German|Dutch|Romanian|Ladino)\b/],
  ["turkce", /^(Turkish|Ottoman Turkish|Old Anatolian Turkish|Old Turkic|Proto-Turkic|Proto-Common Turkic|Common Turkic|Proto-Oghuz|Oghuz|Proto-Kipchak|Middle Turkic|Chagatai|Karakhanid|Old Uyghur|Azerbaijani|Turkmen|Uzbek|Kazakh|Kyrgyz|Tatar|Uyghur)\b/],
  ["diger", /^(Greek|Byzantine Greek|Ancient Greek|Armenian|Georgian|Mongolian|Middle Mongol|Proto-Mongolic|Sanskrit|Chinese|Russian|Bulgarian|Serbo-Croatian|Hungarian|Albanian|Slavic|Proto-Slavic|Old Church Slavonic|Hindi|Prakrit)\b/],
];
const OTTOMAN = /^(Turkish|Ottoman Turkish|Old Anatolian Turkish)\b/;
const ofName = (name) => LANGS.find(([, re]) => re.test(name))?.[0] ?? null;
const PARTS = new Set(["suffix", "af", "affix", "compound", "com", "prefix", "confix"]);

/** The origin of an entry: the deepest Arabic, Persian or Western language its etymology names
 *  ("from Ottoman Turkish …, from Persian …, from Arabic …": Arabic), else of its tree; Turkic when
 *  it names an older Turkic one (Proto-Turkic, Old Turkic …); "parca:<word>" when made of parts. */
function classify(e) {
  const text = e.etymology_text ?? "";
  // the chain of the word, not its cognates: "… from Arabic جنة. Cognate with …"
  const chain = (text.startsWith("Etymology tree") ? text.split("\n").slice(1).join(" ") : text).split(
    /\b(?:Cognate|Cognates|Compare|compare|Doublet|Related to|related to|cf\.|Akin to|akin to|See also)\b/,
  )[0];
  // the root: the deepest language the chain names ("from Persian جنت, from Arabic جنة": Arabic);
  // Arabic, Persian or Western before an older one ("from Italian …, from Latin …, from Greek …")
  let turkic = false;
  let root = null;
  let other = null;
  for (const m of chain.matchAll(/\b(?:from|of|via)\s+((?:[A-Z][a-z]+[- ]?){1,3})/g)) {
    const name = m[1].trim();
    const o = ofName(name);
    // Turkic only when an older Turkic language is named: "from Ottoman Turkish …" alone says
    // nothing of the root ("milliyet")
    if (o === "turkce") turkic ||= !OTTOMAN.test(name);
    else if (o === "diger") other ??= o;
    // a deeper language of the line does not change a Western or an Arabic root: "from Arabic …,
    // from Middle Persian …" is Arabic ("rızık"); "from Persian …, from Arabic …" is Arabic ("cennet")
    else if (o && !(root === "bati" && o !== "bati") && !(root === "arapca" && o === "farsca")) root = o;
  }
  if (root) return root;
  // else the tree, from its oldest line: the first of its languages that is Arabic, Persian or Western
  if (text.startsWith("Etymology tree")) {
    for (const line of text.split("\n").slice(1)) {
      const name = line.trim();
      if (!name || /^(Inherited|Borrowed|From|Learned)\b/.test(name)) break;
      const o = ofName(name);
      if (o && o !== "turkce" && o !== "diger") return o;
    }
  }
  if (turkic) return "turkce";
  if (other) return other;
  // named only Ottoman Turkish: Turkic unless the word looks otherwise (lib/script/koken.ts)
  if (/\b(?:from|of)\s+Ottoman Turkish\b/.test(chain)) return "turkce?";
  for (const t of e.etymology_templates ?? []) if (PARTS.has(t.name) && t.args?.["2"]) return `parca:${t.args["2"]}`;
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
const put = (w, o, ottoman) => {
  if (!w) return;
  if (!ottoman) turkishWords.add(w);
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
    if (typeof latin === "string" && !latin.includes(" ")) put(lower(latin), o, ottoman);
  }
}

await read(await download("turkish.jsonl", SOURCES["turkish.jsonl"]), false);
await read(await download("ottoman.jsonl", SOURCES["ottoman.jsonl"]), true);

const words = new Map([...all].map(([w, list]) => [w, choose(list)]));

// made of parts: the origin of the first part ("kardeş": "karın" + "-daş")
for (const [w, o] of words) {
  if (!o.startsWith("parca:")) continue;
  const first = words.get(lower(o.slice(6)).replace(/^-|-$/g, ""));
  if (first && !first.startsWith("parca:")) words.set(w, first);
  else words.delete(w);
}

// the words, and apart from them the stems of the verbs ("ne" is a word, not the stem of "nemek")
const out = new Map();
const stems = new Map();
const add = (map, w, o) => {
  if (w.length >= 2 && !map.has(w)) map.set(w, o);
};
for (const [w, o] of words) add(out, w, o);
for (const [w, o] of words) {
  add(out, fold(w), o);
  // a final p ç t k before a vowel: kitap kitab, ağaç ağac
  const last = w.at(-1);
  if (SOFT[last] && w.length >= 3) add(out, w.slice(0, -1) + SOFT[last], o);
  // the stem of a verb, also softened: etmek et, ed; basmak bas (not the Italian "bas")
  const verb = /^(.{2,})m[ae]k$/.exec(w);
  if (!verb) continue;
  stems.set(verb[1], o);
  const end = verb[1].at(-1);
  if (SOFT[end]) stems.set(verb[1].slice(0, -1) + SOFT[end], o);
}

const lines = [
  "# word\torigin (arapca farsca turkce bati diger; turkce? when only Ottoman Turkish is named)\tfiil: a verb stem; ota: a romanized Ottoman entry only. From Wiktionary (kaikki.org)",
];
const rows = [
  ...[...out].map(([w, o]) => [w, o, turkishWords.has(w) ? "" : "ota"]),
  ...[...stems].map(([w, o]) => [w, o, "fiil"]),
];
for (const [w, o, kind] of rows.sort((a, b) => a[0].localeCompare(b[0], "tr") || a[2].localeCompare(b[2]))) {
  lines.push(kind ? `${w}\t${o}\t${kind}` : `${w}\t${o}`);
}
writeFileSync(OUT, lines.join("\n") + "\n");
const by = {};
for (const o of out.values()) by[o] = (by[o] ?? 0) + 1;
console.log(`koken.tsv: ${out.size} words, ${stems.size} verb stems`, by);
