import { useState } from 'react';
import { useGearStore } from '../../store/gearStore';
import { useDietStore } from '../../store/dietStore';
import type { GearItem } from '../../types';

const CATEGORY_CONFIG: Record<GearItem['category'], { label: string; color: string }> = {
  shelter: { label: 'Shelter', color: '#c084fc' },
  sleep: { label: 'Sleep', color: '#818cf8' },
  cooking: { label: 'Cooking', color: '#f97316' },
  clothing: { label: 'Clothing', color: '#38bdf8' },
  tools: { label: 'Tools', color: '#facc15' },
  electronics: { label: 'Electronics', color: '#4ade80' },
  other: { label: 'Other', color: '#94a3b8' },
};

export function GearPanel() {
  const items = useGearStore((s) => s.items);
  const bikeWeightKg = useGearStore((s) => s.bikeWeightKg);
  const toggleItem = useGearStore((s) => s.toggleItem);
  const addItem = useGearStore((s) => s.addItem);
  const removeItem = useGearStore((s) => s.removeItem);
  const setBikeWeightKg = useGearStore((s) => s.setBikeWeightKg);

  const orders = useDietStore((s) => s.orders);

  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newCategory, setNewCategory] = useState<GearItem['category']>('other');

  const packedItems = items.filter((i) => i.packed);
  const gearWeightKg = packedItems.reduce((sum, i) => sum + i.weightG, 0) / 1000;

  // Food weight from diet orders (average carry weight = first order)
  const foodWeightKg = orders.length > 0 ? orders[0].totalWeightG / 1000 : 0;

  const totalWeightKg = bikeWeightKg + gearWeightKg + foodWeightKg;

  // Group by category
  const grouped = packedItems.reduce<Record<string, { items: typeof packedItems; totalG: number }>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { items: [], totalG: 0 };
    acc[item.category].items.push(item);
    acc[item.category].totalG += item.weightG;
    return acc;
  }, {});

  const handleAddItem = () => {
    const name = newName.trim();
    const weight = parseInt(newWeight);
    if (!name || isNaN(weight) || weight <= 0) return;
    addItem(name, newCategory, weight);
    setNewName('');
    setNewWeight('');
  };

  return (
    <div className="panel">
      {/* Weight summary */}
      <div className="weight-summary">
        <div className="weight-total">
          <span className="weight-total-value">{totalWeightKg.toFixed(1)}</span>
          <span className="weight-total-unit">kg total</span>
        </div>
        <div className="weight-breakdown">
          <div className="weight-row">
            <span className="weight-dot" style={{ background: '#94a3b8' }} />
            <span>Bike</span>
            <span className="weight-val">{bikeWeightKg.toFixed(1)} kg</span>
          </div>
          <div className="weight-row">
            <span className="weight-dot" style={{ background: '#4ade80' }} />
            <span>Gear</span>
            <span className="weight-val">{gearWeightKg.toFixed(1)} kg</span>
          </div>
          <div className="weight-row">
            <span className="weight-dot" style={{ background: '#fbbf24' }} />
            <span>Food</span>
            <span className="weight-val">{foodWeightKg.toFixed(1)} kg</span>
          </div>
        </div>
        {totalWeightKg > 30 && (
          <div className="weight-warning">
            Heavy load! Consider reducing gear for long days.
          </div>
        )}
      </div>

      {/* Bike weight slider */}
      <div className="section-label">Bike Weight</div>
      <div className="setting-card">
        <div className="setting-header">
          <span>Bike weight</span>
          <span className="setting-value">{bikeWeightKg} kg</span>
        </div>
        <input
          type="range"
          min={6}
          max={25}
          step={0.5}
          value={bikeWeightKg}
          onChange={(e) => setBikeWeightKg(Number(e.target.value))}
          className="range-input"
        />
        <div className="range-labels">
          <span>6 kg (carbon)</span>
          <span>25 kg (steel)</span>
        </div>
      </div>

      {/* Weight bar chart by category */}
      <div className="section-label">Gear by Category</div>
      <div className="weight-bars">
        {Object.entries(grouped)
          .sort(([, a], [, b]) => b.totalG - a.totalG)
          .map(([cat, data]) => {
            const cfg = CATEGORY_CONFIG[cat as GearItem['category']] || CATEGORY_CONFIG.other;
            const pct = gearWeightKg > 0 ? (data.totalG / 1000 / gearWeightKg) * 100 : 0;
            return (
              <div key={cat} className="weight-bar-row">
                <div className="weight-bar-label">
                  <span className="weight-dot" style={{ background: cfg.color }} />
                  <span>{cfg.label}</span>
                  <span className="weight-bar-val">{(data.totalG / 1000).toFixed(1)} kg</span>
                </div>
                <div className="weight-bar-track">
                  <div className="weight-bar-fill" style={{ width: `${pct}%`, background: cfg.color }} />
                </div>
              </div>
            );
          })}
      </div>

      {/* Gear checklist */}
      <div className="section-label">Gear Checklist ({packedItems.length}/{items.length})</div>
      <ul className="gear-list">
        {items.map((item) => {
          const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
          return (
            <li key={item.id} className={`gear-item ${!item.packed ? 'unpacked' : ''}`}>
              <div
                className={`gear-check ${item.packed ? 'checked' : ''}`}
                onClick={() => toggleItem(item.id)}
                style={{ borderColor: item.packed ? cfg.color : undefined, background: item.packed ? cfg.color : undefined }}
              >
                {item.packed && (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="gear-name">{item.name}</span>
              <span className="gear-weight">{item.weightG}g</span>
              <button className="gear-remove" onClick={() => removeItem(item.id)}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Add new item */}
      <div className="gear-add">
        <input
          type="text"
          className="save-input"
          placeholder="Item name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <div className="gear-add-row">
          <input
            type="number"
            className="save-input gear-weight-input"
            placeholder="g"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <select
            className="gear-cat-select"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as GearItem['category'])}
          >
            {Object.entries(CATEGORY_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
          <button className="btn btn-save" onClick={handleAddItem}>Add</button>
        </div>
      </div>
    </div>
  );
}
