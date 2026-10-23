# Review sheets

Filled in by hand, independent of the rules of `lib/script/koken.ts` and `tools/osmanlica.py nun`: the
last column is empty for the reviewer. Written by scripts from the data of the app (seeds fixed, so the
same words come again).

| File | What | Column to fill |
|---|---|---|
| `koken-ornek.tsv` | 300 words, drawn by how often they are in the books (the error rate a reader sees) | `dogru_koken`: Arapça, Farsça, Türkçe, Batı or ? |
| `koken-ornek-seyrek.tsv` | 200 words drawn evenly from all word forms (the error rate of the rules in the long tail) | `dogru_koken` |
| `kamus-karsilastirma.tsv` | the roots whose origin Kâmûs-ı Türkî (OCR, risale-i-nur-kulliyati) gives otherwise; only roots of one Kâmûs entry with a label read; `KAMUS_REPORT=1 npx vitest run test/kamus-karsilastirma.test.ts` | `dogru`: which is right (bizim, kamus, ikisi de değil); Kâmûs counts a compound formed in Persian as Persian, we color the first root |
| `nun-ornek.tsv` | 100 of the 6056 forms whose ك became ڭ (`tools/osmanlica/eksik/nun.tsv`) | `dogru_mu`: e (yes) or h (no) |

`kok` is the root the rules took, `nasil_bulundu` which rule decided: Wiktionary as the word itself,
Wiktionary as its root and endings, the hand list (`data/koken-ek.tsv`), or the fallbacks (the lügat,
Arabic letters, a compound).

## LLM review (2026-10-23)

`*.llm.tsv` are the sheets with the suggestions of an LLM review (columns `llm_…`: the right color, whether
the root is right, a reason; sources looked up on Wiktionary). The human columns are untouched. Against the
program after the fixes that followed it:

| Sheet | The same as the LLM | By occurrences |
|---|---|---|
| `koken-ornek` (300, by frequency) | 97.3% | 99.9% |
| `koken-ornek-seyrek` (200, even) | 96.0% | 99.4% |
| `nun-ornek` (100) | 100 of 100 ڭ right | |
| `kamus-karsilastirma` (53) | 32 ours, 18 Kâmûs, 3 neither; 7 of ours are the rule of the first root | |

Left open, for a decision:
- names (Muhammed, Hamdi, Ankara, İstanbul, Bolvadin, Sistanî): colored by their word; the rules give a
  name no color, which needs telling a name from a word (capitals in the text)
- the Kâmûs differences that are errors of ours: berk, sârık, şehîr, maşrapa, alâ, suver (Arabic); âlûde,
  hâhiş, nevaz, sahtekâr (Persian); francala (Western); dolu (old Turkic, ط)

The errors of the Ottoman dictionary the review and the Kâmûs found are fixed in risale-i-nur-kulliyati
(`tools/osmanlica/sozluk.tsv`, branch osmanlica-names): altın آلتون, kesb-i كسب, parti پارتى, semerat ثمرات,
hamle حمله, düşündüğün دوشونديكڭ, selim سليم, elleri اللرى, susuz صوسز, vahde وحده, tart طارت, karı قارى,
kuran قوران (kur-an), dar-ı دار, mucize-i معجزۀ, alakadar علاقه‌دار, ilahiye الٰهيه; the passive of olmak
and bulmak without the و of -un- (بولنان, اولنان), as the Kâmûs and Wiktionary write it.

## Spelling and the Latin of the books (suggestions, nothing changed)

- `kamus-yazim.tsv`: the spellings of the dictionary the text of the Kâmûs never has, where it has one a
  letter apart (a consonant of the same sound, `ünsüz`, or a vowel letter inside the word, `ünlü`). Mostly
  OCR errors and homographs; to be marked `e` (the Kâmûs is right) or `h` (ours is).
- `latin-tek-yazim.tsv`: the Latin forms of the books that are one Ottoman word written with other marks
  (â î û, à, ’): "halde" and "hâlde", "hakikî" and "hakiki", "nur’un" and "nurun". Suggested: the most
  frequent form for all. Some marks may be meant (o’nun, of Him); `karar`: e, h or the right form.
- `latin-anlam.tsv`: a Latin form with fewer marks than another word of other letters ("kuran" and
  "kur’ân", "akıl" and "âkıl"), with its places in the books: the dictionary writes it one way only
  ("kuran" قوران, fabrikayı kuran), so where the books mean the other word it should be marked in the
  Latin ("Kuran dersini", Sikke-i Tasdik-i Gaybî: Kur’an). `karar`: h, or the form the book should have.
