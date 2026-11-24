# ETE

**https://ete.rgevrek.de**: the Risale-i Nur Külliyatı page by page, every word in Latin, Ottoman
and ETE (Esas Türk Elifbası) letters, one under the other; a converter between the three. Read-only;
sign-in by a link sent by mail.

## Data

`scripts/sync-data.sh [risale-i-nur-kulliyati] [fonts]` copies from `../risale-i-nur-kulliyati`:

| Here | From | |
| --- | --- | --- |
| `data/books/<slug>.html` | the 20 books (`tools/footnotes.py` `BOOKS`) | Latin originals only, not the `-osmanlica`/`-ete` copies |
| `public/resim/<slug>/` | `<Book>-web-resources/image` | images |
| `data/sozluk.tsv` | `tools/osmanlica/sozluk.tsv` | the Ottoman dictionary |
| `data/cetvel.tsv` | `tools/ete/cetvel.tsv` | the ETE letters |
| `app/yazi.css` | `css/yazi.css` | typefaces, print pixels as `--px` |
| `public/fonts/` | `css/fonts`, the Document fonts | Hüsrev (Ottoman), Seherazade (ETE), Souvenir, Flange, Nur … |

Run it again after the books or the dictionary change, then commit.

## How the alphabets are written (live)

- **ETE** (`lib/script/ete.ts`): `tools/ete.py` letter by letter; Latin ↔ ETE is one to one (apart
  from apostrophes, hyphens and an initial â).
- **Ottoman** (`lib/script/ottoman.ts`): `tools/osmanlica.py`: `sozluk.tsv`, and the forms of all
  books derived from it by the endings learned from its pairs, at start (`lib/books/library.ts`,
  ~4 s). The converter also derives words not in the books. Ottoman → Latin: the most frequent
  form of the books written so.
- `test/kelimeler.test.ts` checks every form against `tools/ete/kelimeler.tsv` (skipped without
  the repo next to this one).

The reader (`lib/books/parse.ts`, `lib/books/render.ts`) splits a book at `<page-break page>`,
takes the table of contents from the headlines (README of the books), and renders every word as a
stack of the three; the checkboxes show rows by CSS (`app/kitap.css`). Without Latin the text is
right to left.

## Sign-in

`/giris` sends a link (JWT, 15 minutes, used once) to an address in `ALLOWED_EMAILS`; the link
opens a page whose button starts the session (cookie, 30 days), so mail scanners can't use it up.
No database. Production: `infrastructure/kubernetes/apps/ete` (`allowedEmails` in `values.yaml`).

## Development

```sh
pnpm install
cp .env.example .env.local
pnpm dev          # sign-in link in the log
pnpm typecheck && pnpm test && pnpm build
```

## Metrics

What ETE should move, and how it is measured. Grafana: "ETE (business)" (uid `ete-business`) and
"ETE" (uid `ete`, operations and RUM), in the infrastructure repo. ETE has no database, so its numbers
are Prometheus counters (kept 15 days) from the server's metrics port (`METRICS_PORT`, 9464, never
routed); labels are fixed names, never texts, ids or URLs.

- **MET-001 North star: book pages read per week.** A page of a book (`/kitap/<slug>/<sayfa>`) counts as
  read once it has been visible for 10 s in all, in a tab in the foreground (`lib/reading.ts`); the page
  reports it as the funnel step `page_read` (`ete_funnel_step_total{step="page_read"}`).
- **MET-002 Breadth: books opened per week** (`book_opened`, a book entered from elsewhere).
- **MET-003 Depth: pages read per book opened.**
- **MET-004 The converter: conversions per week** (`ete_operation_total{operation="convert"}`).
- **MET-005 Funnel:** `book_opened` → `page_read`, reported by the page with `POST /api/events`
  (`lib/events.ts`, a fixed list).
- **MET-010 Guardrails, operations:** conversions and print exports by outcome and duration
  (`ete_operation_total`, `ete_operation_duration_seconds`); 5xx share and p95 latency at the Gateway.
- **MET-020 Real user monitoring:** errors in the pages, web vitals (LCP, INP, CLS) and frustration
  signals (rage, dead and error clicks) from the Faro Web SDK (`lib/rum.ts`, `instrumentation-client.ts`),
  sent to `/rum/collect` on ete.rgevrek.de, which the platform routes to its own collector. No third
  party, no cookies, no user id, no console output; URLs lose their query and fragment.

## Deployment

CI (`.github/workflows/ci.yml`) builds `ghcr.io/rgevrek/ete:sha-<commit>` and publishes the chart
`oci://ghcr.io/rgevrek/charts/ete` on every push to `main`; Flux deploys the newest one.
