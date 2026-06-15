# CLAUDE.md

Client-side bikepacking trip planner for Poland (React 18 + TypeScript + Vite,
MapLibre GL, Zustand, sql.js). No backend; all APIs are free and keyless
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
- Polish trading Sundays are computed algorithmically in
  `src/data/sundayTrading.ts` from the statutory rule (incl. Easter computus).
  Never reintroduce hardcoded date lists. The law-dependent chain lists
  (`SUNDAY_CLOSED_TYPES`) currently live in `resupplyPlanner.ts`.
- `daySegments` must stay derivable from the route alone — supply points only
  refine day-end placement (`useDaySplitting` hook). Don't make Overpass a
  prerequisite for the trip plan again; Overpass rate-limits routinely (429s).
- `routeStore.setDaySegments` has a structural-equality bail-out on purpose:
  the splitter re-runs per supply refresh and identical-but-fresh arrays were
  aborting in-flight weather fetches downstream.
- The weather cache key includes the day count — segment count can change for
  the same route+date once supply alignment lands.
- sql.js wasm is copied to `public/` by the `postinstall` script and loaded
  via `import.meta.env.BASE_URL` (base-path-safe). PWA manifest URLs are
  relative for the same reason.

## Testing conventions

- Core planning logic (resupply, gaps, diet, day split, Sunday calendar,
  dates) is unit-tested; keep it that way for new logic.
- E2E specs in `e2e/` must not depend on live API success — upstream 429/504
  from Overpass/BRouter are routine and not our bugs.
