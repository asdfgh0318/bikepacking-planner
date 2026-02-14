# Bikepacking Planner — Plan

## Vision

A web app for planning bikepacking routes across Poland with automatic supply logistics. You draw your route, and the app finds InPost Paczkomaty, Frisco pickup points, and other services along the way — so you can pre-order food, gear, and supplies to collect as you ride.

## Core Problem

Bikepackers need to resupply during multi-day rides. Currently this requires manual research — finding shops, figuring out what's open, carrying extra weight "just in case." This app automates that by leveraging Poland's dense network of parcel lockers and delivery pickup points.

## Key Features

### Phase 1 — MVP: Route + Supply Points

- **Route Drawing** — draw/import a bikepacking route on a map (GPX import, manual drawing)
- **InPost Paczkomaty overlay** — show all Paczkomaty near the route (configurable corridor width, e.g. 2km)
- **Frisco pickup points** — show Frisco.pl pickup/delivery locations near route
- **Basic filtering** — filter by distance from route, operating hours, locker size
- **Supply point list** — generate a list of supply stops along the route with distances between them

### Phase 2 — Smart Planning

- **Auto supply planning** — based on ride pace and daily needs, suggest where to pick up supplies
- **Pre-order integration** — deep links or API integration to order on Frisco/InPost ahead of time
- **Day splitting** — auto-split route into days based on distance/elevation, align supply stops with day ends
- **Żabka/Biedronka overlay** — add shop locations (for immediate purchases, not pre-orders)
- **Water sources** — springs, taps, rivers marked along route

### Phase 3 — Community & Polish Services

- **Allegro InPost integration** — order gear to a Paczkomat along your route
- **Route sharing** — share routes with friends, community routes
- **Campsite/bivouac spots** — wild camping spots, shelters (schroniska)
- **Weather overlay** — weather forecast along the route for planned dates
- **Offline mode** — download route + supply plan for offline use

## Tech Stack (Proposed)

| Layer        | Tech                              | Why                                      |
| ------------ | --------------------------------- | ---------------------------------------- |
| Frontend     | React + TypeScript                | Standard, good map library ecosystem     |
| Map          | Leaflet + OpenStreetMap           | Free, open, great for cycling data       |
| Routing      | BRouter / OSRM                    | Bike-specific routing engines            |
| Backend      | Node.js (Express or Fastify)      | Simple, fast, JS everywhere              |
| Database     | PostgreSQL + PostGIS              | Geospatial queries for "near route"      |
| InPost Data  | InPost GeoWidget API / scraping   | Paczkomat locations                      |
| Frisco Data  | Frisco API / scraping             | Pickup point locations                   |
| Hosting      | Cloudflare Workers or VPS         | Cheap, fast                              |

## Data Sources

- **InPost API** — official GeoWidget API provides Paczkomat locations with details (size, 24h access, etc.)
- **Frisco.pl** — pickup point locations (may need scraping or partnership)
- **OpenStreetMap** — base map, cycling infrastructure, shop locations (Żabka, Biedronka tagged)
- **BRouter** — bicycle-optimized routing with elevation profiles
- **GPX files** — import existing routes from Strava, Komoot, etc.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend   │────▶│   Backend    │────▶│   PostgreSQL     │
│  React+Map   │     │  API Server  │     │   + PostGIS      │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐ ┌──────────┐
              │  InPost  │ │  Frisco  │
              │   API    │ │   API    │
              └──────────┘ └──────────┘
```

## Unique Selling Points

1. **Poland-first** — built specifically for Polish infrastructure (Paczkomaty are everywhere)
2. **Supply logistics** — no other bikepacking app thinks about resupply logistics
3. **Pre-order workflow** — order supplies days ahead, pick up as you ride
4. **Practical** — solves a real pain point for bikepackers doing 3+ day routes
