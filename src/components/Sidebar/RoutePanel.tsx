import { useRouteStore } from '../../store/routeStore';

export function RoutePanel() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const routeStats = useRouteStore((s) => s.routeStats);
  const isCalculating = useRouteStore((s) => s.isCalculating);
  const clearRoute = useRouteStore((s) => s.clearRoute);
  const removeWaypoint = useRouteStore((s) => s.removeWaypoint);

  return (
    <div className="panel">
      <h3>Route</h3>

      {waypoints.length === 0 && (
        <p className="hint">Click on the map to add waypoints</p>
      )}

      {waypoints.length > 0 && (
        <>
          <ul className="waypoint-list">
            {waypoints.map((wp, i) => (
              <li key={wp.id}>
                <span>
                  {i + 1}. ({wp.lat.toFixed(3)}, {wp.lng.toFixed(3)})
                </span>
                <button
                  className="btn-small"
                  onClick={() => removeWaypoint(wp.id)}
                  title="Remove"
                >
                  x
                </button>
              </li>
            ))}
          </ul>

          {isCalculating && <p className="hint">Calculating route...</p>}

          {routeStats && (
            <div className="route-stats">
              <div>
                <strong>{routeStats.distanceKm.toFixed(1)}</strong> km
              </div>
              <div>
                <strong>{routeStats.ascentM.toFixed(0)}</strong> m ascent
              </div>
              <div>
                <strong>{routeStats.descentM.toFixed(0)}</strong> m descent
              </div>
            </div>
          )}

          <button className="btn" onClick={clearRoute}>
            Clear Route
          </button>
        </>
      )}
    </div>
  );
}
