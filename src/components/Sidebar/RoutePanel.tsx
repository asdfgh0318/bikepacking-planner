import { useRouteStore } from '../../store/routeStore';

export function RoutePanel() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const routeStats = useRouteStore((s) => s.routeStats);
  const isCalculating = useRouteStore((s) => s.isCalculating);
  const clearRoute = useRouteStore((s) => s.clearRoute);
  const removeWaypoint = useRouteStore((s) => s.removeWaypoint);

  return (
    <div className="panel">
      {waypoints.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.6">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          <p>Click on the map to add waypoints</p>
          <p className="hint">or import a GPX file below</p>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          {routeStats && (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{routeStats.distanceKm.toFixed(1)}</span>
                <span className="stat-label">km</span>
              </div>
              <div className="stat-card">
                <span className="stat-value up">{routeStats.ascentM.toFixed(0)}</span>
                <span className="stat-label">m up</span>
              </div>
              <div className="stat-card">
                <span className="stat-value down">{routeStats.descentM.toFixed(0)}</span>
                <span className="stat-label">m down</span>
              </div>
            </div>
          )}

          {isCalculating && (
            <div className="calculating">
              <div className="spinner" />
              <span>Calculating route...</span>
            </div>
          )}

          {/* Waypoint list */}
          <div className="waypoint-header">
            <span className="section-label">Waypoints ({waypoints.length})</span>
          </div>
          <ul className="waypoint-list">
            {waypoints.map((wp, i) => (
              <li key={wp.id} className="waypoint-item">
                <div className="wp-dot" style={{
                  background: i === 0 ? '#4ade80' : i === waypoints.length - 1 ? '#f87171' : '#94a3b8'
                }} />
                <div className="wp-info">
                  <span className="wp-label">
                    {i === 0 ? 'Start' : i === waypoints.length - 1 ? 'End' : `Waypoint ${i + 1}`}
                  </span>
                  <span className="wp-coords">{wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}</span>
                </div>
                <button className="wp-remove" onClick={() => removeWaypoint(wp.id)} title="Remove">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <button className="btn btn-danger" onClick={clearRoute}>
            Clear Route
          </button>
        </>
      )}
    </div>
  );
}
