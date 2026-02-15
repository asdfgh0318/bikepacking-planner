import { Grid3X3, AlertTriangle, Droplets, GlassWater, Lightbulb, MapPin } from 'lucide-react';
import { useSupplyStore } from '../../store/supplyStore';
import { useResupplyStore } from '../../store/resupplyStore';
import { useRouteStore } from '../../store/routeStore';
import { EmptyState, RangeSlider } from '../ui';
import { SUPPLY_COLORS, SUPPLY_BADGE_LETTERS, SUPPLY_TYPE_LABELS } from '../../constants/supplyTypes';
import type { GapSeverity, SupplyGap } from '../../types';

const GAP_COLORS: Record<GapSeverity, { bg: string; text: string; label: string }> = {
  safe: { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: 'Safe' },
  caution: { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: 'Caution' },
  danger: { bg: 'rgba(248, 113, 113, 0.1)', text: '#f87171', label: 'Danger' },
};

function GapSuggestions({ gap }: { gap: SupplyGap }) {
  const hasStockUp = !!gap.stockUpAt;
  const hasNext = !!gap.nextResupply;
  const hasAlternatives = gap.alternatives && gap.alternatives.length > 0;

  if (!hasStockUp && !hasNext && !hasAlternatives) return null;

  return (
    <div className="gap-suggestions">
      {hasStockUp && (
        <div className="gap-suggestion">
          <Lightbulb size={11} className="gap-suggestion-icon" />
          <span>
            Stock up at <strong>{gap.stockUpAt!.name}</strong> at km {gap.stockUpAt!.km} before this gap
          </span>
        </div>
      )}
      {hasStockUp && hasNext && (
        <div className="gap-suggestion">
          <MapPin size={11} className="gap-suggestion-icon" />
          <span>
            Next food: <strong>{gap.nextResupply!.name}</strong> at km {gap.nextResupply!.km} ({gap.distanceKm.toFixed(0)} km away)
          </span>
        </div>
      )}
      {!hasStockUp && hasNext && (
        <div className="gap-suggestion">
          <MapPin size={11} className="gap-suggestion-icon" />
          <span>
            First food: <strong>{gap.nextResupply!.name}</strong> at km {gap.nextResupply!.km}
          </span>
        </div>
      )}
      {hasAlternatives && gap.alternatives!.map((alt, j) => (
        <div key={j} className="gap-suggestion gap-suggestion-alt">
          <MapPin size={11} className="gap-suggestion-icon" />
          <span>
            Nearest off-route: <strong>{alt.name}</strong> — {alt.detourKm} km detour at km {alt.routeKm}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SupplyPanel() {
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const supplyGaps = useSupplyStore((s) => s.supplyGaps);
  const waterGaps = useSupplyStore((s) => s.waterGaps);
  const isLoading = useSupplyStore((s) => s.isLoading);
  const waterCapacityL = useResupplyStore((s) => s.waterCapacityL);
  const setWaterCapacityL = useResupplyStore((s) => s.setWaterCapacityL);
  const waterPlan = useResupplyStore((s) => s.waterPlan);
  const daySegments = useRouteStore((s) => s.daySegments);

  if (isLoading) {
    return (
      <div className="panel">
        <div className="calculating">
          <div className="spinner" />
          <span>Searching for supply points...</span>
        </div>
      </div>
    );
  }

  if (supplyPoints.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={<Grid3X3 size={40} strokeWidth={1.5} color="#fbbf24" opacity={0.6} />}
          message="No supply points yet"
          hint="Create a route to find Paczkomaty and shops"
        />
      </div>
    );
  }

  const withGaps = supplyPoints.map((pt, i) => ({
    ...pt,
    gapFromPrev:
      i === 0
        ? pt.distanceFromStartKm
        : pt.distanceFromStartKm - supplyPoints[i - 1].distanceFromStartKm,
  }));

  // Count by type
  const counts = supplyPoints.reduce<Record<string, number>>((acc, pt) => {
    acc[pt.type] = (acc[pt.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="panel">
      {/* Summary */}
      <div className="supply-summary">
        {Object.entries(counts).map(([type, count]) => {
          const color = (SUPPLY_COLORS[type] || SUPPLY_COLORS.shop).bg;
          const icon = SUPPLY_BADGE_LETTERS[type] || SUPPLY_BADGE_LETTERS.shop;
          const label = SUPPLY_TYPE_LABELS[type] || type;
          return (
            <div key={type} className="supply-count">
              <span className="supply-count-badge" style={{ background: color }}>
                {icon}
              </span>
              <span>{count} {label}</span>
            </div>
          );
        })}
      </div>

      {/* Gap Warnings */}
      {supplyGaps.filter((g) => g.severity !== 'safe').length > 0 && (
        <div className="supply-gaps">
          <div className="supply-gaps-header">
            <AlertTriangle size={14} />
            <span>Supply Gaps</span>
          </div>
          {supplyGaps
            .filter((g) => g.severity !== 'safe')
            .map((gap, i) => {
              const colors = GAP_COLORS[gap.severity];
              return (
                <div key={i} className="supply-gap-card">
                  <div
                    className="supply-gap-item"
                    style={{ background: colors.bg, borderColor: colors.text }}
                    aria-label={`${colors.label}: ${gap.distanceKm.toFixed(0)} km gap from ${gap.fromName} to ${gap.toName}`}
                  >
                    <div className="supply-gap-distance" style={{ color: colors.text }}>
                      {gap.distanceKm.toFixed(0)} km
                    </div>
                    <div className="supply-gap-names">
                      {gap.fromName} → {gap.toName}
                    </div>
                    <span className="supply-gap-severity" style={{ color: colors.text }} aria-label={`Severity: ${colors.label}`}>
                      {colors.label}
                    </span>
                  </div>
                  <GapSuggestions gap={gap} />
                </div>
              );
            })}
        </div>
      )}

      {/* Water Gap Warnings */}
      {waterGaps.filter((g) => g.severity !== 'safe').length > 0 && (
        <div className="supply-gaps water-gaps">
          <div className="supply-gaps-header">
            <Droplets size={14} />
            <span>Water Gaps</span>
          </div>
          {waterGaps
            .filter((g) => g.severity !== 'safe')
            .map((gap, i) => {
              const colors = GAP_COLORS[gap.severity];
              return (
                <div
                  key={i}
                  className="supply-gap-item"
                  style={{ background: colors.bg, borderColor: colors.text }}
                  aria-label={`${colors.label}: ${gap.distanceKm.toFixed(0)} km water gap from ${gap.fromName} to ${gap.toName}`}
                >
                  <div className="supply-gap-distance" style={{ color: colors.text }}>
                    {gap.distanceKm.toFixed(0)} km
                  </div>
                  <div className="supply-gap-names">
                    {gap.fromName} → {gap.toName}
                  </div>
                  <span className="supply-gap-severity" style={{ color: colors.text }} aria-label={`Severity: ${colors.label}`}>
                    {colors.label}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {/* Water Planning */}
      <div className="supply-gaps water-planning">
        <div className="supply-gaps-header">
          <GlassWater size={14} />
          <span>Water Planning</span>
        </div>

        <RangeSlider
          label="Water Capacity"
          value={waterCapacityL}
          onChange={setWaterCapacityL}
          min={0.5}
          max={5.0}
          step={0.5}
          unit="L"
          minLabel="0.5 L"
          maxLabel="5.0 L"
        />

        {waterPlan && daySegments.length > 0 && (
          <>
            <div className="water-plan-stats">
              <div className="water-plan-stat">
                Total consumption: {waterPlan.totalConsumptionL} L over {daySegments.length} day{daySegments.length !== 1 ? 's' : ''}
              </div>
              <div className="water-plan-stat">
                Refill stops: {waterPlan.refillCount}
              </div>
            </div>

            {waterPlan.criticalPoints.length > 0 && (
              <div className="water-critical-list">
                {waterPlan.criticalPoints.map((cp, i) => (
                  <div
                    key={i}
                    className="supply-gap-item"
                    style={{ background: 'rgba(248, 113, 113, 0.1)', borderColor: '#f87171' }}
                    aria-label={`Low water warning at km ${cp.km}`}
                  >
                    <div className="supply-gap-distance" style={{ color: '#f87171' }}>
                      km {cp.km}
                    </div>
                    <div className="supply-gap-names">
                      Low water at km {cp.km} (day {cp.dayNumber}) — nearest source: {cp.nearestSourceName} at km {cp.nearestSourceKm.toFixed(0)}
                    </div>
                    <span className="supply-gap-severity" style={{ color: '#f87171' }}>
                      {cp.liters.toFixed(2)} L
                    </span>
                  </div>
                ))}
              </div>
            )}

            {waterPlan.recommendations.length > 0 && (
              <div className="water-recommendations">
                <div className="water-recommendations-header">Recommendations</div>
                <ul className="water-recommendations-list">
                  {waterPlan.recommendations.map((rec, i) => (
                    <li key={i} className="water-recommendation-item">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* List */}
      <ul className="supply-list">
        {withGaps.map((pt) => {
          const color = (SUPPLY_COLORS[pt.type] || SUPPLY_COLORS.shop).bg;
          const icon = SUPPLY_BADGE_LETTERS[pt.type] || SUPPLY_BADGE_LETTERS.shop;
          return (
            <li key={pt.id} className="supply-item">
              <div className="supply-item-left">
                <span className="supply-badge" style={{ background: color }}>
                  {icon}
                </span>
                <div className="supply-connector" />
              </div>
              <div className="supply-item-content">
                <div className="supply-item-name">{pt.name}</div>
                <div className="supply-item-meta">
                  <span>{pt.distanceFromStartKm.toFixed(1)} km</span>
                  <span className="supply-gap">+{pt.gapFromPrev.toFixed(1)} km</span>
                  {pt.details?.is24h && <span className="tag tag-24h">24/7</span>}
                </div>
                {pt.details?.waterType && (
                  <div className="supply-item-address">{pt.details.waterType.replace('_', ' ')}</div>
                )}
                {pt.details?.campsiteType && (
                  <div className="supply-item-address">
                    {pt.details.campsiteType.replace('_', ' ')}
                    {pt.details.fee === false && ' · free'}
                  </div>
                )}
                {pt.details?.repairType && (
                  <div className="supply-item-address">
                    {pt.details.repairType === 'repair_station' ? 'self-service' : 'bike shop'}
                    {pt.details.phone && ` · ${pt.details.phone}`}
                  </div>
                )}
                {pt.details?.address && (
                  <div className="supply-item-address">{pt.details.address}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
