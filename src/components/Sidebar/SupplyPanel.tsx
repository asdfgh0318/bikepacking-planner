import { Grid3X3, AlertTriangle, Droplets } from 'lucide-react';
import { useSupplyStore } from '../../store/supplyStore';
import { EmptyState } from '../ui';
import { SUPPLY_COLORS, SUPPLY_BADGE_LETTERS, SUPPLY_TYPE_LABELS } from '../../constants/supplyTypes';
import type { GapSeverity } from '../../types';

const GAP_COLORS: Record<GapSeverity, { bg: string; text: string; label: string }> = {
  safe: { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: 'Safe' },
  caution: { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: 'Caution' },
  danger: { bg: 'rgba(248, 113, 113, 0.1)', text: '#f87171', label: 'Danger' },
};

export function SupplyPanel() {
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const supplyGaps = useSupplyStore((s) => s.supplyGaps);
  const waterGaps = useSupplyStore((s) => s.waterGaps);
  const isLoading = useSupplyStore((s) => s.isLoading);

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
                <div
                  key={i}
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
