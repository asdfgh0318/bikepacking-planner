import type { UnifiedShoppingPlan } from '../../types';

export function CarryWeightGraph({ plan }: { plan: UnifiedShoppingPlan }) {
  const curve = plan.resupply.carryWeightCurve;
  if (curve.length < 2) return null;

  const totalDist = curve[curve.length - 1].distanceKm;
  const maxWeight = Math.max(500, ...curve.map((p) => p.foodWeightG));

  // SVG dimensions
  const w = 1000;
  const h = 160;
  const pad = { top: 10, bottom: 24, left: 0, right: 0 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const toX = (d: number) => pad.left + (d / totalDist) * chartW;
  const toY = (wt: number) => pad.top + chartH - (wt / maxWeight) * chartH;

  // Build area + line paths
  const linePath = curve
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.distanceKm).toFixed(1)},${toY(p.foodWeightG).toFixed(1)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L${toX(totalDist).toFixed(1)},${(pad.top + chartH).toFixed(1)}` +
    ` L${pad.left},${(pad.top + chartH).toFixed(1)} Z`;

  // Weight zone thresholds
  const zones = [
    { weight: 1000, color: 'rgba(74, 222, 128, 0.08)', label: '1 kg' },
    { weight: 2000, color: 'rgba(251, 191, 36, 0.08)', label: '2 kg' },
    { weight: 3000, color: 'rgba(248, 113, 113, 0.08)', label: '3 kg' },
  ];

  // Day separators
  const dayBreaks: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    if (curve[i].dayNumber !== curve[i - 1].dayNumber) {
      dayBreaks.push(curve[i].distanceKm);
    }
  }

  return (
    <div className="weight-graph">
      <div className="weight-graph-header">
        <span className="weight-graph-title">Food Carry Weight</span>
        <span className="weight-graph-max">
          max {(plan.resupply.maxCarryWeightG / 1000).toFixed(1)} kg
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="weight-graph-svg">
        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Weight zone lines */}
        {zones
          .filter((z) => z.weight <= maxWeight)
          .map((z, i) => (
            <g key={i}>
              <line
                x1={pad.left}
                y1={toY(z.weight)}
                x2={w}
                y2={toY(z.weight)}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={w - 4}
                y={toY(z.weight) - 3}
                fill="rgba(255,255,255,0.25)"
                fontSize="10"
                textAnchor="end"
              >
                {z.label}
              </text>
            </g>
          ))}

        {/* Day separators */}
        {dayBreaks.map((km, i) => (
          <line
            key={i}
            x1={toX(km)}
            y1={pad.top}
            x2={toX(km)}
            y2={pad.top + chartH}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
            strokeDasharray="2,4"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#weightGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#fbbf24" strokeWidth="2" />

        {/* Purchase dots (weight spikes) */}
        {curve
          .filter((p, i) => i > 0 && p.foodWeightG > curve[i - 1].foodWeightG + 50)
          .map((p, i) => (
            <circle
              key={i}
              cx={toX(p.distanceKm)}
              cy={toY(p.foodWeightG)}
              r="3"
              fill="#fbbf24"
            />
          ))}
      </svg>
      <div className="weight-graph-axis">
        <span>0 km</span>
        <span>{(totalDist / 2).toFixed(0)} km</span>
        <span>{totalDist.toFixed(0)} km</span>
      </div>
    </div>
  );
}
