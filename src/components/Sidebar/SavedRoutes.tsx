import { useState, useCallback } from 'react';
import { Share2, Download, X } from 'lucide-react';
import { toast } from 'sonner';
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
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const daySegments = useRouteStore((s) => s.daySegments);
  const dailyTargetKm = useRouteStore((s) => s.dailyTargetKm);
  const setWaypoints = useRouteStore((s) => s.setWaypoints);
  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);

  const [routes, setRoutes] = useState<SavedRoute[]>(() => getSavedRoutes());
  const [saveName, setSaveName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSave = useCallback(() => {
    if (waypoints.length < 2) return;
    const name = saveName.trim() || `Route ${new Date().toLocaleDateString()}`;
    saveRoute({ name, waypoints, routeStats, dailyTargetKm, corridorWidthKm });
    setRoutes(getSavedRoutes());
    setSaveName('');
    toast.success('Route saved', { description: name });
  }, [waypoints, routeStats, dailyTargetKm, corridorWidthKm, saveName]);

  const handleLoad = useCallback((route: SavedRoute) => {
    setWaypoints(route.waypoints);
  }, [setWaypoints]);

  const handleDelete = useCallback((id: string) => {
    deleteRoute(id);
    setRoutes(getSavedRoutes());
    toast.success('Route deleted');
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

  const handleDownloadPackage = useCallback(() => {
    if (!routeGeometry || waypoints.length < 2) return;
    const pkg = {
      version: 1,
      exportedAt: new Date().toISOString(),
      name: saveName.trim() || 'Bikepacking Route',
      waypoints,
      routeGeometry,
      routeStats,
      dailyTargetKm,
      corridorWidthKm,
      daySegments,
      supplyPoints,
    };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(saveName.trim() || 'bikepacking-route').replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [waypoints, routeGeometry, routeStats, daySegments, supplyPoints, dailyTargetKm, corridorWidthKm, saveName]);

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
            <Share2 size={14} />
            {copied ? 'Link copied!' : 'Copy share link'}
          </button>
          {routeGeometry && (
            <button className="btn btn-download" onClick={handleDownloadPackage}>
              <Download size={14} />
              Download offline package
            </button>
          )}
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
                  aria-label="Delete route"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
