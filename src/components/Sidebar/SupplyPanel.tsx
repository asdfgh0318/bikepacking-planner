import { useSupplyStore } from '../../store/supplyStore';

export function SupplyPanel() {
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const isLoading = useSupplyStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="panel">
        <h3>Supply Points</h3>
        <p className="hint">Searching for supply points...</p>
      </div>
    );
  }

  if (supplyPoints.length === 0) {
    return (
      <div className="panel">
        <h3>Supply Points</h3>
        <p className="hint">
          Add a route to find Paczkomaty and shops along the way
        </p>
      </div>
    );
  }

  // Calculate distances between consecutive points
  const withGaps = supplyPoints.map((pt, i) => ({
    ...pt,
    gapFromPrev:
      i === 0
        ? pt.distanceFromStartKm
        : pt.distanceFromStartKm - supplyPoints[i - 1].distanceFromStartKm,
  }));

  return (
    <div className="panel">
      <h3>Supply Points ({supplyPoints.length})</h3>
      <ul className="supply-list">
        {withGaps.map((pt) => (
          <li key={pt.id} className={`supply-item supply-${pt.type}`}>
            <div className="supply-item-header">
              <span className={`badge badge-${pt.type}`}>
                {pt.type === 'paczkomat' ? 'P' : 'S'}
              </span>
              <strong>{pt.name}</strong>
            </div>
            <div className="supply-item-details">
              <span>{pt.distanceFromStartKm.toFixed(1)} km</span>
              <span className="gap">+{pt.gapFromPrev.toFixed(1)} km</span>
              {pt.details?.is24h && <span className="tag-24h">24/7</span>}
            </div>
            {pt.details?.address && (
              <div className="supply-item-address">{pt.details.address}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
