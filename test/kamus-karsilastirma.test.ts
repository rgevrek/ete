// Our origins (lib/script/koken.ts) compared with Kâmûs-ı Türkî (risale-i-nur-kulliyati,
// Kamus-i Turki/Kamus-i Turki.html, unreviewed OCR): only for review, nothing is taken from it.
// Writes review/kamus-karsilastirma.tsv, the roots on which the two differ:
//   KAMUS_REPORT=1 npx vitest run test/kamus-karsilastirma.test.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { library } from "@/lib/books/library";
import { explain } from "@/lib/script/koken";

const KAMUS = "../risale-i-nur-kulliyati/Kamus-i Turki/Kamus-i Turki.html";
const ORIGIN: Record<string, string> = { ar: "arapca", fa: "farsca", fr: "bati", it: "bati", el: "bati", en: "bati", tr: "turkce", otk: "turkce", chg: "turkce" };
const NAMES: Record<string, string> = { arapca: "Arapça", farsca: "Farsça", turkce: "Türkçe", eski: "Türkçe", bati: "Batı" };
/** an Ottoman word for comparing: no marks; the yehs, the kefs (گ ڭ ك) one letter; ژ the ئر the OCR reads it as */
const norm = (o: string) =>
  o.replace(/[ً-ٰٟـ‌\s]/g, "").replace(/[یيى]/g, "ى").replace(/[كکگڭ]/g, "ك").replace(/[أإآٱ]/g, "ا").replace(/ۀ/g, "ه").replace(/ژ/g, "ئر");

it.skipIf(!process.env.KAMUS_REPORT || !existsSync(KAMUS))("compared with Kâmûs-ı Türkî", () => {
  // the entries of every headword spelling (all readings): their origins, "" for no label read
  const entries = new Map<string, string[]>();
  for (const m of readFileSync(KAMUS, "utf8").matchAll(/<dt id="[^"]+"(?: origin="([^"]+)")?(?: readings="([^"]+)")?>([^<]*)<\/dt>/g)) {
    const origin = m[1] ? ORIGIN[m[1]] : "";
    for (const h of new Set([m[3], ...(m[2] ?? "").split("|")].filter(Boolean).map(norm))) {
      if (h.length >= 3) entries.set(h, [...(entries.get(h) ?? []), origin]);
    }
  }
  const { counts, known } = library();
  const spell = (f: string) => known.get(f);
  const roots = new Map<string, { n: number; origin: string }>();
  for (const [f, n] of counts) {
    const e = explain(f, spell);
    if (!e.root || !e.origin) continue;
    const r = roots.get(e.root) ?? { n: 0, origin: e.origin };
    r.n += n;
    roots.set(e.root, r);
  }
  let compared = 0, agree = 0;
  const rows: string[] = [];
  for (const [root, { n, origin }] of roots) {
    const o = spell(root);
    const e = o ? entries.get(norm(o)) : undefined;
    // a spelling of one entry only (no homograph), whose label was read
    if (!e || e.length !== 1 || !e[0]) continue;
    compared++;
    if ((origin === "eski" ? "turkce" : origin) === e[0]) agree++;
    else rows.push([root, o, n, NAMES[origin], NAMES[e[0]], ""].join("\t"));
  }
  rows.sort((a, b) => Number(b.split("\t")[2]) - Number(a.split("\t")[2]));
  writeFileSync("review/kamus-karsilastirma.tsv", ["kok\tosmanlica\tkitaplarda\tbizim\tkamus\tdogru", ...rows].join("\n") + "\n");
  console.log(`compared ${compared} roots, the same ${agree} (${((100 * agree) / compared).toFixed(1)}%), differ ${rows.length}`);
});
