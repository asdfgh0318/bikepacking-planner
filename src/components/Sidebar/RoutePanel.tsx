import { MapPin, X, Download, Moon, Tent } from 'lucide-react';
import { useRouteStore } from '../../store/routeStore';
import { useSupplyStore } from '../../store/supplyStore';
import { exportGPX, downloadGPX } from '../../utils/gpx';
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

  const handleExportGPX = () => {
    if (!routeGeometry) return;
    const gpxContent = exportGPX('Bikepacking Route', routeGeometry, supplyPoints);
    downloadGPX('bikepacking-route.gpx', gpxContent);
  };

  return (
    <div className="panel">
      {waypoints.length === 0 ? (
        <EmptyState
          icon={<MapPin size={40} strokeWidth={1.5} color="#4ade80" opacity={0.6} />}
          message="Click on the map to add waypoints"
          hint="or import a GPX file below"
        />
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
