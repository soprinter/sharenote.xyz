# Changelog

All notable changes to this site are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-16

### Changed
- **Rebuilt the site on the Sharenote Proposals SNP-01 to 09.** It follows the approved prototype (`.ai/design/sharenote-xyz`) exactly. All SNIP-era content is removed: SNIP-00..05, kinds 10520/10521/355xx/35510, Watchtower, Pool Alliance, "the Market", Bills, and the vendored `snip00.ts` planner.
- Same art direction, modernized: paper and green ink, guilloché, the original SN logo and ostrich bill. The bill's legacy text is replaced by live values: the Z-bit, the verdict on the security thread, and a real QR of the SN4U record.
- New "z" glyph for Z-bits (SharenoteZ): a z whose diagonal is a zero.

### Added
- Pages: Learn (5 explainers and a glossary with retired names), Specs (map, kind index, SNP-01..09), Tools (Z-bit converter, minter, add & split, planner, merged mining, work offer, receipt audit, buy work, ask, 402 playground), Network, Build.
- History of Value with a sixth era, Genesis · 3 Jan 2009, and a comparison ledger.
- A phone app layer: tab bar, bottom sheets, sticky actions, flip and swipe cards, a chat-style 402 flow; installable (manifest and service worker).
- `search.json`, `llms.txt`, `llms-full.txt` generated at build; sitemap; 301s for every old URL.
- `npm test`: the Z-bit maths against the SNP-01 vectors.

### Removed
- React, Radix, shadcn, Tailwind, MDX, KaTeX, Embla and Fuse.js; the Google Fonts and CDN requests.

## [0.0.5]

### Added

- The sharenote.xyz site (Astro): the documentation sections — Learn, The
  Market, and Specifications (SNIP-00, SNIP-02–SNIP-05) — plus the interactive
  Sharenote planner/calculator. This is the baseline.
