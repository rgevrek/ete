import { describe, expect, it } from "vitest";
import { library } from "@/lib/books/library";
import { origin } from "@/lib/script/koken";

const spell = (f: string) => library().known.get(f);

describe("kelime kökenleri", () => {
  it("finds the origin of a word and of its forms", () => {
    expect(origin("hakikat", spell)).toBe("arapca");
    expect(origin("hakikatlerini", spell)).toBe("arapca");
    expect(origin("zaman", spell)).toBe("farsca");
    expect(origin("kardeş", spell)).toBe("turkce");
    expect(origin("jandarma", spell)).toBe("bati");
  });

  it("finds the verbs by their stems", () => {
    for (const f of ["gösterir", "ediyorum", "dedi", "diyor", "istiyor", "kalır"]) expect(origin(f, spell)).toBe("turkce");
  });

  it("takes no short root a word is not made of", () => {
    expect(origin("taamı", spell)).toBe("arapca");
    expect(origin("daimdir", spell)).not.toBe("turkce");
    expect(origin("milliyetsizler", spell)).toBe("arapca");
  });

  it("colors a compound by its first part", () => {
    expect(origin("hakikat-i", spell)).toBe("arapca");
  });
});
