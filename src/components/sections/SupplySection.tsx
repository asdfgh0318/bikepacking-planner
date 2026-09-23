import { useRouteStore } from '../../store/routeStore';
import { useSupplyStore, LAYER_TYPES } from '../../store/supplyStore';
import { useTripStore } from '../../store/tripStore';
import { Section, Slider, Alert } from '../ui';
import type { SupplyGap } from '../../types';

const SEVERITY: Record<SupplyGap['severity'], 'info' | 'warning' | 'danger'> = { safe: 'info', caution: 'warning', danger: 'danger' };

function GapList({ gaps, kind }: { gaps: SupplyGap[]; kind: 'food' | 'water' }) {
  const shown = gaps.filter((g) => g.severity !== 'safe');
  if (shown.length === 0) return null;
  return (
    <>
      {shown.map((g, i) => (
        <Alert key={i} severity={SEVERITY[g.severity]}>
          <strong>{g.distanceKm.toFixed(0)} km without {kind}</strong> · {g.fromName} → {g.toName}
          {g.stockUpAt && <div className="note">Stock up at {g.stockUpAt.name} (km {g.stockUpAt.km})</div>}
          {g.alternatives?.[0] && <div className="note">Off route: {g.alternatives[0].name}, {g.alternatives[0].detourKm} km detour at km {g.alternatives[0].routeKm}</div>}
        </Alert>
      ))}
    </>
  );
}

export function SupplySection() {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const supplyGaps = useSupplyStore((s) => s.supplyGaps);
  const waterGaps = useSupplyStore((s) => s.waterGaps);
  const isLoading = useSupplyStore((s) => s.isLoading);
  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const setCorridorWidthKm = useSupplyStore((s) => s.setCorridorWidthKm);
  const waterCapacityL = useTripStore((s) => s.waterCapacityL);
  const setWaterCapacityL = useTripStore((s) => s.setWaterCapacityL);
  const waterPlan = useTripStore((s) => s.waterPlan);

  if (!routeGeometry) return null;

  const food = supplyPoints.filter((p) => LAYER_TYPES.food.has(p.type)).length;
  const water = supplyPoints.filter((p) => LAYER_TYPES.water.has(p.type)).length;
  const sleep = supplyPoints.filter((p) => LAYER_TYPES.sleep.has(p.type)).length;
  const dangers = [...supplyGaps, ...waterGaps].filter((g) => g.severity === 'danger').length;

  return (
    <Section title="Supply" meta={isLoading ? 'searching…' : dangers > 0 ? <span className="tag tag-bad">{dangers} danger</span> : `${food} food · ${water} water`}>
      {isLoading && supplyPoints.length === 0 && <p className="note">Searching OpenStreetMap along the route…</p>}
      {!isLoading && supplyPoints.length === 0 && (
        <Alert severity="warning">No supply points found. OpenStreetMap may be rate-limiting; try again in a minute or widen the corridor.</Alert>
      )}
      {supplyPoints.length > 0 && (
        <p className="note">{food} food stops, {water} water sources, {sleep} places to sleep within {corridorWidthKm} km of the route.</p>
      )}

      <GapList gaps={supplyGaps} kind="food" />
      <GapList gaps={waterGaps} kind="water" />

      <Slider label="Water you carry" value={waterCapacityL} onChange={setWaterCapacityL} min={0.5} max={5} step={0.5} unit=" L" />
      {waterPlan && waterPlan.criticalPoints.map((cp, i) => (
        <Alert key={i} severity="danger">
          Running dry near km {cp.km} on day {cp.dayNumber}. Nearest water: {cp.nearestSourceName} at km {cp.nearestSourceKm.toFixed(0)}.
        </Alert>
      ))}
      {waterPlan && waterPlan.recommendations.slice(0, 2).map((r, i) => <p key={i} className="note">{r}</p>)}

      <Slider label="Search corridor" value={corridorWidthKm} onChange={setCorridorWidthKm} min={1} max={10} step={0.5} unit=" km" />
    </Section>
  );
}
