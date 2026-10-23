# Review sheets

Filled in by hand, independent of the rules of `lib/script/koken.ts` and `tools/osmanlica.py nun`: the
last column is empty for the reviewer. Written by scripts from the data of the app (seeds fixed, so the
same words come again).

| File | What | Column to fill |
|---|---|---|
| `koken-ornek.tsv` | 300 words, drawn by how often they are in the books (the error rate a reader sees) | `dogru_koken`: Arapça, Farsça, Türkçe, Batı or ? |
| `koken-ornek-seyrek.tsv` | 200 words drawn evenly from all word forms (the error rate of the rules in the long tail) | `dogru_koken` |
| `nun-ornek.tsv` | 100 of the 6056 forms whose ك became ڭ (`tools/osmanlica/eksik/nun.tsv`) | `dogru_mu`: e (yes) or h (no) |

`kok` is the root the rules took, `nasil_bulundu` which rule decided: Wiktionary as the word itself,
Wiktionary as its root and endings, the hand list (`data/koken-ek.tsv`), or the fallbacks (the lügat,
Arabic letters, a compound).
