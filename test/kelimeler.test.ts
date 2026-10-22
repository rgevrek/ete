// The live writing of the app against tools/ete/kelimeler.tsv of risale-i-nur-kulliyati (OTA, ETE
// and OTE of every word form of the books, written by tools/ete.py words). Skipped without it.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { library } from "@/lib/books/library";
import { ete } from "@/lib/script/ete";
import { ottoman } from "@/lib/script/ottoman";

const KELIMELER = path.resolve(process.cwd(), "../risale-i-nur-kulliyati/tools/ete/kelimeler.tsv");

describe.skipIf(!existsSync(KELIMELER))("kelimeler.tsv", () => {
  const rows = readFileSync(KELIMELER, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t"));

  it("writes every form in ETE as tools/ete.py", () => {
    const wrong = rows.filter(([form, e]) => (ete(form) ?? "") !== e);
    expect(wrong.slice(0, 20)).toEqual([]);
  });

  it("writes every form in Ottoman as tools/osmanlica.py", () => {
    const { known } = library();
    const wrong = rows.filter(([form, , o]) => (ottoman(form, known) ?? "") !== o);
    console.log(`${wrong.length} of ${rows.length} differ`);
    expect(wrong.slice(0, 20)).toEqual([]);
  });
});
