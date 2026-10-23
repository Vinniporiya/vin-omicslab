# Vin-OmicsLab

A computational biology research platform: portfolio, interactive analyses, a gene atlas with genome pages, a plan-first
Science Agent prototype and a reproducible Analysis Studio. **All data in this build are simulated and labelled as such.** No publication, affiliation,
client or result appears unless it is supplied and verified.

## Run

```bash
npm install
npm run build        # writes dist/index.html, a single self-contained file
npm run typecheck    # tsc --noEmit
npm run selftest     # statistics validated against known values; analyses recover planted structure
# open dist/index.html in a browser (no server needed)
```

`npm run dev` rebuilds on change.

**Genome pages need internet access.** Gene coordinates, transcripts, cytobands and neighbouring genes are fetched live
from the Ensembl REST API (GRCh38) and cached in the browser for 30 days. Offline, the pages say annotation is unavailable;
nothing is drawn in its place. Expression shown on gene pages is simulated.

**Display settings** (header, Display): themes System, Hematoxylin, Eosin, Journal, High contrast; data colours Histology
or Colour-vision safe (Okabe-Ito). Every figure has PNG and SVG download. Fonts load from Google Fonts and fall back to system fonts offline.

## Deploy (GitHub Pages)

Every push to `main` runs `.github/workflows/deploy.yml`: install, self-tests, build, then publish `dist/` to GitHub Pages.
One-time setup in the repository: Settings > Pages > Source: **GitHub Actions**. The site appears at
`https://<user>.github.io/<repo>/`. Links use `#/` routes, so no redirect rules are needed. A separate job runs the
type check and reports errors without blocking deployment.

GitHub Pages is meant for non-commercial sites. When Vin-OmicsLab starts offering paid services, move hosting to a host
that allows commercial use (Cloudflare Pages can deploy from this same repository).

## Structure

```
src/data/      schema, provider abstraction, seeded simulator, content (site, projects, methods, publications, profile)
src/lib/       stats, analyses, evidence rules, QC, codegen, reproducibility, report, agent (no React)
src/viz/       canvas scatter, heatmap/dot plot, palettes
src/components ui primitives and science components (EvidenceStack, VizPanel, CodeViewer)
src/features   pages: home, research, explorer (10 views), genes (atlas + genome pages), studio, agent, publications, methods, about, contact
src/lib/genome Ensembl REST client (validated, cached, never invents coordinates)
src/styles     tokens (dark default + light), base, components, features
scripts/       build.mjs (esbuild), selftest.ts
docs/          ARCHITECTURE.md
```

## What to fill in (all in `src/data/content/`)

| File | Needs |
|---|---|
| `site.ts` | `contactEmail` (the contact form cannot send until this is set) |
| `projects.ts` | Author-verified text for each project field; datasets, figures, code links |
| `publications.ts` | Real records with DOIs |
| `profile.ts` | Biography, expertise, collaborations (author's facts only) |
| `methods.ts` | Verify each reference (DOI/PMID) before removing the "Unverified" flag |

Replace the simulator with real data by registering a provider in `src/data/provider.ts`; the views do not change.
