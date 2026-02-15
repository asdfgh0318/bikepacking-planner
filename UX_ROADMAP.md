# Logic Assessment & UX Roadmap

## Context

Full logic analysis of the bikepacking planner app based on system flowchart review and user interview. The app solves route-aware supply logistics for multi-day cycling in Poland — a problem no other tool addresses. Target: open-source community tool for 100-1000 Polish bikepackers.

## Core Value Proposition

1. **Route-aware context** — shops along YOUR route with arrival-time opening hours
2. **Polish-specific knowledge** — Żabka/Biedronka, Sunday trading ban, InPost Paczkomat
3. **Integrated planning** — route + food + water + weather + shelter in one tool
4. **Offline PWA** — works in rural areas with no signal

## Implementation Roadmap (6 items)

---

### 1. Guided Wizard (biggest UX win)

**Problem**: 7 tabs overwhelm first-time users. No guidance on what to do first.

**Files**:
- CREATE `src/components/Wizard/Wizard.tsx` — step-by-step overlay
- CREATE `src/components/Wizard/WizardStep.tsx` — reusable step component
- MODIFY `src/App.tsx` — show wizard on first visit
- MODIFY `src/index.css` — wizard styles

**Design**:
- Check `localStorage.getItem('bikepacking-wizard-complete')` on mount
- If not complete, show fullscreen overlay with 3 steps:
  - **Step 1**: "Click on the map to set your start and end points" — highlight map, dim sidebar. Show pulsing crosshair hint. Advance when 2+ waypoints exist.
  - **Step 2**: "When are you starting your trip?" — date picker + daily distance slider (default 80km). Advance on submit.
  - **Step 3**: "Your plan is ready!" — auto-trigger resupply plan generation, show summary stats (days, distance, shops along route, supply gaps). Button: "Explore Details" → dismiss wizard, open Shop tab.
- "Skip" button always visible
- Set `localStorage` flag on complete/skip
- Power users never see it again

### 2. Auto-Detect Resupply Strategy

**Problem**: 4 strategies + custom creates decision paralysis. Most users don't know which to pick.

**Files**:
- MODIFY `src/services/resupplyPlanner.ts` — add `autoDetectStrategy()` function
- MODIFY `src/store/resupplyStore.ts` — default strategy to `'auto'`
- MODIFY `src/components/Sidebar/ResupplyPanel.tsx` — show auto-detected label
- MODIFY `src/types/index.ts` — add `'auto'` to `ResupplyStrategyId`

**Algorithm** for `autoDetectStrategy(supplyPoints, daySegments)`:
```
shopDensity = count food shops / total route km
if shopDensity > 0.5 shops/km → 'grazer' (shops everywhere, buy often)
if shopDensity > 0.2 shops/km → 'daily-ration' (normal density)
if shopDensity > 0.05 shops/km → 'self-sufficient' (sparse, carry buffer)
else → 'self-sufficient' with carryBufferDays=2 (very sparse)
```
- Show detected strategy as: "Auto: Daily Ration (12 shops along route)"
- User can still override to manual strategy
- Recalculate when route or supply points change

### 3. Water Consumption Model

**Problem**: Water gaps are binary (source within X km?) — no capacity/consumption tracking. Critical in summer.

**Files**:
- CREATE `src/services/waterPlanner.ts` — water consumption model
- MODIFY `src/types/index.ts` — add `WaterPlan`, `WaterState` types
- MODIFY `src/store/resupplyStore.ts` — add `waterCapacityL`, `waterPlan`
- MODIFY `src/components/Sidebar/SupplyPanel.tsx` — show water status per segment
- MODIFY `src/services/unifiedPlan.ts` — integrate water into unified plan

**Water model**:
```
Input:
  waterCapacityL: number (default 2.0L, user-configurable)
  consumptionBaseL: 0.5 L/hr (base rate)
  tempAdjustment: if maxTemp > 25°C → +0.2L/hr per 5°C above 25

Per segment:
  ridingHours = segment.estimatedHours
  consumptionRate = 0.5 + max(0, (maxTempC - 25) / 5 * 0.2)
  waterNeeded = ridingHours * consumptionRate

  Walk through route km by km:
    Start day with waterCapacityL
    Subtract consumption proportionally
    At each water source: refill to capacity
    Track minimum water level per segment

Output:
  waterLevelCurve: { km, liters }[]  — like carry weight curve but for water
  criticalPoints: { km, liters, nearestSource }[]  — where water drops below 0.3L
  recommendations: "Fill up at km 45 (spring) — next source is 28km away"
```

### 4. "Nearest Shop Off-Route" Suggestions for Supply Gaps

**Problem**: Gap analysis warns "45km food gap between km 120-165" but doesn't help resolve it.

**Files**:
- MODIFY `src/services/gapAnalysis.ts` — add `findNearbyAlternatives()`
- MODIFY `src/types/index.ts` — add `GapAlternative` to `SupplyGap`
- MODIFY `src/components/Sidebar/SupplyPanel.tsx` — render alternatives
- MODIFY `src/components/Map/SupplyMarkers.tsx` — highlight suggested detours

**Logic**:
For each gap with severity `caution` or `danger`:
- Query Overpass for shops within 10km buffer of the gap midpoint (wider than route corridor)
- For each found shop:
  - Calculate detour distance (straight-line from route to shop and back)
  - Calculate where on the route the detour would start
  - Format: "Biedronka 'Centrum' — 2.8km off-route at km 142 (+5.6km detour)"
- Sort by detour distance, show top 3
- Clicking a suggestion adds it as a waypoint (with confirmation)

### 5. Remove Maintenance Service

**Problem**: Disconnected from core planning, scope creep. Riders track maintenance separately.

**Files**:
- DELETE `src/services/maintenance.ts`
- MODIFY `src/components/Sidebar/ShoppingTimeline.tsx` — remove maintenance reminder rendering
- MODIFY any imports referencing maintenance

### 6. Demote Paczkomat to Advanced Toggle

**Problem**: Paczkomat is "nice to have" but currently prominent. Adds complexity for casual users.

**Files**:
- MODIFY `src/components/Sidebar/ResupplyPanel.tsx` — hide Paczkomat config behind "Advanced Options" collapsible section
- MODIFY `src/store/resupplyStore.ts` — default `enablePaczkomat` to `false`

**Design**:
- Paczkomat config hidden in collapsible "Advanced: Pre-Ship Packages" section
- Collapsed by default
- When expanded, show existing Paczkomat UI unchanged
- Toggle label: "Pre-ship food packages via InPost Paczkomat"

---

## Summary

| # | Task | Impact | Complexity |
|---|------|--------|------------|
| 1 | Guided wizard | HIGH — makes app accessible to beginners | Medium |
| 2 | Auto-detect strategy | HIGH — eliminates confusing choice | Low |
| 3 | Water consumption model | HIGH — critical safety feature for summer | Medium |
| 4 | Off-route shop suggestions | MEDIUM — makes gap analysis actionable | Medium |
| 5 | Remove maintenance | LOW — cleanup/focus | Trivial |
| 6 | Demote Paczkomat | LOW — reduces perceived complexity | Trivial |

## Verification

1. `npx tsc --noEmit` — no type errors
2. `npx vitest run` — all tests pass
3. Manual: first visit shows wizard, complete 3 steps → plan generated
4. Manual: create route through sparse area → auto-detects self-sufficient strategy
5. Manual: summer route → water consumption model shows refill recommendations
6. Manual: route with 50km gap → "nearest shop 3km off-route" suggestion appears
7. Manual: Paczkomat config hidden until "Advanced" is expanded
