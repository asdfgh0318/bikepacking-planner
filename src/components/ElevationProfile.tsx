import { useRouteStore } from '../store/routeStore';
import { useMemo } from 'react';

export function ElevationProfile() {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const routeStats = useRouteStore((s) => s.routeStats);

  const profile = useMemo(() => {
    if (!routeGeometry) return null;

    const coords = routeGeometry.coordinates;
    if (coords.length < 2) return null;

    // Build elevation points with cumulative distance
    const points: Array<{ distKm: number; eleM: number }> = [];
    let cumDist = 0;

    for (let i = 0; i < coords.length; i++) {
      if (i > 0) {
        const [x1, y1] = coords[i - 1];
        const [x2, y2] = coords[i];
        const dx = (x2 - x1) * 111.32 * Math.cos(((y1 + y2) / 2) * (Math.PI / 180));
        const dy = (y2 - y1) * 110.574;
        cumDist += Math.sqrt(dx * dx + dy * dy);
      }
      points.push({ distKm: cumDist, eleM: coords[i][2] ?? 0 });
    }

    // Sample to ~200 points max for smooth rendering
    const step = Math.max(1, Math.floor(points.length / 200));
    const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);

    return sampled;
  }, [routeGeometry]);

  if (!profile || profile.length < 2) return null;

  const totalDist = profile[profile.length - 1].distKm;
  const minEle = Math.min(...profile.map((p) => p.eleM));
  const maxEle = Math.max(...profile.map((p) => p.eleM));
  const eleRange = maxEle - minEle || 1;

  // SVG dimensions
  const w = 1000;
  const h = 140;
  const pad = { top: 10, bottom: 24, left: 0, right: 0 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  // Build path
  const toX = (d: number) => pad.left + (d / totalDist) * chartW;
  const toY = (e: number) => pad.top + chartH - ((e - minEle) / eleRange) * chartH;

  const linePath = profile
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.distKm).toFixed(1)},${toY(p.eleM).toFixed(1)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L${toX(totalDist).toFixed(1)},${(pad.top + chartH).toFixed(1)}` +
    ` L${pad.left},${(pad.top + chartH).toFixed(1)} Z`;

  // Grid lines
  const gridLines = 4;
  const gridEles = Array.from({ length: gridLines + 1 }, (_, i) =>
    minEle + (eleRange * i) / gridLines
  );

  return (
    <div className="elevation-profile">
      <div className="elevation-header">
        <span className="elevation-title">Elevation</span>
        {routeStats && (
          <div className="elevation-badges">
            <span className="ele-badge up">+{routeStats.ascentM.toFixed(0)} m</span>
            <span className="ele-badge down">-{routeStats.descentM.toFixed(0)} m</span>
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="elevation-svg" role="img" aria-label={`Elevation profile chart: ${totalDist.toFixed(0)} km distance, ${minEle.toFixed(0)}m to ${maxEle.toFixed(0)}m elevation${routeStats ? `, +${routeStats.ascentM.toFixed(0)}m ascent, -${routeStats.descentM.toFixed(0)}m descent` : ''}`}>
        <title>Route Elevation Profile</title>
        <desc>Elevation chart showing terrain between {minEle.toFixed(0)}m and {maxEle.toFixed(0)}m over {totalDist.toFixed(0)} km{routeStats ? `. Total ascent: ${routeStats.ascentM.toFixed(0)}m, total descent: ${routeStats.descentM.toFixed(0)}m` : ''}.</desc>
        <defs>
          <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* Grid */}
        {gridEles.map((ele, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              y1={toY(ele)}
              x2={w - pad.right}
              y2={toY(ele)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            <text
              x={w - 4}
              y={toY(ele) - 3}
              fill="rgba(255,255,255,0.3)"
              fontSize="10"
              textAnchor="end"
            >
              {ele.toFixed(0)}m
            </text>
          </g>
        ))}
        {/* Area fill */}
        <path d={areaPath} fill="url(#eleGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#4ade80" strokeWidth="2" />
      </svg>
      <div className="elevation-axis">
        <span>0 km</span>
        <span>{(totalDist / 2).toFixed(0)} km</span>
        <span>{totalDist.toFixed(0)} km</span>
      </div>
    </div>
  );
}
