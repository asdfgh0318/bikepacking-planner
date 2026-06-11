<p align="center">
  <img src="banner.svg" alt="Bikepacking Planner" width="100%">
</p>

<p align="center">
  <strong>Plan multi-day bikepacking trips with real-time supply discovery, weather forecasts, and smart resupply logistics.</strong>
</p>

<p align="center">
  <a href="https://asdfgh0318.github.io/bikepacking-planner/"><strong>Live app</strong></a>
</p>

<p align="center">
  <img src="https://github.com/asdfgh0318/bikepacking-planner/actions/workflows/ci.yml/badge.svg" alt="CI">
  <img src="https://img.shields.io/badge/react-18.3-61dafb?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/typescript-5.6-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/maplibre--gl-4.7-396CB2?logo=maplibre&logoColor=white" alt="MapLibre">
  <img src="https://img.shields.io/badge/vite-5.4-646cff?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/PWA-offline--ready-5a0fc8?logo=pwa&logoColor=white" alt="PWA">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

---

A fully client-side web app for planning bikepacking routes across Poland. Combines route planning, OpenStreetMap POI discovery, weather forecasts, gap analysis, and resupply optimization — no account or API keys required.

## Features

### Route Planning
- **Click-to-place waypoints** on an interactive map with drag-to-reorder
- **GPX import/export** — bring routes from Komoot, Strava, or any GPX source
- **Three routing profiles** via BRouter: trekking, fastbike, mountain bike
- **Elevation profile** with ascent/descent stats
- **Shareable URLs** — encode your entire route in a link

### Supply Point Discovery
- **23 POI types** detected along your route via Overpass API:
  - **Shops** — Zabka, Biedronka, supermarkets, convenience stores, bakeries
  - **Food** — cafes, restaurants
  - **Water** — springs, drinking fountains, taps, wells
  - **Accommodation** — campsites, shelters, alpine huts
  - **Services** — bike repair, pharmacies, toilets, compressed air
  - **Fuel stations**
  - **Bail-out points** — train stations, hospitals
- **Paczkomat (InPost)** locker integration for pre-shipping supplies
- **Adjustable search corridor** around your route
- **SQLite caching** — POI results cached in-browser for 7 days

### Smart Planning
- **Gap analysis** — detects dangerous food and water resupply gaps with severity levels (safe / caution / danger)
- **Auto day splitting** — breaks your route into daily segments based on target distance
- **5 resupply strategies** — auto, daily-ration, grazer, ultralight, self-sufficient
- **Paczkomat scoring** — ranks InPost lockers by distance, detour, and timing
- **Shopping timeline** with day-by-day breakdowns
- **Sunday-aware planning** — knows Poland's trading-Sunday calendar, so it won't send you to a closed Biedronka

### Weather
- **16-day forecast** aligned to your trip dates via Open-Meteo
- **Danger warnings** for heat, cold, heavy rain, and strong wind
- **Dynamic water model** — adjusts recommended intake based on temperature

### Gear & Diet
- **Gear tracker** with weight calculator and category breakdown
- **Diet planner** with 5 profiles: standard, high-energy, ultralight, keto, vegan
- **Macro tracking** per diet profile
- **Carry weight curve** visualization with heavy-load warnings

### Offline & PWA
- Installable as a standalone app on mobile and desktop
- Service worker caches map tiles, routes, and POI data
- SQLite database runs entirely in-browser (sql.js / WASM)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| State | Zustand |
| Map | MapLibre GL JS + react-map-gl |
| Tiles | OpenFreeMap (free, no API key) |
| Routing | BRouter API |
| POI data | Overpass API (OpenStreetMap) |
| Weather | Open-Meteo API |
| Parcels | InPost API |
| Geo utils | Turf.js |
| Local DB | SQLite via sql.js (in-browser WASM) |
| Icons | Lucide React |
| Toasts | Sonner |
| Testing | Vitest (unit) + Playwright (E2E) |
| PWA | vite-plugin-pwa |

**Zero backend.** Everything runs in the browser. All APIs used are free and keyless.

## Getting Started

```bash
# Clone
git clone https://github.com/asdfgh0318/bikepacking-planner.git
cd bikepacking-planner

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Other Commands

```bash
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run unit tests
npm run lint       # Lint with ESLint
```

## Project Structure

```
src/
├── components/
│   ├── Map/              # MapView, route layer, POI markers, day/weather markers
│   ├── Sidebar/          # All planning panels (route, supply, resupply, weather, gear, diet)
│   ├── ElevationProfile  # Elevation chart
│   ├── Wizard            # Onboarding flow
│   └── ui/               # Reusable UI components
├── store/                # Zustand stores (route, supply, resupply, gear, diet, settings)
├── hooks/                # Data fetching & calculation hooks
├── services/             # API clients (BRouter, Overpass, InPost, weather, GPX, caching)
├── types/                # TypeScript interfaces
├── constants/            # POI definitions, colors, icons
├── utils/                # Geo helpers, debug logger, fetch retry
└── config.ts             # Centralized thresholds & configuration
```

## How It Works

1. **Place waypoints** on the map or import a GPX file
2. **BRouter** calculates the cycling route between waypoints
3. **Overpass API** queries OpenStreetMap for supply points within a corridor along the route
4. **Gap analysis** identifies stretches without food or water resupply
5. **Day splitter** breaks the route into manageable daily segments
6. **Resupply planner** suggests what to buy where, including Paczkomat pre-shipping
7. **Weather forecast** warns about conditions for your planned dates

## APIs Used

All APIs are free and require no authentication:

| API | Purpose |
|-----|---------|
| [BRouter](https://brouter.de) | Bicycle routing with elevation |
| [Overpass API](https://overpass-api.de) | OpenStreetMap POI queries |
| [Open-Meteo](https://open-meteo.com) | Weather forecasts |
| [InPost](https://inpost.pl) | Paczkomat locker locations |
| [OpenFreeMap](https://openfreemap.org) | Map tiles |

## License

MIT
