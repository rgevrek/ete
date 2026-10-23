import { describe, expect, it } from "vitest";
import { meaningsOf } from "@/lib/lugat";
import { fold, search } from "@/lib/sozluk";

describe("sözlük", () => {
  it("folds circumflexes and apostrophes", () => {
    expect(fold("Kur’ân")).toBe("kuran");
    expect(fold("lisan-ı")).toBe("lisanı");
  });

  it("finds a word by its Latin, Ottoman and ETE, the exact one first", () => {
    expect(search("hakikat").entries[0].latin).toBe("hakikat");
    expect(search("حقيقت").entries[0].ottoman).toBe("حقيقت");
    expect(search("هاكىِكات").entries[0].latin).toBe("hakikat");
  });

  it("leaves out the derived forms on request", () => {
    expect(search("", { derived: false }).entries.every((e) => !e.derived)).toBe(true);
  });

  it("lists the words of a letter, Latin and Ottoman", () => {
    expect(search("", { letter: "ç" }).entries.every((e) => fold(e.latin).startsWith("ç"))).toBe(true);
    const se = search("", { letter: "ث" }).entries;
    expect(se.length).toBeGreaterThan(0);
    expect(se.every((e) => e.ottoman.startsWith("ث"))).toBe(true);
  });

  it("gives the meanings of the words of the lügat, by the word or one of its forms", () => {
    expect(meaningsOf("abd")[0].word).toBe("abd");
    expect(meaningsOf("abdalı").map((m) => m.word)).toContain("abd");
    expect(meaningsOf("sabittir")).toEqual([]);
  });
});
