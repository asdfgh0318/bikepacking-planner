# Comprehensive Technical Improvement Plan

## Context

Full codebase audit of the bikepacking planner app (~5,800 LOC, 13 services, 6 stores, 20+ components). The app works well functionally but has accumulated technical debt across architecture, performance, testing, security, and developer experience. This plan addresses all findings, organized by priority.

---

## Priority 1: Critical (Architecture & Reliability)

### 1.1 Decompose monolithic App.tsx (468 lines)

**Problem**: App.tsx contains all orchestration logic — route calculation, supply point fetching, weather, gap analysis, bail-out fetching — with 28 store hook calls and repeated AbortController patterns.

**Files**: `src/App.tsx` (modify), create 5 new hooks in `src/hooks/`

**Action**:
- Extract `useRouteCalculation(waypoints, routingProfile)` — handles BRouter calls + day splitting
- Extract `useSupplyPointFetching(routeGeometry, corridorWidthKm, showFlags)` — 5 Overpass queries + InPost
- Extract `useWeatherFetching(routeGeometry, daySegments, tripStartDate)` — weather API + cache
- Extract `useGapAnalysis(routeGeometry, supplyPoints, routeWeather)` — food/water gap detection
- Extract `useBailOutFetching(routeGeometry, showBailOut)` — bail-out point loading
- Each hook owns its own AbortController + cleanup
- App.tsx becomes ~80 lines: store subscriptions + hook calls + layout

### 1.2 Add tests for resupplyPlanner.ts (437 LOC, 0% coverage)

**Problem**: Most complex business logic in the app — Sunday trading, calorie tracking, multi-stop selection — completely untested.

**Files**: Create `src/services/resupplyPlanner.test.ts`

**Action**: Write tests covering:
- Basic stop selection with calorie tracking
- Sunday trading ban logic (Biedronka closed, Żabka reduced)
- 15% Sunday buffer behavior
- Calorie deficit warnings
- Heavy load warnings (>5kg)
- Empty supply points edge case
- Multi-day trip with danger gap detection (+20km lookahead)

### 1.3 Add request timeouts to API calls

**Problem**: BRouter and Overpass can hang for minutes with no timeout. Browser default is 2 minutes, during which UI freezes.

**Files**: `src/utils/fetchWithRetry.ts`, `src/services/brouter.ts`, `src/services/overpass.ts`

**Action**:
- Add `timeout` option to `fetchWithRetry` (default 30s) using `AbortSignal.timeout()`
- BRouter: 45s timeout (long routes take time)
- Overpass: 30s timeout per query
- Show toast on timeout: "Request timed out, please try again"

---

## Priority 2: High (Performance & Code Quality)

### 2.1 Add memoization to expensive components

**Problem**: Only 7 of 20+ components use `useMemo`/`useCallback`. Several do O(n) work every render.

**Files**: `src/components/Map/SupplyMarkers.tsx`, `src/components/Sidebar/GearPanel.tsx`, `src/components/Sidebar/ShoppingTimeline.tsx`, `src/components/Sidebar/ResupplyPanel.tsx`

**Action**:
- SupplyMarkers: `useMemo` on visible point filtering + distance calculations
- GearPanel: `useMemo` on item grouping (`packedItems.reduce(...)`)
- ShoppingTimeline: `React.memo()` wrapper, memoize day breakdown mapping
- ResupplyPanel: Split into sub-components to reduce 27-hook re-render blast radius

### 2.2 Deduplicate marker type configs (3 copies)

**Problem**: `COLORS`, `ICONS`, `TYPE_LABELS` defined in SupplyMarkers.tsx, SupplyPanel.tsx, and ShoppingTimeline.tsx.

**Files**: Create `src/constants/supplyTypes.ts`, modify 3 consumer files

**Action**:
- Extract `SUPPLY_COLORS`, `SUPPLY_ICONS`, `SUPPLY_LABELS` to shared constants
- Import from single source in all 3 files

### 2.3 Deduplicate distance calculation (5 copies)

**Problem**: Haversine approximation (`111.32 * cos(...)`) copied in ElevationProfile, SupplyMarkers, RoutePanel, and inline in services.

**Files**: Create `src/utils/distance.ts`, modify 5 consumer files

**Action**:
- Extract `distanceKm(lat1, lng1, lat2, lng2): number` to shared utility
- Add unit test
- Replace all inline copies

### 2.4 Fix Turf.js tree-shaking

**Problem**: `import * as turf from '@turf/turf'` imports entire library (~100KB). Only 8 functions used.

**Files**: `src/utils/geo.ts`, `src/services/daySplitter.ts`, `src/services/gapAnalysis.ts`

**Action**:
- Change to named imports: `import { lineString, buffer, bbox, booleanPointInPolygon, point, length, along, nearestPointOnLine } from '@turf/turf'`
- Verify build size reduction

### 2.5 Create `useAsyncEffect` custom hook

**Problem**: 5 effects in App.tsx repeat the same pattern: AbortController + cancelled flag + try/catch with AbortError check + debug logging.

**Files**: Create `src/hooks/useAsyncEffect.ts`

**Action**:
- Generic hook: `useAsyncEffect(fn: (signal: AbortSignal) => Promise<void>, deps: any[])`
- Handles abort cleanup, AbortError swallowing, error logging
- Used by hooks from 1.1

---

## Priority 3: Medium (UX, PWA, Security)

### 3.1 Fix PWA tile caching config

**Problem**: `vite.config.ts` caches CyclOSM tiles but app now uses OpenFreeMap. Old config is dead code.

**Files**: `src/vite.config.ts`

**Action**:
- Replace CyclOSM URL pattern with OpenFreeMap pattern: `/^https:\/\/tiles\.openfreemap\.org\/.*/i`
- Keep CacheFirst strategy with 30-day expiration

### 3.2 Add DNS prefetch and preconnect hints

**Problem**: No `<link rel="preconnect">` for external APIs, causing extra DNS lookup latency on first request.

**Files**: `index.html`

**Action**: Add preconnect for:
- `https://tiles.openfreemap.org` (map tiles)
- `https://brouter.de` (routing)
- `https://overpass-api.de` (supply points)
- `https://api.open-meteo.com` (weather)

### 3.3 Fix `dangerouslySetInnerHTML` XSS risk in SupplyMarkers

**Problem**: SVG icons injected via `dangerouslySetInnerHTML` (line 126) — XSS vector if supply point data contains malicious content.

**Files**: `src/components/Map/SupplyMarkers.tsx`

**Action**:
- Replace `dangerouslySetInnerHTML` with React SVG components or pre-sanitized static strings
- Since icons are from a fixed set (SUPPLY_ICONS), use a lookup of React elements instead

### 3.4 Add backoff jitter to fetchWithRetry

**Problem**: All clients retry at exact same intervals (1s, 2s, 4s). On API recovery, causes thundering herd.

**Files**: `src/utils/fetchWithRetry.ts`

**Action**:
- Add random jitter: `delay * (0.5 + Math.random() * 0.5)` — so 1s becomes 500ms-1000ms, etc.
- Update tests to account for jitter range

### 3.5 Persist sidebar tab in URL or localStorage

**Problem**: Tab resets to 'route' on page reload. User loses context.

**Files**: `src/components/Sidebar/Sidebar.tsx`

**Action**:
- Store active tab in `localStorage` key `'bikepacking-sidebar-tab'`
- Read on mount, write on change
- Default to 'route' if not set

### 3.6 Surface weather unavailability to user

**Problem**: Trips >16 days get all-zero weather data with no warning. User sees empty weather panel with no explanation.

**Files**: `src/services/weather.ts`, `src/components/Sidebar/WeatherPanel.tsx`

**Action**:
- Weather service: return a `forecastAvailable: boolean` flag alongside data
- WeatherPanel: show EmptyState "Weather forecasts available for trips starting within 16 days" when flag is false

### 3.7 Move @xmldom from devDependencies to dependencies

**Problem**: `@xmldom/xmldom` is used in production for GPX parsing but listed as devDependency.

**Files**: `package.json`

**Action**: `npm install @xmldom/xmldom` (moves to dependencies)

---

## Priority 4: Nice-to-Have (Polish & DX)

### 4.1 Add ESLint accessibility and TypeScript rules

**Files**: `eslint.config.js`, possibly install `eslint-plugin-jsx-a11y`

**Action**:
- Add `jsx-a11y` plugin for accessibility linting
- Add `@typescript-eslint` recommended rules
- Add rule against `dangerouslySetInnerHTML`

### 4.2 Improve color contrast for muted text

**Files**: `src/index.css`

**Action**:
- Change `--text-muted` from `#64748b` to `#94a3b8` (slate-400) for better contrast on dark backgrounds
- Verify WCAG AA compliance (>4.5:1 ratio)

### 4.3 Add code splitting for MapView

**Files**: `src/App.tsx`

**Action**:
- `const MapView = React.lazy(() => import('./components/Map/MapView'))`
- Wrap with `<Suspense fallback={<div class="map-loading">Loading map...</div>}`
- Reduces initial JS bundle

### 4.4 Extract magic numbers to config

**Files**: Create `src/config.ts`

**Action**: Centralize:
- Weather cache TTL (1 hour)
- Overpass timeout (25s)
- Food gap thresholds (30km safe, 50km caution)
- Water gap thresholds (20km safe, 40km caution)
- Sunday buffer (15%)
- Paczkomat first parcel day (3)
- Max GPX waypoints (50)

### 4.5 Add integration test for full pipeline

**Files**: Create `src/services/integration.test.ts`

**Action**: Test route → day split → gap analysis → resupply plan end-to-end with mock data, verifying calorie balance and stop selection.

### 4.6 Set package version to 1.0.0

**Files**: `package.json`

**Action**: Change `"version": "0.0.0"` to `"version": "1.0.0"`

---

## Summary Table

| # | Priority | Task | Files Changed | Impact |
|---|----------|------|---------------|--------|
| 1.1 | CRITICAL | Decompose App.tsx into hooks | 6 | Architecture |
| 1.2 | CRITICAL | Test resupplyPlanner.ts | 1 new | Reliability |
| 1.3 | CRITICAL | Add request timeouts | 3 | Reliability |
| 2.1 | HIGH | Memoize expensive components | 4 | Performance |
| 2.2 | HIGH | Deduplicate marker configs | 4 | Code quality |
| 2.3 | HIGH | Deduplicate distance calc | 6 | Code quality |
| 2.4 | HIGH | Fix Turf.js tree-shaking | 3 | Bundle size |
| 2.5 | HIGH | Create useAsyncEffect hook | 1 new | Code quality |
| 3.1 | MEDIUM | Fix PWA tile caching | 1 | PWA |
| 3.2 | MEDIUM | Add DNS prefetch | 1 | Performance |
| 3.3 | MEDIUM | Fix dangerouslySetInnerHTML | 1 | Security |
| 3.4 | MEDIUM | Add retry jitter | 1 | Resilience |
| 3.5 | MEDIUM | Persist sidebar tab | 1 | UX |
| 3.6 | MEDIUM | Surface weather limits | 2 | UX |
| 3.7 | MEDIUM | Fix @xmldom dependency | 1 | Correctness |
| 4.1 | LOW | ESLint accessibility rules | 1 | DX |
| 4.2 | LOW | Fix color contrast | 1 | Accessibility |
| 4.3 | LOW | Code split MapView | 1 | Performance |
| 4.4 | LOW | Extract magic numbers | 1 new | Maintainability |
| 4.5 | LOW | Integration test | 1 new | Testing |
| 4.6 | LOW | Set package version | 1 | Housekeeping |

## Verification

1. `npx tsc --noEmit` — no type errors
2. `npx vitest run` — all tests pass (existing 120 + new resupplyPlanner tests)
3. `npx vite build` — successful build, check bundle size reduction
4. Manual test: create route, verify all tabs work, check weather panel, toggle markers
5. Lighthouse PWA audit — verify caching config correct
