/**
 * Centralized configuration constants for the bikepacking planner.
 *
 * This file replaces magic numbers scattered across services with clearly
 * named, documented constants.  When tuning thresholds or timeouts, look
 * here first — one place to rule them all.
 */

// ---------------------------------------------------------------------------
// API Timeouts
// ---------------------------------------------------------------------------

/** BRouter routing API timeout (ms). Generous because complex routes are slow. */
export const BROUTER_TIMEOUT_MS = 45_000;

/** Overpass (OSM) fetch timeout (ms) — client-side limit for fetchWithRetry. */
export const OVERPASS_TIMEOUT_MS = 30_000;

/** Overpass server-side query timeout (seconds), embedded in the QL query. */
export const OVERPASS_QUERY_TIMEOUT_S = 25;

/** Overpass API endpoints, tried in order for failover. */
export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

/** How long cached weather data stays valid (ms). 1 hour. */
export const WEATHER_CACHE_TTL_MS = 60 * 60 * 1000;

/** Timezone used for Open-Meteo daily forecast alignment. */
export const WEATHER_TIMEZONE = 'Europe/Warsaw';

/** Maximum forecast horizon supported by Open-Meteo (days). */
export const WEATHER_MAX_FORECAST_DAYS = 16;

// Weather warning thresholds
/** Precipitation (mm) above which a rain warning is issued. */
export const WEATHER_RAIN_WARNING_MM = 10;
/** Precipitation (mm) above which a rain danger alert is issued. */
export const WEATHER_RAIN_DANGER_MM = 20;
/** Wind speed (km/h) above which a wind warning is issued. */
export const WEATHER_WIND_WARNING_KMH = 40;
/** Wind speed (km/h) above which a wind danger alert is issued. */
export const WEATHER_WIND_DANGER_KMH = 60;
/** Max temperature (C) above which a heat warning is issued. */
export const WEATHER_HEAT_WARNING_C = 33;
/** Max temperature (C) above which a heat danger alert is issued. */
export const WEATHER_HEAT_DANGER_C = 38;
/** Min temperature (C) below which a freeze warning is issued. */
export const WEATHER_FREEZE_WARNING_C = 0;
/** Min temperature (C) below which a freeze danger alert is issued. */
export const WEATHER_FREEZE_DANGER_C = -5;

// ---------------------------------------------------------------------------
// Gap Analysis Thresholds (km)
// ---------------------------------------------------------------------------

/** Food gap below this distance (km) is "safe". */
export const FOOD_GAP_SAFE_KM = 30;
/** Food gap below this distance (km) is "caution"; above is "danger". */
export const FOOD_GAP_CAUTION_KM = 50;
/** Minimum food edge gap (km) to report (start/end of route). */
export const FOOD_GAP_MIN_EDGE_KM = 5;
/** Minimum food gap (km) between consecutive stops to report. */
export const FOOD_GAP_MIN_BETWEEN_KM = 20;

/** Water gap below this distance (km) is "safe". */
export const WATER_GAP_SAFE_KM = 20;
/** Water gap below this distance (km) is "caution"; above is "danger". */
export const WATER_GAP_CAUTION_KM = 40;
/** Minimum water edge gap (km) to report (start/end of route). */
export const WATER_GAP_MIN_EDGE_KM = 10;
/** Minimum water gap (km) between consecutive stops to report. */
export const WATER_GAP_MIN_BETWEEN_KM = 15;

// ---------------------------------------------------------------------------
// Resupply Planning
// ---------------------------------------------------------------------------

/** Extra calorie buffer (fraction) to carry on Sundays due to reduced shop availability. */
export const SUNDAY_FOOD_BUFFER = 0.15;

/** Lookahead distance (km) beyond current segment end to check for danger gaps. */
export const DANGER_GAP_LOOKAHEAD_KM = 20;

/** Extra calorie factor for danger-gap pre-loading (fraction of gap calories). */
export const DANGER_GAP_EXTRA_CALORIE_FACTOR = 0.4;

/** Food carry weight (g) above which a "heavy load" warning is triggered. */
export const HEAVY_LOAD_WARNING_G = 2500;

// ---------------------------------------------------------------------------
// Paczkomat Scoring
// ---------------------------------------------------------------------------

/** Paczkomaty within this distance (km) of route start are penalised — no resupply needed day 1. */
export const PACZKOMAT_MIN_USEFUL_KM = 30;

/** Score penalty for a Paczkomat too close to route start. */
export const PACZKOMAT_EARLY_PENALTY = -10;

/** Score bonus when Paczkomat is < 5 km from night stop. */
export const PACZKOMAT_NIGHT_STOP_CLOSE_BONUS = 14;
/** Score bonus when Paczkomat is < 10 km from night stop. */
export const PACZKOMAT_NIGHT_STOP_NEAR_BONUS = 9;

/** Score bonus for 24/7 Paczkomat access. */
export const PACZKOMAT_24H_BONUS = 7;

/** Score bonus for Paczkomat with large (C/L) locker. */
export const PACZKOMAT_LARGE_LOCKER_BONUS = 2;

/** Supplemental calories packed per Paczkomat parcel. */
export const PACZKOMAT_PARCEL_TARGET_CALS = 800;

// ---------------------------------------------------------------------------
// Overpass Route Sampling
// ---------------------------------------------------------------------------

/** Number of route points to sample for Overpass 'around' filter. */
export const OVERPASS_ROUTE_SAMPLE_POINTS = 80;

// ---------------------------------------------------------------------------
// GPX
// ---------------------------------------------------------------------------

/** Maximum waypoints kept when importing a GPX file (downsampled if exceeded). */
export const MAX_GPX_WAYPOINTS = 50;

// ---------------------------------------------------------------------------
// SQLite POI Cache
// ---------------------------------------------------------------------------

/** SQLite POI cache TTL (ms). 7 days for Overpass data. */
export const POI_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** InPost cache TTL (ms). 1 day (locations change more often). */
export const INPOST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
