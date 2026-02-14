import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { UnifiedShoppingPlan } from '../../types';

const STOP_COLORS: Record<string, string> = {
  paczkomat: '#fbbf24',
  zabka: '#4ade80',
  biedronka: '#f87171',
  shop: '#60a5fa',
};

export function OnRouteShoppingLists({ plan }: { plan: UnifiedShoppingPlan }) {
  const [filterDay, setFilterDay] = useState<number | null>(null);

  const shopPurchases = plan.resupply.purchases.filter((p) => p.source === 'shop');
  const filtered = filterDay
    ? shopPurchases.filter((p) => p.dayNumber === filterDay)
    : shopPurchases;

  const days = [...new Set(shopPurchases.map((p) => p.dayNumber))].sort((a, b) => a - b);

  if (shopPurchases.length === 0) {
    return <div className="onroute-empty">No on-route shop stops in plan</div>;
  }

  return (
    <div className="onroute-lists">
      {/* Day filter */}
      <div className="onroute-filter">
        <button
          className={`onroute-filter-btn ${filterDay === null ? 'active' : ''}`}
          onClick={() => setFilterDay(null)}
        >
          All
        </button>
        {days.map((d) => (
          <button
            key={d}
            className={`onroute-filter-btn ${filterDay === d ? 'active' : ''}`}
            onClick={() => setFilterDay(d)}
          >
            D{d}
          </button>
        ))}
      </div>

      {filtered.map((stop, i) => {
        const arrivalTime = `${Math.floor(stop.estimatedArrivalHour)}:${String(Math.round((stop.estimatedArrivalHour % 1) * 60)).padStart(2, '0')}`;

        return (
          <div key={`${stop.stopId}-${i}`} className="onroute-stop">
            <div className="onroute-stop-header">
              <span
                className="onroute-badge"
                style={{ background: STOP_COLORS[stop.stopType] || '#60a5fa' }}
              >
                {stop.stopType === 'zabka' ? 'Ż' : stop.stopType.charAt(0).toUpperCase()}
              </span>
              <div className="onroute-stop-info">
                <span className="onroute-stop-name">{stop.stopName}</span>
                <span className="onroute-stop-meta">
                  Day {stop.dayNumber} · km {stop.distanceKm.toFixed(0)} · est. {arrivalTime}
                  {stop.isOpenOnArrival === true && <span className="onroute-open"> open</span>}
                  {stop.isOpenOnArrival === false && <span className="onroute-closed"> closed</span>}
                  {stop.isOpenOnArrival === null && <span className="onroute-unknown"> ?</span>}
                </span>
              </div>
            </div>

            {stop.isOpenOnArrival === false && (
              <div className="onroute-warning">
                <AlertTriangle size={12} />
                <span>Store may be closed at estimated arrival time</span>
              </div>
            )}

            <ul className="onroute-items">
              {stop.items.map((item, idx) => (
                <li key={idx} className="onroute-item">
                  <span>{item.name}</span>
                  <span className="onroute-item-cal">{item.calories} kcal</span>
                </li>
              ))}
            </ul>

            <div className="onroute-stop-total">
              {stop.totalCalories} kcal · {(stop.totalWeightG / 1000).toFixed(1)} kg
              {stop.items[0]?.estimatedPricePLN !== undefined && (
                <> · ~{stop.items.reduce((s, f) => s + (f.estimatedPricePLN || 0), 0)} PLN</>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
