import { describe, expect, it } from "vitest";
import { echoes, writeText, type Writer } from "@/lib/books/render";
import { ete } from "@/lib/script/ete";

const w: Writer = { ottoman: (f) => ({ ben: "بن", gibi: "كبى" })[f] ?? null, ete: (f) => ete(f) };
const rows = (html: string, row: "l" | "o" | "e") =>
  [...html.matchAll(new RegExp(`<span class="${row}( x)?">([^<]*)</span>`, "g"))].map((m) => m[2]);

describe("writeText", () => {
  it("puts the marks that touch a word in its stack", () => {
    const html = writeText("“Ben gibi, 2 kere.”", w);
    expect(rows(html, "l")).toEqual(["“Ben", "gibi,", "kere.”"]);
    expect(rows(html, "o")).toEqual(["“بن", "كبى،", "kere.”"]);
    expect(html).toContain('<span class="nl"> 2 </span><span class="na"> ٢ </span>');
  });

  it("writes a suffix after an apostrophe apart from its word in ETE", () => {
    const html = writeText("’un", w);
    expect(rows(html, "l")).toEqual(["’un"]);
    expect(rows(html, "e")).toEqual([ete("-un")]);
  });

  it("colors an m- echo by the word it echoes", () => {
    expect(echoes("mumara", "kumara")).toBe(true);
    expect(echoes("milaç", "ilaç")).toBe(true);
    expect(echoes("mektup", "kitap")).toBe(false);
    const o: Writer = {
      ...w,
      origin: (f) => (f === "kumara" ? { origin: "arapca", root: "kumar" } : { origin: "farsca", root: "mum" }),
    };
    expect(writeText("kumara mumara", o)).toContain('<span class="l"><span class="ka">mumar</span>a</span>');
  });

  it("colors the root, not the endings", () => {
    const o: Writer = { ...w, origin: () => ({ origin: "arapca", root: "âciz" }) };
    expect(writeText("âcizler", o)).toContain('<span class="l"><span class="ka">âciz</span>ler</span>');
  });
});

describe("ETE: Allah and Muhammed", () => {
  it("writes the two names in their Arabic letters, their endings in ETE, and reads them back", async () => {
    const { eteToLatin } = await import("@/lib/script/ete");
    expect(ete("allah")).toBe("الله");
    expect(ete("allah’ın")).toBe("الله" + ete("-ın"));
    expect(ete("muhammed’e")).toBe("محمد" + ete("-e"));
    for (const f of ["allah", "allahın", "muhammed", "muhammede", "muhammediye"]) expect(eteToLatin(ete(f)!)).toBe(f);
  });
});
