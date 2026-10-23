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
- errors of the Ottoman dictionary (risale-i-nur-kulliyati `tools/osmanlica/sozluk.tsv`) the review found:
  altın آلتڭ (آلتون), kesb-i كس (كسب), parti پاردى (پارتى), semerat سمعرات (ثمرات), hamle خامله (حمله),
  düşündüğün دوشونديككڭ (دوشونديكڭ)
- the Kâmûs differences that are errors of ours: berk, sârık, şehîr, maşrapa, alâ, suver (Arabic); âlûde,
  hâhiş, nevaz, sahtekâr (Persian); francala (Western); dolu (old Turkic, ط)
