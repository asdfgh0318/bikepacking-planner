import { useMemo } from 'react';
import { useRouteStore } from '../store/routeStore';
import { distanceKm } from '../utils/distance';

const W = 1000;
const H = 120;
const PAD_TOP = 8;
const PAD_BOTTOM = 4;
const MAX_POINTS = 250;

/** Elevation strip under the map, with day boundaries marked. */
export function ElevationProfile() {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const daySegments = useRouteStore((s) => s.daySegments);

  const profile = useMemo(() => {
    const coords = routeGeometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    const pts: { km: number; ele: number }[] = [];
    let km = 0;
    for (let i = 0; i < coords.length; i++) {
      if (i > 0) km += distanceKm(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
      pts.push({ km, ele: coords[i][2] ?? 0 });
    }
    const step = Math.max(1, Math.floor(pts.length / MAX_POINTS));
    return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
  }, [routeGeometry]);

  if (!profile) return null;

  const total = profile[profile.length - 1].km;
  const min = Math.min(...profile.map((p) => p.ele));
  const max = Math.max(...profile.map((p) => p.ele));
  const range = max - min || 1;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const x = (km: number) => (km / total) * W;
  const y = (ele: number) => PAD_TOP + chartH - ((ele - min) / range) * chartH;

  const line = profile.map((p, i) => `${i ? 'L' : 'M'}${x(p.km).toFixed(1)},${y(p.ele).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H - PAD_BOTTOM} L0,${H - PAD_BOTTOM} Z`;

  return (
    <div className="elevation" aria-label={`Elevation ${min.toFixed(0)} to ${max.toFixed(0)} m over ${total.toFixed(0)} km`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id="ele-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--green)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--green)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ele-fill)" />
        <path d={line} fill="none" stroke="var(--green)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {daySegments.slice(1).map((seg) => (
          <line key={seg.dayNumber} x1={x(seg.startKm)} x2={x(seg.startKm)} y1={0} y2={H} stroke="var(--text-dim)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" opacity="0.6" />
        ))}
      </svg>
      <div className="elevation-axis">
        <span>0 km</span>
        <span>{min.toFixed(0)}–{max.toFixed(0)} m</span>
        <span>{total.toFixed(0)} km</span>
      </div>
    </div>
  );
}
