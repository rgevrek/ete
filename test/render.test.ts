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
    const o: Writer = { ...w, origin: (f) => (f === "kumara" ? "arapca" : f === "mumara" ? "farsca" : null) };
    expect(writeText("kumara mumara", o)).toContain('<span class="l ka">mumara</span>');
  });
});
