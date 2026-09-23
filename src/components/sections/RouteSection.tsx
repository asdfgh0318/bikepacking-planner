import { useRef } from 'react';
import { toast } from 'sonner';
import { useRouteStore } from '../../store/routeStore';
import { useSupplyStore } from '../../store/supplyStore';
import { exportGPX, downloadGPX, readFileAsText, parseGPX } from '../../utils/gpx';
import { lineStats } from '../../utils/geo';
import { encodeRouteToHash } from '../../services/routeStorage';
import { Section, Segmented, Stat } from '../ui';
import type { RoutingProfile } from '../../types';

const PROFILES: { value: RoutingProfile; label: string }[] = [
  { value: 'trekking', label: 'Gravel' },
  { value: 'fastbike', label: 'Road' },
  { value: 'mtb', label: 'MTB' },
];

export function RouteSection() {
  const waypoints = useRouteStore((s) => s.waypoints);
  const routeStats = useRouteStore((s) => s.routeStats);
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const isCalculating = useRouteStore((s) => s.isCalculating);
  const daySegments = useRouteStore((s) => s.daySegments);
  const routingProfile = useRouteStore((s) => s.routingProfile);
  const setRoutingProfile = useRouteStore((s) => s.setRoutingProfile);
  const removeWaypoint = useRouteStore((s) => s.removeWaypoint);
  const clearRoute = useRouteStore((s) => s.clearRoute);
  const setWaypoints = useRouteStore((s) => s.setWaypoints);
  const setRouteGeometry = useRouteStore((s) => s.setRouteGeometry);
  const setRouteStats = useRouteStore((s) => s.setRouteStats);
  const setGpxGeometryLoaded = useRouteStore((s) => s.setGpxGeometryLoaded);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const fileRef = useRef<HTMLInputElement>(null);

  async function importGpx(file: File) {
    try {
      const { waypoints: parsed, geometry } = parseGPX(await readFileAsText(file));
      if (parsed.length === 0) throw new Error('no track');
      setWaypoints(parsed);
      if (geometry) {
        setGpxGeometryLoaded(true);
        setRouteGeometry(geometry);
        setRouteStats(lineStats(geometry.coordinates));
      }
      toast.success(`GPX imported: ${parsed.length} waypoints`);
    } catch {
      toast.error('Could not read that GPX file');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function share() {
    const url = `${location.origin}${location.pathname}#route=${encodeRouteToHash('Route', waypoints)}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied'),
      () => toast.error('Could not copy link'),
    );
  }

  return (
    <Section title="Route" meta={routeStats ? `${routeStats.distanceKm.toFixed(0)} km` : undefined}>
      <input ref={fileRef} type="file" accept=".gpx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importGpx(f); }} />

      {waypoints.length === 0 ? (
        <div className="empty">
          <p>Tap the map to add waypoints, or import a GPX track.</p>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import GPX</button>
        </div>
      ) : (
        <>
          <Segmented ariaLabel="Routing profile" value={routingProfile} options={PROFILES} onChange={setRoutingProfile} />

          {routeStats && (
            <div className="stats">
              <Stat value={routeStats.distanceKm.toFixed(0)} label="km" />
              <Stat value={`+${routeStats.ascentM.toFixed(0)}`} label="m up" />
              <Stat value={`−${routeStats.descentM.toFixed(0)}`} label="m down" />
              <Stat value={daySegments.length || '–'} label="days" />
            </div>
          )}
          {isCalculating && <p className="note">Calculating route…</p>}

          <ul className="list waypoint-list">
            {waypoints.map((wp, i) => (
              <li key={wp.id} className="item waypoint-item">
                <span className={`dot ${i === 0 ? 'dot-start' : i === waypoints.length - 1 ? 'dot-end' : ''}`} />
                <span className="grow">{i === 0 ? 'Start' : i === waypoints.length - 1 ? 'End' : `Via ${i}`}<small> {wp.lat.toFixed(3)}, {wp.lng.toFixed(3)}</small></span>
                <button className="btn-icon" aria-label="Remove waypoint" onClick={() => removeWaypoint(wp.id)}>×</button>
              </li>
            ))}
          </ul>

          <div className="row wrap">
            <button className="btn" onClick={() => fileRef.current?.click()}>Import GPX</button>
            {routeGeometry && <button className="btn" onClick={() => downloadGPX('bikepacking-route.gpx', exportGPX('Bikepacking Route', routeGeometry, supplyPoints))}>Export GPX</button>}
            {waypoints.length >= 2 && <button className="btn" onClick={share}>Copy link</button>}
            <button className="btn btn-danger" onClick={clearRoute}>Clear</button>
          </div>
        </>
      )}
    </Section>
  );
}
