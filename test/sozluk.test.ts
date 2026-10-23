import { describe, expect, it } from "vitest";
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
});
