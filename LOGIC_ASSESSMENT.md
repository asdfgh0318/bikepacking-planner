# Bikepacking Planner — Logic Assessment & System Flow

## System Flowchart

```
╔══════════════════════════════════════════════════════════════════════╗
║                    BIKEPACKING PLANNER — SYSTEM FLOW                ║
╚══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│                        USER INPUT LAYER                             │
│                                                                     │
│  [Click Map]  [Drag Waypoint]  [Import GPX]  [URL #route=...]      │
│       │              │              │                │               │
│       ▼              ▼              ▼                ▼               │
│  ┌─────────────── routeStore ──────────────────────────┐            │
│  │ waypoints[]  routingProfile  dailyTargetKm          │            │
│  └─────────────────────┬───────────────────────────────┘            │
│                        │                                            │
│  [Toggle Filters]  [Set Corridor]        [Set Diet]  [Set Gear]    │
│       │                │                      │           │         │
│       ▼                ▼                      ▼           ▼         │
│  ┌─supplyStore─┐  ┌─supplyStore─┐    ┌─dietStore─┐ ┌─gearStore─┐  │
│  │ show* flags │  │corridorKm   │    │selectedDiet│ │items[]    │  │
│  └─────────────┘  └─────────────┘    └───────────┘  └───────────┘  │
│                                                                     │
│  [Set Trip Date]  [Choose Strategy]  [Enable Paczkomat]            │
│       │                │                    │                       │
│       ▼                ▼                    ▼                       │
│  ┌──────────────── resupplyStore ──────────────────────┐           │
│  │ tripStartDate  strategyId  enablePaczkomat          │           │
│  └─────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
╔═════════════════════════════════════════════════════════════════════╗
║                    DATA PIPELINE (5 hooks)                          ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  ① useRouteCalculation                                              ║
║     waypoints + routingProfile → BRouter API (45s timeout)          ║
║     → routeStore.routeGeometry + routeStats                        ║
║                                                                     ║
║  ② useSupplyPointFetching                                           ║
║     routeGeometry + corridorWidthKm →                               ║
║       5 parallel queries (Overpass×4 + InPost)                      ║
║       → filter to corridor → sort by distance                       ║
║       → analyzeSupplyGaps() → analyzeWaterGaps()                   ║
║       → splitRouteIntoDays()                                        ║
║     → supplyStore.supplyPoints + gaps + routeStore.daySegments     ║
║                                                                     ║
║  ③ useBailOutFetching                                               ║
║     routeGeometry → Overpass (stations + hospitals)                 ║
║     → supplyStore.bailOutPoints                                     ║
║                                                                     ║
║  ④ useWeatherFetching                                               ║
║     routeGeometry + daySegments + tripStartDate → Open-Meteo API   ║
║     → resupplyStore.routeWeather (cached 1hr)                      ║
║                                                                     ║
║  ⑤ useGapAnalysis                                                   ║
║     routeWeather (if maxTemp > 30°C) → re-analyze water gaps       ║
║     → supplyStore.waterGaps (heat-adjusted)                        ║
╚═════════════════════════════════════════════════════════════════════╝
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              USER-TRIGGERED PLANNING (button click)                 │
│                                                                     │
│  generateUnifiedPlan()                                              │
│    ├── generateShippingPlan() → Paczkomat parcel selection          │
│    ├── generateResupplyPlan() → shop stop selection + food picking  │
│    │     Considers: Sunday trading, opening hours, calorie needs,   │
│    │     carry weight, danger gap lookahead, strategy preferences   │
│    └── merge + per-day breakdown                                    │
│  → resupplyStore.unifiedPlan                                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                            │
│                                                                     │
│  SIDEBAR (7 tabs):                                                  │
│    Route | Supply | Diet | Gear | Shop | Weather | Settings         │
│                                                                     │
│  MAP (MapLibre GL):                                                 │
│    RouteLayer | WaypointMarkers | SupplyMarkers |                   │
│    DayMarkers | WeatherMarkers                                      │
│                                                                     │
│  ELEVATION PROFILE: SVG distance vs altitude chart                  │
└─────────────────────────────────────────────────────────────────────┘

EXTERNAL APIs (all free, no keys):
  BRouter, Overpass, Open-Meteo, InPost, OpenFreeMap
```

## Core Value Proposition

The app solves a real problem that no other tool addresses: **route-aware supply logistics for multi-day cycling in Poland**.

4 defensible differentiators:
1. **Route-aware context** — shops sorted by distance along YOUR route, opening hours at YOUR arrival time
2. **Polish-specific knowledge** — Żabka/Biedronka detection, Sunday trading ban, Paczkomat integration
3. **Integrated planning** — route + food + water + weather + shelter in one tool
4. **Offline PWA** — works in rural areas with no signal

## Logic Gaps Identified

| Gap | Current State | Target State |
|-----|--------------|--------------|
| Strategy selection | 4 manual strategies + custom | Auto-detect based on shop density |
| Onboarding | 7 tabs, no guidance | Guided wizard: Draw → Date → Plan |
| Supply gap response | Warn only | "Nearest shop 3km off-route" suggestions |
| Water model | Binary gap (source within X km?) | Capacity + consumption rate + temp-adjusted |
| Maintenance | Disconnected reminders | Remove (scope creep) |
| Paczkomat prominence | Full UI, complex | Demote to "Advanced" toggle |

## What's Overengineered vs. Underengineered

**Overengineered:**
- Paczkomat scoring (7 score factors for a "nice to have" feature)
- 5 resupply strategies when auto-detect is better
- Gear checklist (every bikepacker has their own system)

**Underengineered:**
- Water planning (no capacity/consumption model)
- Gap response (warn but don't help)
- First-time user experience (no wizard)
- Food database (generic items, not mapped to actual store products)

## Target: Community Tool

Open-source tool for the Polish bikepacking community (100-1000 users).
Poland-focused: Żabka, Biedronka, InPost, Polish Sunday trading laws.
Simplified UX for first-time users, full power for experienced riders.
