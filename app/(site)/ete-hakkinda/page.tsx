import type { Metadata } from "next";
import Link from "next/link";
import { library } from "@/lib/books/library";
import { ete, table } from "@/lib/script/ete";
import { lower, splitWords } from "@/lib/script/latin";
import { ottoman } from "@/lib/script/ottoman";
import "./hakkinda.css";

export const metadata: Metadata = { title: "ETE hakkında" };

const ORNEK = "Bismillâh her hayrın başıdır. Biz dahi başta ona başlarız.";

/** kanji, hiragana, kanji of the katakana, katakana, reading */
const KANA = [
  ["安", "あ", "阿", "ア", "a"],
  ["以", "い", "伊", "イ", "i"],
  ["宇", "う", "宇", "ウ", "u"],
  ["衣", "え", "江", "エ", "e"],
  ["於", "お", "於", "オ", "o"],
];

/** the character, the Zhuyin letter made of it, its sound */
const ZHUYIN = [
  ["勹", "ㄅ", "b"],
  ["冂", "ㄇ", "m"],
  ["匚", "ㄈ", "f"],
  ["乃", "ㄋ", "n"],
  ["丂", "ㄎ", "k"],
  ["厶", "ㄙ", "s"],
];

/** traditional, simplified, meaning */
const SADE = [
  ["國", "国", "ülke"],
  ["學", "学", "ilim, öğrenmek"],
  ["書", "书", "kitap"],
  ["門", "门", "kapı"],
  ["馬", "马", "at"],
];

/** The letters and marks ETE uses that the Ottoman spelling does not (or not so): where they come
 *  from, the rule, examples (written live). */
const YENI: { harf: string; ses: string; kaynak: string; kural: string; ornekler: string[] }[] = [
  {
    harf: "ە",
    ses: "e (ortada, sonda)",
    kaynak: "Uygur ve Kazak Arap yazılarının e (ä) harfi; Kürtçe (Sorani) yazıda da e.",
    kural: "Kelime ortasında ve sonunda e. Osmanlıcadaki gibi ه değil: ه her yerde h’dir.",
    ornekler: ["hem", "bereket", "nefse"],
  },
  {
    harf: "أ",
    ses: "e (başta)",
    kaynak: "Arabî hemzeli elif; Osmanlıcada hemze için kullanılır.",
    kural: "Kelime başındaki e. Başındaki a ise آ’dır.",
    ornekler: ["evet", "eser", "ebedî"],
  },
  {
    harf: "ى",
    ses: "ı",
    kaynak: "Noktasız ye (elif-i maksure şekli).",
    kural: "Hareke almayan ى her yerde ı; başta اى. Osmanlıcada ı ve i ayrılmaz, ETE’de ayrılır.",
    ornekler: ["kırk", "ılık", "yazı"],
  },
  {
    harf: "ىِ",
    ses: "i",
    kaynak: "Noktasız ye ve Arabî esre (kesre) harekesi.",
    kural: "Esreli ى her yerde i; başta اىِ. Esre i’yi ı’dan ayırır.",
    ornekler: ["bir", "iman", "gibi"],
  },
  {
    harf: "وْ",
    ses: "o",
    kaynak: "Vav ve Arabî cezm (sükûn) işareti.",
    kural: "Cezmli و her yerde o; başta اوْ. Cezmsiz و ise v’dir.",
    ornekler: ["ol", "yok", "sonra"],
  },
  {
    harf: "ؤ",
    ses: "ö",
    kaynak: "Hemzeli vav; Güney Azerbaycan (İran) Türkçesinin bugünkü Arap yazısında ö.",
    kural: "Kelime ortasında ve sonunda ö; başta ئؤ.",
    ornekler: ["söz", "göz", "ölüm"],
  },
  {
    harf: "ۇ",
    ses: "u",
    kaynak: "Uygur ve Kazak Arap yazılarında u; Güney Azerbaycan yazısında da u.",
    kural: "Kelime ortasında ve sonunda u; başta اۇ.",
    ornekler: ["kul", "nur", "uzun"],
  },
  {
    harf: "ۆ",
    ses: "ü",
    kaynak: "Güney Azerbaycan yazısında ü; Uygurcada ö, Kürtçede o okunan harf.",
    kural: "Kelime ortasında ve sonunda ü; başta ئۆ.",
    ornekler: ["gül", "gün", "üç"],
  },
  {
    harf: "ئ",
    ses: "ön sesli başta (ئؤ, ئۆ)",
    kaynak: "Hemze kürsüsü; Uygur yazısında her kelime başı seslinin önünde.",
    kural: "Kelime başındaki ö ve ü ئ ile başlar: ئؤ, ئۆ. Diğer başta sesliler elif ile: آ أ اى اىِ اوْ اۇ.",
    ornekler: ["öz", "ölçü", "ümit"],
  },
  {
    harf: "آ ىِٓ ۇٓ",
    ses: "uzun â, î, û",
    kaynak: "Arabî medde işareti (Osmanlıcada آ’da).",
    kural: "Uzun sesli kısa sesliyle medde: â آ, î ىِٓ, û ۇٓ. Başta â, a’nın آ’sıyla aynı yazılır.",
    ornekler: ["kâinat", "Rahîm", "ulûm"],
  },
  {
    harf: "هـ",
    ses: "h (sonda)",
    kaynak: "Ha’nın kelime başı şekli ve keşide (tatvil) çizgisi.",
    kural: "Sondaki h هـ yazılır; tek başına ە’ye benzemesin diye.",
    ornekler: ["sabah", "günah", "nikâh"],
  },
];

/** A sentence in another alphabet, word by word. */
function write(text: string, by: (form: string) => string | null): string {
  return splitWords(text)
    .map((p) => (p.word ? (by(lower(p.text)) ?? p.text) : p.text.replace(",", "،")))
    .join("");
}

export default function About() {
  const { known } = library();
  const letters = [...table()].filter(([letter]) => !"âîû".includes(letter));
  return (
    <main className="sayfa hakkinda">
      <h1>
        ETE hakkında <span lang="tr-Arab">أتە</span>
      </h1>
      <p className="giris-yazi">
        ETE, <strong>Esas Türk Elifbası</strong>: Türkçenin her harfini bir Arabî harf ile, sesliler de yazılarak yazan bir
        elifbâ. Bu sitede Risale-i Nur Külliyatı Latin, Osmanlıca ve ETE harfleriyle, kelime kelime alt alta okunabilir.
      </p>

      <section>
        <h2>1. Vizyon</h2>
        <p>Ortak yazı ve dil ile, Risale-i Nur vasıtasıyla Türk ittihadına vesile olmak.</p>
      </section>

      <section>
        <h2>2. Tarihçe</h2>
        <p>
          Osmanlıcada kelimeler okunduğu gibi yazılmaz: sesliler çoğu zaman yazılmaz, bir harf birkaç ses okunur, Arabî
          ve Farisî kelimeler kendi imlâlarıyla yazılır. Okuma ile yazma arasındaki bu farklardan doğan okuma
          zorlukları, Latin harflerine geçmek için bahane gösterilebildi.
        </p>
      </section>

      <section>
        <h2>3. İttihada mâni</h2>
        <p>
          Sovyet, Çin ve Latin/Avrupa (ve daha fazla) etkileri Türk dillerini farklılaştırdı; birbirleriyle anlaşılamaz
          hâle geldiler. Yazıları da farklılaştı: Kiril, Latin ve Arabî harflerin ayrı ayrı şekilleriyle yazan Türkler
          birbirlerinin yazısını okuyamaz hâle geldi.
        </p>
      </section>

      <section>
        <h2>4. Benzer çözümler</h2>
        <p>
          Uzak Doğuda zor harflere karşılık, okuması kolay ve kendi geleneklerine yakın harfler geliştirildi. Yeni harfler
          eski yazının içinden çıktı; yazı geleneği kesilmeden okuma kolaylaştı.
        </p>

        <h3>Japonya: kana</h3>
        <p>
          Binlerce Çin harfine (kanji) karşılık, her biri bir hece okunan iki küçük harf takımı: <strong>hiragana</strong>{" "}
          Çin harflerinin el yazısı (şekeste) şekillerinden, <strong>katakana</strong> Çin harflerinin birer parçasından
          çıkarıldı. Kanji yine kullanılır; okunuşu yanına kana ile yazılabilir (furigana).
        </p>
        <table className="uzakdogu">
          <thead>
            <tr>
              <th>Kaynak</th>
              <th>Hiragana</th>
              <th>Katakana</th>
              <th>Okunuş</th>
            </tr>
          </thead>
          <tbody>
            {KANA.map(([han, hira, hanKata, kata, oku]) => (
              <tr key={oku}>
                <td lang="ja">
                  {han}
                  {hanKata !== han && <span className="kaynak-harf"> / {hanKata}</span>}
                </td>
                <td lang="ja">{hira}</td>
                <td lang="ja">{kata}</td>
                <td>{oku}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="not">
          あ, 安’ın el yazısı şeklinden; ア, 阿’nın sol parçasından. Kelime: <span lang="ja">漢字</span> (kanji) ={" "}
          <span lang="ja">かんじ</span>, <span lang="ja">日本</span> (Nihon) = <span lang="ja">にほん</span>.
        </p>

        <h3>Çin: Zhuyin (Bopomofo) ve sadeleştirilmiş harfler</h3>
        <p>
          1913’te kabul edilen <strong>Zhuyin</strong> harfleri, Çin harflerinin sesini göstermek için eski harflerin
          parçalarından yapıldı; Latin harfleri değil. Tayvan’da bugün de okumayı öğretmekte kullanılır.
        </p>
        <table className="uzakdogu">
          <thead>
            <tr>
              <th>Eski harf</th>
              <th>Zhuyin</th>
              <th>Ses</th>
            </tr>
          </thead>
          <tbody>
            {ZHUYIN.map(([han, zhu, ses]) => (
              <tr key={zhu}>
                <td lang="zh">{han}</td>
                <td lang="zh">{zhu}</td>
                <td>{ses}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="not">
          Kelime: <span lang="zh">注音</span> (zhùyīn, “ses işareti”) = <span lang="zh">ㄓㄨˋ ㄧㄣ</span>.
        </p>
        <p>
          1950’lerde Çin Halk Cumhuriyeti harflerin çok çizgili şekillerini <strong>sadeleştirdi</strong>; Japonya
          da 1946’da birçok harfi kısalttı (shinjitai). Harf yine aynı harf, yalnız yazması kolay:
        </p>
        <table className="uzakdogu">
          <thead>
            <tr>
              <th>Eski</th>
              <th>Sade</th>
              <th>Mânâ</th>
            </tr>
          </thead>
          <tbody>
            {SADE.map(([eski, sade, mana]) => (
              <tr key={eski}>
                <td lang="zh-Hant">{eski}</td>
                <td lang="zh-Hans">{sade}</td>
                <td>{mana}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="not">
          國→国 ve 學→学 Japonya’da da böyle sadeleşti; 書→书, 門→门, 馬→马 yalnız Çin’de.
        </p>
      </section>

      <section>
        <h2>5. Çözüm</h2>
        <p>
          Azerbaycan Türkçesinde ve Çağataycada kullanılan, Arabî ve Farisî harflerden türemiş harfleri kullanıp
          Türkçeye uyan bir elifbâ: <strong>Esas Türk Elifbası</strong>. Her Türkçe harfin bir karşılığı vardır;
          sesliler yazılır (a, e, ı, i, o, ö, u, ü ayrı ayrı); bir seslinin kelime başında, ortasında ve sonunda şekli
          bellidir. Böylece Latin harfleriyle yazılan Türkçe harf harf ETE’ye, ETE de Latin harflerine çevrilebilir; Arabî
          harfler ise Osmanlıcaya ve Kur’ân’a köprü olarak kalır.
        </p>
        <p>
          İki isim bu kuralın dışındadır: <strong>Allah</strong> ve <strong>Muhammed</strong>, Osmanlıcada ve
          Kur’ân’da olduğu gibi Arabî harfleriyle yazılır (<span lang="tr-Arab">الله</span>,{" "}
          <span lang="tr-Arab">محمد</span>); ekleri ise ETE ile.
        </p>
      </section>

      <section>
        <h2>Yeni harfler</h2>
        <p>
          ETE’nin ünsüzleri Osmanlıcanınkilerdir (ب پ ت ج چ د ر ز ژ س ش غ ف ك گ ل م ن و ي), ama her ses tek harfle
          yazılır: s hep س, z hep ز, t hep ت, h hep ه, k hep ك; ث ح خ ذ ص ض ط ظ ع ق kullanılmaz. Seslileri ayırmak
          için Osmanlıcada olmayan veya başka türlü kullanılan şu harfler ve işaretler gelir:
        </p>
        <div className="yeni">
          {YENI.map((y) => (
            <article key={y.harf}>
              <header>
                <span className="harf" lang="tr-Arab">
                  {y.harf}
                </span>
                <span className="ses">{y.ses}</span>
              </header>
              <p>
                <strong>Kaynak:</strong> {y.kaynak}
              </p>
              <p>
                <strong>Kural:</strong> {y.kural}
              </p>
              <table className="ornekler">
                <tbody>
                  {y.ornekler.map((o) => (
                    <tr key={o}>
                      <td className="l">{o}</td>
                      <td className="e" dir="rtl">
                        {ete(lower(o))}
                      </td>
                      <td className="o" dir="rtl" title="Osmanlıca">
                        {ottoman(lower(o), known) ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>
        <p className="not">Örneklerde: Latin, ETE ve karşılaştırma için Osmanlıca yazılışı.</p>
      </section>

      <section>
        <h2>İki isim: Allah ve Muhammed</h2>
        <p>
          <strong>Kural:</strong> “Allah” ve “Muhammed” harf harf yazılmaz; Osmanlıcadaki gibi Arabî yazılışıyla{" "}
          <span lang="tr-Arab">الله</span>, <span lang="tr-Arab">محمد</span> yazılır. Arkalarından gelen ekler
          (Allah’ın, Muhammed’e, Muhammediye) ETE ile, ünlüleri ortadaki şekilleriyle yazılır. ETE’den Latin’e
          çevirirken de bu iki yazılış “Allah” ve “Muhammed” okunur.
        </p>
        <table className="ornekler">
          <tbody>
            {["Allah", "Allah’ın", "Allah’a", "Muhammed", "Muhammed’e", "Muhammediye"].map((o) => (
              <tr key={o}>
                <td className="l">{o}</td>
                <td className="e" dir="rtl">
                  {ete(lower(o))}
                </td>
                <td className="o" dir="rtl" title="Osmanlıca">
                  {ottoman(lower(o), known) ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Harfler</h2>
        <table className="harfler">
          <thead>
            <tr>
              <th>Latin</th>
              <th>Başta</th>
              <th>Ortada</th>
              <th>Sonda</th>
            </tr>
          </thead>
          <tbody>
            {letters.map(([letter, [middle, initial, final]]) => (
              <tr key={letter}>
                <td className="l">{letter}</td>
                <td className="e">{initial}</td>
                <td className="e">{middle}</td>
                <td className="e">{letter === "h" ? "هـ" : final}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="not">
          â, î, û: a, i, u ile medde (آ, ىِٓ, ۇٓ). Kesme ve kısa çizgi yazılmaz; kesmeden sonraki ekin seslisi ortadaki
          şekliyle yazılır. q, w, x en yakın harfle (ك, و, كس). Allah ve Muhammed: الله, محمد.
        </p>
      </section>

      <section>
        <h2>Örnek</h2>
        <dl className="ornek">
          <dt>Latin</dt>
          <dd className="l">{ORNEK}</dd>
          <dt>Osmanlıca</dt>
          <dd className="o" dir="rtl">
            {write(ORNEK, (f) => ottoman(f, known))}
          </dd>
          <dt>ETE</dt>
          <dd className="e" dir="rtl">
            {write(ORNEK, (f) => ete(f))}
          </dd>
        </dl>
        <p>
          Kendi metninizi <Link href="/cevirici">Çevirici</Link>’de, kelimeleri <Link href="/sozluk">Sözlük</Link>’te
          deneyebilirsiniz.
        </p>
      </section>
    </main>
  );
}
