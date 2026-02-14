import { useSupplyStore } from '../../store/supplyStore';

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  paczkomat: { icon: 'P', color: '#fbbf24', label: 'Paczkomat' },
  zabka: { icon: 'Ż', color: '#4ade80', label: 'Żabka' },
  biedronka: { icon: 'B', color: '#f87171', label: 'Biedronka' },
  shop: { icon: 'S', color: '#60a5fa', label: 'Shop' },
  water: { icon: 'W', color: '#38bdf8', label: 'Water' },
  campsite: { icon: 'C', color: '#c084fc', label: 'Campsite' },
  repair: { icon: 'R', color: '#facc15', label: 'Repair' },
};

export function SupplyPanel() {
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
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
        <div className="empty-state">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="3" y1="15" x2="21" y2="15"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
            <line x1="15" y1="3" x2="15" y2="21"/>
          </svg>
          <p>No supply points yet</p>
          <p className="hint">Create a route to find Paczkomaty and shops</p>
        </div>
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
          const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.shop;
          return (
            <div key={type} className="supply-count">
              <span className="supply-count-badge" style={{ background: cfg.color }}>
                {cfg.icon}
              </span>
              <span>{count} {cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* List */}
      <ul className="supply-list">
        {withGaps.map((pt) => {
          const cfg = TYPE_CONFIG[pt.type] || TYPE_CONFIG.shop;
          return (
            <li key={pt.id} className="supply-item">
              <div className="supply-item-left">
                <span className="supply-badge" style={{ background: cfg.color }}>
                  {cfg.icon}
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
