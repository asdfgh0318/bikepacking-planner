import { memo } from 'react';
import type { UnifiedShoppingPlan } from '../../types';

// SVG dimensions (constant)
const W = 1000;
const H = 160;
const PAD = { top: 10, bottom: 24, left: 44, right: 0 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

export const CarryWeightGraph = memo(function CarryWeightGraph({ plan }: { plan: UnifiedShoppingPlan }) {
  const curve = plan.resupply.carryWeightCurve;
  if (curve.length < 2) return null;

  // memo() on the component already skips recomputation unless `plan` changes
  const totalDist = curve[curve.length - 1].distanceKm;
  const rawMax = Math.max(...curve.map((p) => p.foodWeightG));
  const maxWeight = rawMax > 0 ? Math.ceil(rawMax / 500) * 500 : 3000;

  const toX = (d: number) => PAD.left + (d / totalDist) * CHART_W;
  const toY = (wt: number) => PAD.top + CHART_H - (wt / maxWeight) * CHART_H;

  const linePath = curve
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.distanceKm).toFixed(1)},${toY(p.foodWeightG).toFixed(1)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L${toX(totalDist).toFixed(1)},${(PAD.top + CHART_H).toFixed(1)}` +
    ` L${PAD.left},${(PAD.top + CHART_H).toFixed(1)} Z`;

  const zoneStep = maxWeight <= 1500 ? 500 : 1000;
  const zones: { weight: number; label: string }[] = [];
  for (let wt = zoneStep; wt < maxWeight; wt += zoneStep) {
    zones.push({
      weight: wt,
      label: wt >= 1000 ? `${(wt / 1000).toFixed(wt % 1000 === 0 ? 0 : 1)} kg` : `${wt}g`,
    });
  }

  const dayBreaks: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    if (curve[i].dayNumber !== curve[i - 1].dayNumber) {
      dayBreaks.push(curve[i].distanceKm);
    }
  }

  const purchaseDots = curve.filter(
    (p, i) => i > 0 && p.foodWeightG > curve[i - 1].foodWeightG + 50,
  );

  return (
    <div className="weight-graph">
      <div className="weight-graph-header">
        <span className="weight-graph-title">Food Carry Weight</span>
        <span className="weight-graph-max">
          max {(plan.resupply.maxCarryWeightG / 1000).toFixed(1)} kg
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="weight-graph-svg">
        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Y-axis scale labels: 0g at bottom, max at top */}
        <text
          x={PAD.left - 6}
          y={PAD.top + CHART_H}
          fill="rgba(255,255,255,0.4)"
          fontSize="11"
          textAnchor="end"
          dominantBaseline="auto"
        >
          0g
        </text>
        <text
          x={PAD.left - 6}
          y={PAD.top}
          fill="rgba(255,255,255,0.4)"
          fontSize="11"
          textAnchor="end"
          dominantBaseline="hanging"
        >
          {maxWeight >= 1000 ? `${(maxWeight / 1000).toFixed(maxWeight % 1000 === 0 ? 0 : 1)} kg` : `${maxWeight}g`}
        </text>

        {/* Weight zone lines */}
        {zones.map((z, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={toY(z.weight)}
                x2={W}
                y2={toY(z.weight)}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={W - 4}
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
            y1={PAD.top}
            x2={toX(km)}
            y2={PAD.top + CHART_H}
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
        {purchaseDots.map((p, i) => (
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
});
