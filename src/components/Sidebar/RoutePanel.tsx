import { useRef } from 'react';
import { MapPin, X, Download, Upload, Moon, Tent } from 'lucide-react';
import { useRouteStore } from '../../store/routeStore';
import { useSupplyStore } from '../../store/supplyStore';
import { exportGPX, downloadGPX, readFileAsText, parseGPX } from '../../utils/gpx';
import { parseGpxToWaypoints, exportRouteToGpx } from '../../services/gpx';
import { EmptyState, StatCard, RangeSlider } from '../ui';
import type { RoutingProfile } from '../../types';

const PROFILE_OPTIONS: { value: RoutingProfile; label: string; icon: string }[] = [
  { value: 'trekking', label: 'Gravel', icon: '🛤' },
  { value: 'fastbike', label: 'Road', icon: '🛣' },
  { value: 'mtb', label: 'MTB', icon: '⛰' },
];

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
  const routingProfile = useRouteStore((s) => s.routingProfile);
  const setRoutingProfile = useRouteStore((s) => s.setRoutingProfile);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const setWaypoints = useRouteStore((s) => s.setWaypoints);
  const setRouteGeometry = useRouteStore((s) => s.setRouteGeometry);
  const setRouteStats = useRouteStore((s) => s.setRouteStats);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportGPX = () => {
    if (!routeGeometry) return;
    const gpxContent = exportGPX('Bikepacking Route', routeGeometry, supplyPoints);
    downloadGPX('bikepacking-route.gpx', gpxContent);
  };

  const handleImportGPX = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const { waypoints: parsed, geometry } = parseGPX(text);

      if (parsed.length > 0) {
        setWaypoints(parsed);
      }
      if (geometry) {
        setRouteGeometry(geometry);
        // Compute basic stats from the geometry coordinates
        const coords = geometry.coordinates;
        let dist = 0;
        let ascent = 0;
        let descent = 0;
        for (let i = 1; i < coords.length; i++) {
          const [x1, y1, z1] = coords[i - 1];
          const [x2, y2, z2] = coords[i];
          const dx = (x2 - x1) * 111.32 * Math.cos(((y1 + y2) / 2) * (Math.PI / 180));
          const dy = (y2 - y1) * 110.574;
          dist += Math.sqrt(dx * dx + dy * dy);
          if (z1 != null && z2 != null) {
            const diff = z2 - z1;
            if (diff > 0) ascent += diff;
            else descent += Math.abs(diff);
          }
        }
        setRouteStats({ distanceKm: dist, ascentM: ascent, descentM: descent });
      }
    } catch {
      // Fallback: try the simpler DOMParser-based parser from services/gpx
      try {
        const text = await readFileAsText(file);
        const coords = parseGpxToWaypoints(text);
        if (coords.length > 0) {
          clearRoute();
          const newWaypoints = coords.map((c, i) => ({
            id: `gpx-import-${i}`,
            lat: c.lat,
            lng: c.lng,
          }));
          setWaypoints(newWaypoints);
        }
      } catch {
        // silently fail
      }
    }
    // Reset the file input so the same file can be re-imported
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="panel">
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportGPX(file);
        }}
      />
      {waypoints.length === 0 ? (
        <>
          <EmptyState
            icon={<MapPin size={40} strokeWidth={1.5} color="#4ade80" opacity={0.6} />}
            message="Click on the map to add waypoints"
            hint="or import a GPX file"
          />
          <div className="route-actions" style={{ marginTop: 8 }}>
            <button className="btn btn-export" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} />
              Import GPX
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Routing profile selector */}
          <div className="profile-selector">
            {PROFILE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`profile-btn ${routingProfile === opt.value ? 'active' : ''}`}
                onClick={() => setRoutingProfile(opt.value)}
              >
                <span className="profile-icon">{opt.icon}</span>
                <span className="profile-label">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Stats cards */}
          {routeStats && (
            <div className="stats-grid">
              <StatCard value={routeStats.distanceKm.toFixed(1)} label="km" />
              <StatCard value={routeStats.ascentM.toFixed(0)} label="m up" variant="up" />
              <StatCard value={routeStats.descentM.toFixed(0)} label="m down" variant="down" />
              {daySegments.length > 0 && (
                <StatCard value={daySegments.length} label="days" />
              )}
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

              <div style={{ marginBottom: 12 }}>
                <RangeSlider
                  label="Daily target"
                  value={dailyTargetKm}
                  onChange={setDailyTargetKm}
                  min={30}
                  max={150}
                  step={5}
                  unit="km"
                />
              </div>

              <ul className="day-list">
                {daySegments.map((seg) => (
                  <li key={seg.dayNumber} className="day-item">
                    <div className={`day-badge day-${seg.difficulty}`}>D{seg.dayNumber}</div>
                    <div className="day-info">
                      <div className="day-stats">
                        <span className="day-dist">{seg.distanceKm.toFixed(0)} km</span>
                        <span className="day-time">
                          {Math.floor(seg.estimatedHours)}h{Math.round((seg.estimatedHours % 1) * 60).toString().padStart(2, '0')}
                        </span>
                        <span className={`day-difficulty ${seg.difficulty}`}>{seg.difficulty}</span>
                      </div>
                      <div className="day-stats-secondary">
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
                      {seg.nightStop && (
                        <div className={`day-night-stop ${seg.nightStop.type}`}>
                          {seg.nightStop.type === 'campsite' ? (
                            <Tent size={11} />
                          ) : (
                            <Moon size={11} />
                          )}
                          <span>
                            {seg.nightStop.type === 'campsite'
                              ? seg.nightStop.campsite?.name ?? 'Campsite'
                              : 'Wild camp'}
                          </span>
                        </div>
                      )}
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
                <button className="wp-remove" onClick={() => removeWaypoint(wp.id)} aria-label="Remove waypoint">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>

          {/* Action buttons */}
          <div className="route-actions">
            <button className="btn btn-export" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} />
              Import GPX
            </button>
            {routeGeometry && (
              <button className="btn btn-export" onClick={handleExportGPX}>
                <Download size={14} />
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
