# CLAUDE.md

Client-side bikepacking trip planner for Poland (React 18 + TypeScript + Vite,
MapLibre GL, Zustand, IndexedDB). No backend; all APIs are free and keyless
(BRouter, Overpass, Open-Meteo, InPost, OpenFreeMap tiles).

## Commands

```bash
npm run dev          # dev server (default port 5173)
npm run lint         # ESLint — zero errors is the enforced baseline
npm test             # Vitest unit tests
npx playwright test  # E2E — starts its OWN dev server on port 5183
npm run build -- --base=/bikepacking-planner/   # build exactly as deployed
```

## Workflow (agreed with the project owner)

- **PRs into `main`, never commit to main directly.** The owner reviews and
  merges on GitHub — do not merge for them. Stacked PRs are fine; note the
  merge order in the description.
- CI (`.github/workflows/ci.yml`) runs lint → unit tests → build → Playwright
  E2E on every push/PR. Deploy to GitHub Pages happens automatically on push
  to `main` (`deploy.yml`), with `--base=/bikepacking-planner/`.
- **Less is more.** Prefer deleting/simplifying over adding features. Cuts go
  through an audit + owner approval first.
- Stay on MapLibre (no Mapbox, no API tokens). Poland-lock (Żabka/Biedronka,
  PLN, Paczkomat, trading Sundays) is the product identity, not a bug.

## Gotchas

- **Port 5173 is often occupied by the owner's other projects.** Playwright is
  pinned to port 5183 with `--strictPort` for this reason — don't "fix" it
  back, and don't trust anything you see on 5173.
- A calendar date (`YYYY-MM-DD`) has no timezone. Use `addDays`/`tripDayDate`
  from `src/utils/date.ts` (pure UTC) for all date arithmetic — do not write
  new `new Date(str + 'T00:00:00')` helpers; that class of bug was already
  consolidated away once.
- Polish trading-Sunday law lives in `src/data/sundayTrading.ts`: the
  exempt-Sunday calendar (statutory rule + Easter computus) and the
  `isClosedOnNonTradingSunday(stop)` predicate. Never reintroduce
  hardcoded date lists. New corporate large-format chains belong in the
  `BRAND_REGISTRY` in `src/services/poiClassifier.ts` with
  `closedOnNonTradingSunday: true` — that's where the per-store flag
  the predicate reads is set.
- `daySegments` must stay derivable from the route alone — supply points only
  refine day-end placement (`useDaySplitting` hook). Don't make Overpass a
  prerequisite for the trip plan again; Overpass rate-limits routinely (429s).
- `routeStore.setDaySegments` has a structural-equality bail-out on purpose:
  the splitter re-runs per supply refresh and identical-but-fresh arrays were
  aborting in-flight weather fetches downstream.
- The weather cache key includes the day count — segment count can change for
  the same route+date once supply alignment lands.
- No WebAssembly on purpose: the target phone browser (Vanadium on
  GrapheneOS) runs WASM without JIT, so the POI cache is plain IndexedDB
  (`src/services/poiCache.ts`). Don't bring sql.js or other WASM back.
- PWA manifest URLs are relative so the app works under the Pages base path.
  Icons are PNG (Vanadium installs SVG-only manifests as bookmarks); regenerate
  with `npm run icons` after editing `public/icon-192.svg`.
- Route, trip settings, layer toggles and diet persist in localStorage (Zustand
  `persist`). Derived data (day segments, POIs, weather, plan) is recomputed on
  load. `gpxGeometryLoaded` means "geometry is authoritative, skip BRouter";
  it is set by GPX import and by restore, and cleared by every user edit in
  `routeStore` — never reset it inside the calculation hook again.
- `useAutoPlan` regenerates the resupply plan whenever its inputs change and
  is the single place that resolves the 'auto' strategy; the Generate button
  calls the same `buildPlanFromStores`. `debugLog` prints to the console in
  dev only — there is no in-app log panel.

## Testing conventions

- Core planning logic (resupply, gaps, diet, day split, Sunday calendar,
  dates) is unit-tested; keep it that way for new logic.
- E2E specs in `e2e/` must not depend on live API success — upstream 429/504
  from Overpass/BRouter are routine and not our bugs.
