import { useRouteStore } from '../../store/routeStore';
import { useSupplyStore } from '../../store/supplyStore';
import { exportGPX, downloadGPX } from '../../utils/gpx';

export function RoutePanel() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const routeStats = useRouteStore((s) => s.routeStats);
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const isCalculating = useRouteStore((s) => s.isCalculating);
  const clearRoute = useRouteStore((s) => s.clearRoute);
  const removeWaypoint = useRouteStore((s) => s.removeWaypoint);
  const daySegments = useRouteStore((s) => s.daySegments);
  const dailyTargetKm = useRouteStore((s) => s.dailyTargetKm);
  const setDailyTargetKm = useRouteStore((s) => s.setDailyTargetKm);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);

  const handleExportGPX = () => {
    if (!routeGeometry) return;
    const gpxContent = exportGPX('Bikepacking Route', routeGeometry, supplyPoints);
    downloadGPX('bikepacking-route.gpx', gpxContent);
  };

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

          {/* Day Segments */}
          {daySegments.length > 0 && (
            <div className="day-segments">
              <div className="day-segments-header">
                <span className="section-label">Trip Plan ({daySegments.length} days)</span>
              </div>

              <div className="setting-card" style={{ marginBottom: 12 }}>
                <div className="setting-header">
                  <span>Daily target</span>
                  <span className="setting-value">{dailyTargetKm} km</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={150}
                  step={5}
                  value={dailyTargetKm}
                  onChange={(e) => setDailyTargetKm(Number(e.target.value))}
                  className="range-input"
                />
                <div className="range-labels">
                  <span>30 km</span>
                  <span>150 km</span>
                </div>
              </div>

              <ul className="day-list">
                {daySegments.map((seg) => (
                  <li key={seg.dayNumber} className="day-item">
                    <div className="day-badge">D{seg.dayNumber}</div>
                    <div className="day-info">
                      <div className="day-stats">
                        <span className="day-dist">{seg.distanceKm.toFixed(0)} km</span>
                        {seg.ascentM > 0 && (
                          <span className="day-ele up">+{seg.ascentM.toFixed(0)}m</span>
                        )}
                        {seg.descentM > 0 && (
                          <span className="day-ele down">-{seg.descentM.toFixed(0)}m</span>
                        )}
                      </div>
                      <div className="day-stops">
                        {seg.supplyStops.length > 0 ? (
                          <span>{seg.supplyStops.length} supply stop{seg.supplyStops.length > 1 ? 's' : ''}</span>
                        ) : (
                          <span className="day-no-stops">No supply stops</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
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

          {/* Action buttons */}
          <div className="route-actions">
            {routeGeometry && (
              <button className="btn btn-export" onClick={handleExportGPX}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export GPX
              </button>
            )}
            <button className="btn btn-danger" onClick={clearRoute}>
              Clear Route
            </button>
          </div>
        </>
      )}
    </div>
  );
}
