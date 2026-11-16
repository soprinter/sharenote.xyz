# sharenote.xyz

The website for **Sharenote**, proof of energy on Nostr, and its specs, the Sharenote Proposals SNP-01 to SNP-09.

A static Astro site. Every page is server-rendered HTML. Interactive tools run in the browser:
- minting a real note in a Web Worker;
- Z-bit arithmetic;
- a 402 pay-with-work playground;
- receipt audits;
- and more.

On phones it becomes an installable app with a tab bar, sheets and sticky actions.

## Develop

```bash
just dev        # or: npm run dev
just build      # astro check + static build into dist/
just test       # Z-bit maths against snps/vectors/snp01.json
just preview
```

## How it is built

| Path | What |
|---|---|
| `src/proto/*.js` | The approved design prototype's code, used as-is: page renderers (`app.js`), tools (`tools.js`), phone layer (`mobile.js`), maths (`zmath.js`, a port of `@soprinter/sharenotejs` snp01), content (`data-content.js`), example network data (`fixtures.js`). They run at build time in Node (`ssr.js`) to produce static HTML, and in the browser (`client-base.js` / `client-full.js`) to wire up behaviour. |
| `src/layouts/Shell.astro` | Head, fonts, theme-before-paint, analytics (loaded on first interaction) |
| `src/pages/**` | One file per route; they only pick the route name. `search.json`, `llms.txt` and `llms-full.txt` are generated at build. |
| `src/styles/` | Design tokens and components (`styles.css`), the phone layer (`mobile.css`), self-hosted fonts (`fonts.css`) |
| `public/assets/` | The original Sharenote bill (legacy text removed; WebP and AVIF at 600/800/1000 px), History of Value art, logo |
| `public/fonts/SharenoteZ.woff2` | The Z-bit "z": a z whose diagonal is a zero. Built by `tools/make-zfont.py` on Geist Mono's metrics |
| `public/sw.js`, `manifest.webmanifest` | Installable app; offline tools after the first visit |
| `public/_redirects`, `astro.config.mjs` | Old SNIP-era URLs → SNP pages (301) |

The design source of truth is `soprinter/.ai/design/sharenote-xyz/`. When the design changes, port the change into `src/proto/`.

Network data on `/network/` and in the order and offer flows is example data, labelled as such. The maths is exact: it is tested against the spec vectors.

## Budgets

Lighthouse mobile (simulated slow 4G):
- performance ≥ 95;
- CLS 0;
- no JavaScript on the critical path;
- about 21 KB gz of JS on content pages and about 31 KB gz on tool pages;
- the QR library loads when the page is idle.
