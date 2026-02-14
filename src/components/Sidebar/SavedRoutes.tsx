import { useState, useCallback } from 'react';
import { useRouteStore } from '../../store/routeStore';
import { useSupplyStore } from '../../store/supplyStore';
import {
  getSavedRoutes,
  saveRoute,
  deleteRoute,
  encodeRouteToHash,
  type SavedRoute,
} from '../../services/routeStorage';

export function SavedRoutes() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const routeStats = useRouteStore((s) => s.routeStats);
  const dailyTargetKm = useRouteStore((s) => s.dailyTargetKm);
  const setWaypoints = useRouteStore((s) => s.setWaypoints);
  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);

  const [routes, setRoutes] = useState<SavedRoute[]>(() => getSavedRoutes());
  const [saveName, setSaveName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSave = useCallback(() => {
    if (waypoints.length < 2) return;
    const name = saveName.trim() || `Route ${new Date().toLocaleDateString()}`;
    saveRoute({ name, waypoints, routeStats, dailyTargetKm, corridorWidthKm });
    setRoutes(getSavedRoutes());
    setSaveName('');
  }, [waypoints, routeStats, dailyTargetKm, corridorWidthKm, saveName]);

  const handleLoad = useCallback((route: SavedRoute) => {
    setWaypoints(route.waypoints);
  }, [setWaypoints]);

  const handleDelete = useCallback((id: string) => {
    deleteRoute(id);
    setRoutes(getSavedRoutes());
  }, []);

  const handleShare = useCallback(() => {
    if (waypoints.length < 2) return;
    const name = saveName.trim() || 'Bikepacking Route';
    const hash = encodeRouteToHash(name, waypoints);
    const url = `${window.location.origin}${window.location.pathname}#route=${hash}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [waypoints, saveName]);

  return (
    <div className="saved-routes">
      {/* Save current route */}
      {waypoints.length >= 2 && (
        <div className="save-section">
          <div className="section-label">Save Current Route</div>
          <div className="save-row">
            <input
              type="text"
              className="save-input"
              placeholder="Route name..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button className="btn btn-save" onClick={handleSave}>Save</button>
          </div>
          <button className="btn btn-share" onClick={handleShare}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            {copied ? 'Link copied!' : 'Copy share link'}
          </button>
        </div>
      )}

      {/* Saved routes list */}
      {routes.length > 0 && (
        <>
          <div className="section-label">Saved Routes ({routes.length})</div>
          <ul className="saved-list">
            {routes.map((route) => (
              <li key={route.id} className="saved-item">
                <div className="saved-item-info" onClick={() => handleLoad(route)}>
                  <div className="saved-item-name">{route.name}</div>
                  <div className="saved-item-meta">
                    {route.waypoints.length} waypoints
                    {route.routeStats && ` · ${route.routeStats.distanceKm.toFixed(0)} km`}
                    <span className="saved-item-date">
                      {new Date(route.savedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  className="wp-remove"
                  onClick={() => handleDelete(route.id)}
                  title="Delete"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
