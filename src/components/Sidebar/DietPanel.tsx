import { useCallback } from 'react';
import { useDietStore } from '../../store/dietStore';
import { useRouteStore } from '../../store/routeStore';
import { useSupplyStore } from '../../store/supplyStore';
import { DIET_PROFILES, generateSupplyOrders, calculateDailyCalories } from '../../services/diet';
import type { DietType, SupplyOrder } from '../../types';

const DIET_OPTIONS: DietType[] = ['standard', 'high-energy', 'ultralight', 'keto', 'vegan'];

export function DietPanel() {
  const selectedDiet = useDietStore((s) => s.selectedDiet);
  const setSelectedDiet = useDietStore((s) => s.setSelectedDiet);
  const rideDays = useDietStore((s) => s.rideDays);
  const setRideDays = useDietStore((s) => s.setRideDays);
  const orders = useDietStore((s) => s.orders);
  const setOrders = useDietStore((s) => s.setOrders);

  const routeStats = useRouteStore((s) => s.routeStats);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);

  const profile = DIET_PROFILES[selectedDiet];

  const planSupplies = useCallback(() => {
    if (!routeStats) return;
    const result = generateSupplyOrders(profile, routeStats, supplyPoints, rideDays);
    setOrders(result);
  }, [profile, routeStats, supplyPoints, rideDays, setOrders]);

  const dailyCals = routeStats
    ? calculateDailyCalories(profile, routeStats.distanceKm / rideDays, routeStats.ascentM / rideDays)
    : 0;

  const handlePrintList = useCallback(() => {
    if (orders.length === 0) return;
    const html = generateShoppingListHTML(orders);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  }, [orders]);

  return (
    <div className="panel">
      {/* Diet selector */}
      <div className="section-label">Diet Plan</div>
      <div className="diet-grid">
        {DIET_OPTIONS.map((d) => {
          const p = DIET_PROFILES[d];
          return (
            <button
              key={d}
              className={`diet-option ${selectedDiet === d ? 'active' : ''}`}
              onClick={() => setSelectedDiet(d)}
            >
              <span className="diet-option-name">{p.label}</span>
              <span className="diet-option-desc">{p.description}</span>
            </button>
          );
        })}
      </div>

      {/* Macros */}
      <div className="macro-bar">
        <div className="macro-segment carbs" style={{ width: `${profile.macros.carbsPct}%` }}>
          C {profile.macros.carbsPct}%
        </div>
        <div className="macro-segment fat" style={{ width: `${profile.macros.fatPct}%` }}>
          F {profile.macros.fatPct}%
        </div>
        <div className="macro-segment protein" style={{ width: `${profile.macros.proteinPct}%` }}>
          P {profile.macros.proteinPct}%
        </div>
      </div>

      {/* Ride days */}
      <div className="section-label">Trip Duration</div>
      <div className="setting-card">
        <div className="setting-header">
          <span>Ride days</span>
          <span className="setting-value">{rideDays}</span>
        </div>
        <input
          type="range"
          min={1}
          max={14}
          step={1}
          value={rideDays}
          onChange={(e) => setRideDays(Number(e.target.value))}
          className="range-input"
        />
        <div className="range-labels">
          <span>1 day</span>
          <span>14 days</span>
        </div>
      </div>

      {/* Calorie estimate */}
      {routeStats && (
        <div className="calorie-estimate">
          <div className="cal-row">
            <span>Daily distance</span>
            <span>{(routeStats.distanceKm / rideDays).toFixed(0)} km/day</span>
          </div>
          <div className="cal-row">
            <span>Daily ascent</span>
            <span>{(routeStats.ascentM / rideDays).toFixed(0)} m/day</span>
          </div>
          <div className="cal-row cal-total">
            <span>Daily calories needed</span>
            <span>{dailyCals.toLocaleString()} kcal</span>
          </div>
        </div>
      )}

      {/* Plan button */}
      <button
        className="btn btn-primary"
        onClick={planSupplies}
        disabled={!routeStats || supplyPoints.length === 0}
      >
        {!routeStats
          ? 'Add a route first'
          : supplyPoints.length === 0
            ? 'No supply points found'
            : 'Generate Supply Plan'}
      </button>

      {/* Orders */}
      {orders.length > 0 && (
        <div className="orders-list">
          <div className="section-label" style={{ marginTop: 16 }}>
            Supply Orders ({orders.length})
          </div>
          {orders.map((order) => (
            <div key={order.stopId} className="order-card">
              <div className="order-header">
                <div>
                  <div className="order-day">Day {order.dayNumber}</div>
                  <div className="order-stop">{order.stopName}</div>
                  <div className="order-km">{order.distanceKm.toFixed(1)} km from start</div>
                </div>
                <div className="order-totals">
                  <div className="order-cal">{order.totalCalories.toLocaleString()} kcal</div>
                  <div className="order-weight">{(order.totalWeightG / 1000).toFixed(1)} kg</div>
                </div>
              </div>
              <ul className="order-items">
                {order.items.map((item, i) => (
                  <li key={i} className="order-item">
                    <span className={`item-cat cat-${item.category}`}>
                      {item.category === 'meal' ? 'M' : item.category === 'snack' ? 'S' : item.category === 'drink' ? 'D' : 'V'}
                    </span>
                    <span className="item-name">{item.name}</span>
                    <span className="item-cal">{item.calories}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <button className="btn btn-share" onClick={handlePrintList}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print Shopping List
          </button>
        </div>
      )}
    </div>
  );
}

function generateShoppingListHTML(orders: SupplyOrder[]): string {
  const totalCal = orders.reduce((s, o) => s + o.totalCalories, 0);
  const totalKg = orders.reduce((s, o) => s + o.totalWeightG, 0) / 1000;
  const stops = orders.map((order) => {
    const items = order.items.map((item) =>
      `<tr><td style="padding:4px 8px"><input type="checkbox"/> ${item.name}</td><td style="padding:4px 8px;text-align:right">${item.calories} kcal</td><td style="padding:4px 8px;text-align:right">${item.weightG}g</td></tr>`
    ).join('');
    return `
      <div style="margin-bottom:20px;page-break-inside:avoid">
        <h3 style="margin:0 0 4px">Day ${order.dayNumber} — ${order.stopName}</h3>
        <p style="margin:0 0 8px;color:#666;font-size:13px">${order.distanceKm.toFixed(1)} km from start · ${order.totalCalories.toLocaleString()} kcal · ${(order.totalWeightG / 1000).toFixed(1)} kg</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="border-bottom:2px solid #333"><th style="text-align:left;padding:4px 8px">Item</th><th style="text-align:right;padding:4px 8px">Calories</th><th style="text-align:right;padding:4px 8px">Weight</th></tr></thead>
          <tbody>${items}</tbody>
        </table>
      </div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><title>Bikepacking Shopping List</title>
    <style>body{font-family:-apple-system,sans-serif;max-width:700px;margin:20px auto;padding:0 20px}
    @media print{body{margin:0;padding:10px}}</style></head>
    <body><h1 style="margin-bottom:4px">Bikepacking Shopping List</h1>
    <p style="color:#666;margin-bottom:20px">${orders.length} stops · ${totalCal.toLocaleString()} kcal total · ${totalKg.toFixed(1)} kg</p>
    ${stops}</body></html>`;
}
