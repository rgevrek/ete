// lugat/lugat.html of risale-i-nur-kulliyati (README "Lügat") as data/lugat.tsv: the headword, its
// forms in the books, its meanings and the pages it is on, one line per word.
//   node scripts/lugat.mjs <lugat.html> <lugat.tsv>
import { readFileSync, writeFileSync } from "node:fs";

const [source, target] = process.argv.slice(2);
const html = readFileSync(source, "utf8");
const unescape = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#x27;|&#39;/g, "’")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[\t\n]+/g, " ")
    .trim();
const attr = (tag, name) => unescape(new RegExp(` ${name}="([^"]*)"`).exec(tag)?.[1] ?? "");

/** the pages shown of a word, the others counted */
const PAGES = 12;

const lines = ["# word\tforms (,)\tmeanings (¦)\tpages (book:page, the first 12)\tnumber of pages"];
let entry = null;
const flush = () => {
  if (!entry?.meanings.length) return;
  const pages = entry.pages ? entry.pages.split(",") : [];
  lines.push([entry.word, entry.forms, entry.meanings.join(" ¦ "), pages.slice(0, PAGES).join(","), pages.length].join("\t"));
};
for (const m of html.matchAll(/<(dt|dd)(\b[^>]*)>([\s\S]*?)<\/\1>/g)) {
  if (m[1] === "dt") {
    flush();
    entry = { word: unescape(m[3]), forms: attr(m[2], "forms"), pages: attr(m[2], "occurrences"), meanings: [] };
  } else if (entry) {
    const meaning = unescape(m[3]);
    if (meaning && !entry.meanings.includes(meaning)) entry.meanings.push(meaning);
  }
}
flush();
writeFileSync(target, lines.join("\n") + "\n");
console.log(`lugat.tsv: ${lines.length - 1} words`);
