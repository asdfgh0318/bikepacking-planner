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
  const osmFailed = useSupplyStore((s) => s.osmFailed);
  const retrySupply = useSupplyStore((s) => s.retrySupply);
  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const setCorridorWidthKm = useSupplyStore((s) => s.setCorridorWidthKm);
  const waterCapacityL = useTripStore((s) => s.waterCapacityL);
  const setWaterCapacityL = useTripStore((s) => s.setWaterCapacityL);
  const waterPlan = useTripStore((s) => s.waterPlan);

  if (!routeGeometry) return null;

  const food = supplyPoints.filter((p) => LAYER_TYPES.food.has(p.type) && p.type !== 'paczkomat').length;
  const lockers = supplyPoints.filter((p) => p.type === 'paczkomat').length;
  const water = supplyPoints.filter((p) => LAYER_TYPES.water.has(p.type)).length;
  const sleep = supplyPoints.filter((p) => LAYER_TYPES.sleep.has(p.type)).length;
  const dangers = [...supplyGaps, ...waterGaps].filter((g) => g.severity === 'danger').length;

  return (
    <Section title="Supply" meta={isLoading ? 'searching…' : osmFailed ? 'not loaded' : dangers > 0 ? <span className="tag tag-bad">{dangers} danger</span> : `${food} food · ${water} water`}>
      {isLoading && supplyPoints.length === 0 && <p className="note">Searching OpenStreetMap along the route…</p>}
      {!isLoading && osmFailed && (
        <Alert severity="warning">
          Shops and water could not be loaded: OpenStreetMap is not answering. This is usually temporary.
          <div><button className="btn" onClick={retrySupply}>Retry</button></div>
        </Alert>
      )}
      {!isLoading && !osmFailed && supplyPoints.length === 0 && (
        <Alert severity="warning">No supply points found within {corridorWidthKm} km of the route. Try a wider corridor.</Alert>
      )}
      {supplyPoints.length > 0 && (
        <p className="note">{osmFailed ? '' : `${food} food stops, ${water} water sources, ${sleep} places to sleep, `}{lockers} Paczkomaty within {corridorWidthKm} km of the route.</p>
      )}

      <GapList gaps={supplyGaps} kind="food" />
      <GapList gaps={waterGaps} kind="water" />

      <Slider label="Water you carry" value={waterCapacityL} onChange={setWaterCapacityL} min={0.5} max={5} step={0.5} unit=" L" />
      {waterPlan && waterPlan.criticalPoints.map((cp, i) => (
        <Alert key={i} severity="danger">
          Running dry near km {cp.km.toFixed(0)} on day {cp.dayNumber}.{' '}
          {cp.nearestSourceName !== null && cp.nearestSourceKm !== null
            ? `Nearest water: ${cp.nearestSourceName} at km ${cp.nearestSourceKm.toFixed(0)}.`
            : 'No water source found on the route: carry more or plan a refill at a shop.'}
        </Alert>
      ))}
      {waterPlan && waterPlan.recommendations.slice(0, 2).map((r, i) => <p key={i} className="note">{r}</p>)}

      <Slider label="Search corridor" value={corridorWidthKm} onChange={setCorridorWidthKm} min={1} max={10} step={0.5} unit=" km" />
    </Section>
  );
}
