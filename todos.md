# Bikepacking Planner — TODOs

## Research & Discovery

- [ ] Investigate InPost GeoWidget API — auth, rate limits, data format
- [ ] Investigate Frisco.pl pickup points — any public API? scraping needed?
- [ ] Check OSM data quality for Polish shops (Żabka, Biedronka, Lewiatan)
- [ ] Evaluate BRouter vs OSRM for bike routing in Poland
- [ ] Research Allegro/InPost API for parcel ordering integration
- [ ] Look into existing bikepacking route data sources for Poland

## Phase 1 — MVP

### Setup
- [ ] Initialize frontend project (React + TypeScript + Vite)
- [ ] Initialize backend project (Node.js + Express/Fastify)
- [ ] Set up PostgreSQL + PostGIS database
- [ ] Set up project CI/CD (GitHub Actions)
- [ ] Configure Leaflet map with OSM tiles

### Map & Routing
- [ ] Display base map with cycling-friendly tiles
- [ ] Implement route drawing on map (click-to-add waypoints)
- [ ] Implement GPX file import
- [ ] Integrate BRouter/OSRM for route calculation between waypoints
- [ ] Show elevation profile for the route
- [ ] Calculate total distance and estimated ride time

### Supply Points
- [ ] Fetch and store InPost Paczkomaty locations
- [ ] Display Paczkomaty as markers on map
- [ ] Filter Paczkomaty by distance from route (corridor search)
- [ ] Show Paczkomat details on click (size, hours, address)
- [ ] Fetch and store Frisco pickup locations
- [ ] Display Frisco points on map
- [ ] Filter Frisco points by distance from route
- [ ] Generate ordered supply point list along route

### UI/UX
- [ ] Route creation sidebar (waypoints, distance, elevation)
- [ ] Supply points panel (list of stops with distances)
- [ ] Settings panel (corridor width, filters)
- [ ] Mobile-responsive layout
- [ ] GPX export of planned route

## Phase 2 — Smart Planning

- [ ] Auto supply planner (suggest stops based on daily needs)
- [ ] Day splitting algorithm (distance + elevation based)
- [ ] Deep links to Frisco/InPost for pre-ordering
- [ ] Żabka/Biedronka locations from OSM
- [ ] Water source overlay
- [ ] Route saving (user accounts)

## Phase 3 — Community

- [ ] Route sharing
- [ ] Community route database
- [ ] Campsite/bivouac spots layer
- [ ] Weather forecast overlay
- [ ] Offline mode (PWA + cached tiles)

## Meta

- [ ] Write CLAUDE.md for the project
- [ ] Set up proper .gitignore
- [ ] Create README.md with setup instructions
