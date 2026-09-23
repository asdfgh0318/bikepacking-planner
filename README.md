# Bikepacking Planner

Plan a multi-day bike trip across Poland and know, for every day, where you can buy food, where the water is, whether the shop will be open when you get there, and what the weather will do.

**Live:** https://asdfgh0318.github.io/bikepacking-planner/

Runs entirely in the browser. No account, no API keys, no tracking, no WebAssembly. Installable as an app, including in Vanadium on GrapheneOS. Free data sources: BRouter (routing), OpenStreetMap via Overpass (shops, water, campsites, stations), Open-Meteo (forecast), InPost (Paczkomat lockers), OpenFreeMap (tiles).

## What it does

1. **Route.** Tap the map to place waypoints, drag to move them, or import a GPX. Three BRouter profiles. Elevation strip with day boundaries. Export GPX with supply points as waypoints, or copy a link that carries the whole route.
2. **Days.** The route is split into riding days from a daily target. Each day shows distance, climb, hours, difficulty, and the night stop. Sundays are flagged: on a non-trading Sunday the big chains are closed, and the app knows the Polish calendar including the three pre-Christmas Sundays.
3. **Supply.** Shops, water, campsites, repair and bail-out points within a corridor of the route, cached for a week so a planned trip still shows its shops offline. Gaps without food or water are graded safe, caution, danger, with where to stock up and the nearest off-route alternative.
4. **Resupply plan.** From your diet and a strategy (auto-picked from shop density), which stop to buy at on which day, the estimated arrival time and whether it will be open, calories and carry weight per day, and warnings. Optional pre-shipping of food to InPost Paczkomat lockers for empty stretches.
5. **Weather.** Sixteen-day forecast aligned to the trip days, with heat, cold, rain and wind alerts. Hot days tighten the water-gap thresholds.
6. **It survives.** Route and settings persist across reloads. Map tiles, routes and OpenStreetMap answers are cached by the service worker.

## Develop

```bash
npm install
npm run dev                                       # http://localhost:5173
npm run lint && npm test                          # ESLint, Vitest
npx playwright test                               # E2E on its own server, port 5183
npm run build -- --base=/bikepacking-planner/     # as deployed to GitHub Pages
npm run icons                                     # regenerate PNG icons from public/icon-192.svg
```

Stack: React 18, TypeScript, Vite, MapLibre GL, Zustand, IndexedDB. The planning logic lives in `src/services` and `src/data` and is unit-tested; the UI in `src/components` is thin on purpose.

MIT.
