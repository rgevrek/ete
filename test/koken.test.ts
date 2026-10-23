import { describe, expect, it } from "vitest";
import { library } from "@/lib/books/library";
import { explain, origin } from "@/lib/script/koken";

const spell = (f: string) => library().known.get(f);

describe("kelime kökenleri", () => {
  it("takes the Arabic and Persian words of the lügat that Wiktionary lacks", () => {
    for (const f of ["tasaffi", "hurafattan", "berzahta", "berzahiyeden", "kuburun", "rivayatla", "nass-ı"]) {
      expect(origin(f, spell)).toBe("arapca");
    }
  });

  it("finds the origin of a word and of its forms", () => {
    expect(origin("hakikat", spell)).toBe("arapca");
    expect(origin("hakikatlerini", spell)).toBe("arapca");
    expect(origin("zaman", spell)).toBe("farsca");
    expect(origin("kardeş", spell)).toBe("turkce");
    expect(origin("jandarma", spell)).toBe("bati");
    // through Arabic: Arabic, also of a Greek or Latin source ("kanun" < kanṓn)
    for (const f of ["kanun", "kalem", "felsefe", "iklim"]) expect(origin(f, spell)).toBe("arapca");
    for (const f of ["kilise", "okul"]) expect(origin(f, spell)).toBe("bati");
  });

  it("finds the verbs by their stems", () => {
    for (const f of ["ediyorum", "dedi", "diyor", "istiyor", "kalır"]) expect(origin(f, spell)).toBe("turkce");
    expect(origin("gösterir", spell)).toBe("turkce");
  });

  it("takes no short root a word is not made of", () => {
    expect(origin("taamı", spell)).toBe("arapca");
    expect(origin("daimdir", spell)).not.toBe("turkce");
    expect(origin("milliyetsizler", spell)).toBe("arapca");
  });

  it("takes no Western homograph of an eastern word, nor a word before its apostrophes", () => {
    expect(origin("kur’ân’la", spell)).toBe("arapca");
    expect(origin("halde", spell)).toBe("arapca");
    expect(origin("elinde", spell)).toBe("turkce");
    expect(origin("bulut", spell)).toBe("turkce");
    // a grammar word of Arabic or Persian: by its origin (bazı بعضى)
    expect(origin("bazı", spell)).toBe("arapca");
    expect(origin("nedir", spell)).toBe("turkce");
    expect(origin("beni", spell)).toBe("turkce");
    expect(origin("seni", spell)).toBe("turkce");
    expect(origin("bizim", spell)).toBe("turkce");
    expect(origin("bak", spell)).toBe("turkce");
    expect(origin("der", spell)).toBe("turkce");
    expect(origin("dikkat", spell)).toBe("arapca");
    for (const f of ["olan", "olarak", "sen", "yalnız"]) expect(origin(f, spell)).toBe("turkce");
    expect(origin("küre-i", spell)).toBe("arapca");
    for (const f of ["din", "insanlar", "insanların", "idare", "kuburun", "mu’cizat-ı", "rızık", "emare", "elem", "en’am"]) {
      expect(origin(f, spell)).toBe("arapca");
    }
    for (const f of ["benden", "deriz", "derler", "mu", "ver", "ağzına"]) expect(origin(f, spell)).toBe("turkce");
    for (const f of ["aklı", "ismi", "fikri"]) expect(origin(f, spell)).toBe("arapca");
    expect(origin("kuvvetli", spell)).toBe("arapca");
    expect(origin("bilir", spell)).toBe("turkce");
    expect(origin("bilmiyorlar", spell)).toBe("turkce");
    expect(origin("cennet", spell)).toBe("arapca");
  });

  it("keeps the grammar words and their forms black, the old Turkic words red", () => {
    for (const f of ["ile", "için", "gibi", "bunun", "onlara", "benim", "bu", "bir"]) expect(origin(f, spell)).toBe("turkce");
    for (const f of ["ve", "yani", "fakat", "kadar"]) expect(origin(f, spell)).toBe("arapca");
    for (const f of ["ki", "her", "çünkü", "eğer"]) expect(origin(f, spell)).toBe("farsca");
    for (const f of ["el", "ayak"]) expect(origin(f, spell)).toBe("turkce");
    for (const f of ["aslan", "vurmak", "yirmi"]) expect(origin(f, spell)).toBe("eski");
    // ط is t or d ("dağ" طاغ), the g is گ ("gelmek" گلمك): as today
    for (const f of ["dağ", "doğru", "dokuz", "dolu", "gelmek", "göz", "görüyorum"]) expect(origin(f, spell)).toBe("turkce");
    for (const f of ["deniz", "büyük"]) expect(origin(f, spell)).toBe("turkce");
    expect(origin("hizmetçi", spell)).toBe("arapca");
    expect(explain("âcizler", spell)).toEqual({ origin: "arapca", root: "âciz" });
    for (const [f, root] of [["bilen", "bil"], ["bilenler", "bil"], ["soruyor", "sor"], ["kanı", "kan"]]) {
      expect(explain(f, spell).root).toBe(root);
    }
    for (const f of ["deki", "ler"]) expect(origin(f, spell)).toBe("turkce");
  });

  it("colors a Persian affix apart from its Arabic root", () => {
    expect(explain("mânidar", spell)).toMatchObject({ origin: "arapca", root: "mâni", affix: { text: "dar", prefix: false } });
    expect(explain("nâmütenâhî", spell)).toMatchObject({ origin: "arapca", root: "mütenâhî", affix: { text: "nâ", prefix: true } });
    expect(explain("misafirhane", spell)).toMatchObject({ origin: "arapca", root: "misafir" });
    for (const f of ["kadar", "nazar", "efkâr", "inkâr", "iktidar", "derin", "derece", "beraber"]) expect(explain(f, spell).affix).toBeUndefined();
    expect(explain("derhal", spell)).toMatchObject({ origin: "arapca", root: "hal", affix: { text: "der", prefix: true } });
  });

  it("takes a root the Ottoman spelling begins with before a longer one", () => {
    expect(origin("şudur", spell)).toBe("turkce");
  });

  it("colors a compound by its first part", () => {
    expect(origin("hakikat-i", spell)).toBe("arapca");
    expect(origin("âhirzaman", spell)).toBe("arapca");
  });
});
