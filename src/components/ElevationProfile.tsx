import { useRouteStore } from '../store/routeStore';
import { distanceKm } from '../utils/distance';
import { useMemo } from 'react';
import type { SurfaceType } from '../services/surfaceAnalysis';

const SURFACE_COLORS: Record<SurfaceType, string> = {
  paved: '#94a3b8',
  gravel: '#f59e0b',
  dirt: '#92400e',
  sand: '#fbbf24',
  unknown: '#334155',
};

const SURFACE_LABELS: Record<SurfaceType, string> = {
  paved: 'Paved',
  gravel: 'Gravel',
  dirt: 'Dirt',
  sand: 'Sand',
  unknown: 'Unknown',
};

export function ElevationProfile() {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const routeStats = useRouteStore((s) => s.routeStats);
  const surfaceSummary = useRouteStore((s) => s.surfaceSummary);
  const mountainPasses = useRouteStore((s) => s.mountainPasses);

  const profile = useMemo(() => {
    if (!routeGeometry) return null;

    const coords = routeGeometry.coordinates;
    if (coords.length < 2) return null;

    // Build elevation points with cumulative distance
    const points: Array<{ distKm: number; eleM: number }> = [];
    let cumDist = 0;

    for (let i = 0; i < coords.length; i++) {
      if (i > 0) {
        const [lng1, lat1] = coords[i - 1];
        const [lng2, lat2] = coords[i];
        cumDist += distanceKm(lat1, lng1, lat2, lng2);
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

  // Interpolate elevation at a given distance along the profile
  function getElevationAtDistance(distKm: number): number {
    if (!profile || profile.length < 2) return 0;
    for (let i = 1; i < profile.length; i++) {
      if (profile[i].distKm >= distKm) {
        const span = profile[i].distKm - profile[i - 1].distKm;
        if (span === 0) return profile[i].eleM;
        const t = (distKm - profile[i - 1].distKm) / span;
        return profile[i - 1].eleM + t * (profile[i].eleM - profile[i - 1].eleM);
      }
    }
    return profile[profile.length - 1].eleM;
  }

  // Truncate long pass names
  function truncateName(name: string, maxLen = 20): string {
    return name.length > maxLen ? name.slice(0, maxLen - 1) + '\u2026' : name;
  }

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
              stroke="var(--grid-line)"
              strokeWidth="1"
            />
            <text
              x={w - 4}
              y={toY(ele) - 3}
              fill="var(--grid-text)"
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
        {/* Mountain pass labels */}
        {mountainPasses.map((pass) => {
          if (!pass.distanceFromStartKm || pass.distanceFromStartKm > totalDist) return null;
          const x = toX(pass.distanceFromStartKm);
          const eleAtPass = getElevationAtDistance(pass.distanceFromStartKm);
          const y = toY(eleAtPass);
          return (
            <g key={pass.id}>
              <line
                x1={x} y1={y} x2={x} y2={pad.top + chartH}
                stroke="var(--text-dim, rgba(255,255,255,0.4))"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.5"
              />
              <circle cx={x} cy={y} r="3" fill="#f59e0b" stroke="var(--surface, #1e293b)" strokeWidth="1" />
              <text
                x={x} y={Math.max(y - 8, 8)}
                fill="var(--text-dim, rgba(255,255,255,0.5))"
                fontSize="8"
                textAnchor="middle"
                fontWeight="600"
              >
                {truncateName(pass.name)}
              </text>
              <text
                x={x} y={Math.max(y - 18, 0)}
                fill="var(--text-muted, rgba(255,255,255,0.35))"
                fontSize="7"
                textAnchor="middle"
              >
                {pass.elevation.toFixed(0)}m
              </text>
            </g>
          );
        })}
      </svg>
      <div className="elevation-axis">
        <span>0 km</span>
        <span>{(totalDist / 2).toFixed(0)} km</span>
        <span>{totalDist.toFixed(0)} km</span>
      </div>
      {surfaceSummary && surfaceSummary.segments.length > 0 && totalDist > 0 && (
        <>
          <div className="surface-bar" role="img" aria-label="Surface quality bar">
            {surfaceSummary.segments.map((seg, i) => {
              const widthPct = ((seg.endKm - seg.startKm) / totalDist) * 100;
              if (widthPct < 0.1) return null;
              return (
                <div
                  key={i}
                  className="surface-bar-segment"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: SURFACE_COLORS[seg.surface],
                  }}
                  title={`${SURFACE_LABELS[seg.surface]}: ${seg.startKm.toFixed(1)} - ${seg.endKm.toFixed(1)} km`}
                />
              );
            })}
          </div>
          <div className="surface-legend">
            {(Object.keys(SURFACE_COLORS) as SurfaceType[])
              .filter((s) => surfaceSummary.breakdown[s] > 0)
              .map((s) => (
                <span key={s} className="surface-legend-item">
                  <span
                    className="surface-legend-dot"
                    style={{ backgroundColor: SURFACE_COLORS[s] }}
                  />
                  {SURFACE_LABELS[s]} {surfaceSummary.breakdown[s]}%
                </span>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
