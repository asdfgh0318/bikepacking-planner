import { useRouteStore } from '../../store/routeStore';
import { useSupplyStore } from '../../store/supplyStore';
import { useTripStore } from '../../store/tripStore';
import { RESUPPLY_PRESETS, autoDetectStrategy } from '../../services/resupplyPlanner';
import { DIET_PROFILES } from '../../services/diet';
import { SUPPLY_BADGE_LETTERS, SUPPLY_COLORS } from '../../constants/supplyTypes';
import { Section, Segmented, Slider, Toggle, Alert, Stat } from '../ui';
import type { DietType, ResupplyStrategyId } from '../../types';

const STRATEGIES: { value: ResupplyStrategyId; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'daily-ration', label: 'Daily' },
  { value: 'grazer', label: 'Graze' },
  { value: 'ultralight', label: 'Light' },
  { value: 'self-sufficient', label: 'Carry' },
];

function clock(h: number) {
  return `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
}

export function PlanSection() {
  const daySegments = useRouteStore((s) => s.daySegments);
  const routeStats = useRouteStore((s) => s.routeStats);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const plan = useTripStore((s) => s.plan);
  const strategyId = useTripStore((s) => s.strategyId);
  const setStrategyId = useTripStore((s) => s.setStrategyId);
  const diet = useTripStore((s) => s.diet);
  const setDiet = useTripStore((s) => s.setDiet);
  const rideStartHour = useTripStore((s) => s.rideStartHour);
  const setRideStartHour = useTripStore((s) => s.setRideStartHour);
  const avgSpeedKmh = useTripStore((s) => s.avgSpeedKmh);
  const setAvgSpeedKmh = useTripStore((s) => s.setAvgSpeedKmh);
  const paczkomat = useTripStore((s) => s.paczkomatShipping);
  const setPaczkomat = useTripStore((s) => s.setPaczkomatShipping);

  if (daySegments.length === 0) return null;

  const points = paczkomat ? supplyPoints : supplyPoints.filter((p) => p.type !== 'paczkomat');
  const auto = strategyId === 'auto' && routeStats ? autoDetectStrategy(points, routeStats.distanceKm) : null;
  const strategyText = auto
    ? `${RESUPPLY_PRESETS[auto.strategyId].label}: ${auto.reason}`
    : RESUPPLY_PRESETS[strategyId].description;

  return (
    <Section title="Resupply plan" meta={plan ? `${plan.resupply.purchases.length} stops` : undefined}>
      <Segmented ariaLabel="Resupply strategy" value={strategyId} options={STRATEGIES} onChange={setStrategyId} />
      <p className="note">{strategyText}</p>

      <label className="field">
        <span>Diet</span>
        <select value={diet} onChange={(e) => setDiet(e.target.value as DietType)}>
          {(Object.keys(DIET_PROFILES) as DietType[]).map((d) => <option key={d} value={d}>{DIET_PROFILES[d].label}</option>)}
        </select>
      </label>
      <Slider label="Ride start" value={rideStartHour} onChange={setRideStartHour} min={5} max={10} unit=":00" />
      <Slider label="Average speed" value={avgSpeedKmh} onChange={setAvgSpeedKmh} min={10} max={25} unit=" km/h" />
      <Toggle label="Pre-ship food to InPost Paczkomaty" checked={paczkomat} onChange={setPaczkomat} />

      {!plan && <p className="note">The plan appears once shops along the route are known.</p>}

      {plan && (
        <>
          <div className="stats">
            <Stat value={plan.resupply.purchases.length} label="stops" />
            <Stat value={(plan.resupply.totalCalories / 1000).toFixed(1)} label="k kcal" />
            <Stat value={(plan.resupply.maxCarryWeightG / 1000).toFixed(1)} label="kg max" />
            {plan.shipping && plan.shipping.totalParcels > 0 && <Stat value={plan.shipping.totalParcels} label="parcels" />}
          </div>

          {plan.resupply.warnings.map((w, i) => <Alert key={i} severity={w.severity}>{w.message}</Alert>)}

          <ol className="list">
            {plan.dayBreakdown.map((day) => (
              <li key={day.dayNumber} className="item plan-day">
                <div className="row">
                  <strong>Day {day.dayNumber}</strong>
                  <span className="note">{day.distanceKm.toFixed(0)} km · {day.caloriesNeeded} kcal · carry up to {(day.carryWeightMaxG / 1000).toFixed(1)} kg</span>
                </div>
                {day.stops.length === 0 && <div className="note">Nothing to buy: carry from the day before.</div>}
                {day.stops.map((s, i) => (
                  <div key={`${s.stopId}-${i}`} className="row stop">
                    <span className="badge" style={{ background: (SUPPLY_COLORS[s.stopType] || SUPPLY_COLORS.shop).bg }}>{s.source === 'paczkomat' ? 'P' : SUPPLY_BADGE_LETTERS[s.stopType] || 'S'}</span>
                    <span className="grow">{s.stopName}<small> km {s.distanceKm.toFixed(0)} · ~{clock(s.estimatedArrivalHour)} · {s.totalCalories} kcal</small></span>
                    {s.isOpenOnArrival === false && <span className="tag tag-bad">closed</span>}
                    {s.isOpenOnArrival === true && <span className="tag tag-good">open</span>}
                  </div>
                ))}
                {day.parcelPickup && (
                  <div className="note">Parcel: ship by {day.parcelPickup.shipByDate}, locker size {day.parcelPickup.lockerSize}.</div>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </Section>
  );
}
