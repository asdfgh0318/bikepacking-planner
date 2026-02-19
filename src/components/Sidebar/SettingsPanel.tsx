import { useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { useSupplyStore } from '../../store/supplyStore';
import { useResupplyStore } from '../../store/resupplyStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Toggle, RangeSlider } from '../ui';
import { debugLog } from '../../utils/debugLogger';
import type { Season } from '../../types';

const SEASON_OPTIONS: { id: Season; label: string; icon: string }[] = [
  { id: 'spring', label: 'Spring', icon: '🌱' },
  { id: 'summer', label: 'Summer', icon: '☀️' },
  { id: 'autumn', label: 'Autumn', icon: '🍂' },
  { id: 'winter', label: 'Winter', icon: '❄️' },
];

/** Live-subscribe to debugLog changes */
function useDebugLog() {
  const count = useSyncExternalStore(
    (cb) => debugLog.subscribe(cb),
    () => debugLog.count(),
  );
  return count;
}

export function SettingsPanel() {
  useDebugLog(); // subscribe to trigger re-renders
  const [showRecent, setShowRecent] = useState(false);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  const tripContext = useResupplyStore((s) => s.tripContext);
  const setSeason = useResupplyStore((s) => s.setSeason);
  const setTripContext = useResupplyStore((s) => s.setTripContext);
  const showWeatherMarkers = useResupplyStore((s) => s.showWeatherMarkers);
  const setShowWeatherMarkers = useResupplyStore((s) => s.setShowWeatherMarkers);

  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const setCorridorWidthKm = useSupplyStore((s) => s.setCorridorWidthKm);
  const showPaczkomaty = useSupplyStore((s) => s.showPaczkomaty);
  const setShowPaczkomaty = useSupplyStore((s) => s.setShowPaczkomaty);
  const showShops = useSupplyStore((s) => s.showShops);
  const setShowShops = useSupplyStore((s) => s.setShowShops);
  const showWater = useSupplyStore((s) => s.showWater);
  const setShowWater = useSupplyStore((s) => s.setShowWater);
  const showCampsites = useSupplyStore((s) => s.showCampsites);
  const setShowCampsites = useSupplyStore((s) => s.setShowCampsites);
  const showRepair = useSupplyStore((s) => s.showRepair);
  const setShowRepair = useSupplyStore((s) => s.setShowRepair);
  const showBailOut = useSupplyStore((s) => s.showBailOut);
  const setShowBailOut = useSupplyStore((s) => s.setShowBailOut);
  const showFuel = useSupplyStore((s) => s.showFuel);
  const setShowFuel = useSupplyStore((s) => s.setShowFuel);
  const showFood = useSupplyStore((s) => s.showFood);
  const setShowFood = useSupplyStore((s) => s.setShowFood);
  const showPharmacy = useSupplyStore((s) => s.showPharmacy);
  const setShowPharmacy = useSupplyStore((s) => s.setShowPharmacy);
  const showToilets = useSupplyStore((s) => s.showToilets);
  const setShowToilets = useSupplyStore((s) => s.setShowToilets);
  const showHalts = useSupplyStore((s) => s.showHalts);
  const setShowHalts = useSupplyStore((s) => s.setShowHalts);

  const entries = debugLog.getEntries();
  const summary = debugLog.summary();
  const cats = Object.keys(summary);
  const recent = debugLog.getLast(20);

  return (
    <div className="panel">
      <div className="section-label">Appearance</div>
      <div className="setting-card">
        <Toggle checked={theme === 'light'} onChange={toggleTheme} label="Light Mode" color="#60a5fa" />
      </div>

      <div className="section-label">Search Corridor</div>
      <RangeSlider
        label="Corridor width"
        value={corridorWidthKm}
        onChange={setCorridorWidthKm}
        min={1}
        max={10}
        step={0.5}
        unit="km"
      />

      <div className="section-label">Trip Season</div>
      <div className="season-grid">
        {SEASON_OPTIONS.map(({ id, label, icon }) => (
          <button
            key={id}
            className={`season-card ${tripContext.season === id ? 'active' : ''}`}
            onClick={() => setSeason(id)}
          >
            <span className="season-icon">{icon}</span>
            <span className="season-name">{label}</span>
          </button>
        ))}
      </div>
      <div className="season-details">
        <RangeSlider
          label="Daylight hours"
          value={tripContext.daylightHours}
          onChange={(v) => setTripContext('daylightHours', v)}
          min={5}
          max={18}
          step={0.5}
          unit="h"
        />
        <RangeSlider
          label="Water multiplier"
          value={tripContext.waterMultiplier}
          onChange={(v) => setTripContext('waterMultiplier', v)}
          min={0.5}
          max={2.0}
          step={0.1}
          unit="x"
        />
        <RangeSlider
          label="Extra gear weight"
          value={tripContext.extraGearWeightG}
          onChange={(v) => setTripContext('extraGearWeightG', v)}
          min={0}
          max={5000}
          step={250}
          unit="g"
        />
      </div>

      <div className="section-label">Map Layers</div>
      <div className="setting-card">
        <Toggle checked={showPaczkomaty} onChange={setShowPaczkomaty} label="InPost Paczkomaty" color="#fbbf24" />
        <Toggle checked={showShops} onChange={setShowShops} label="Shops (Żabka, Biedronka)" color="#4ade80" />
        <Toggle checked={showWater} onChange={setShowWater} label="Water Sources" color="#38bdf8" />
        <Toggle checked={showCampsites} onChange={setShowCampsites} label="Campsites & Shelters" color="#c084fc" />
        <Toggle checked={showRepair} onChange={setShowRepair} label="Bike Repair Shops" color="#facc15" />
        <Toggle checked={showBailOut} onChange={setShowBailOut} label="Bail-out Points (trains, buses, hospitals)" color="#f87171" />
        <Toggle checked={showFuel} onChange={setShowFuel} label="Fuel Stations" color="#fb923c" />
        <Toggle checked={showFood} onChange={setShowFood} label="Bakeries, Cafes, Restaurants" color="#a78bfa" />
        <Toggle checked={showPharmacy} onChange={setShowPharmacy} label="Pharmacies" color="#2dd4bf" />
        <Toggle checked={showToilets} onChange={setShowToilets} label="Public Toilets" color="#94a3b8" />
        <Toggle checked={showHalts} onChange={setShowHalts} label="Train Halts" color="#fca5a5" />
        <Toggle checked={showWeatherMarkers} onChange={setShowWeatherMarkers} label="Weather on Map" color="#60a5fa" />
      </div>

      <div className="section-label">Setup</div>
      <button
        className="btn btn-sm"
        style={{ marginBottom: 12 }}
        onClick={() => {
          localStorage.removeItem('bikepacking-wizard-complete');
          window.location.reload();
        }}
      >
        Restart Setup Wizard
      </button>

      <div className="section-label">Cache</div>
      <div className="setting-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>POI cache (SQLite)</span>
          <button className="btn btn-sm" onClick={async () => {
            const { clearCache } = await import('../../services/poiCache');
            await clearCache();
            toast.success('POI cache cleared');
          }}>
            Clear Cache
          </button>
        </div>
      </div>

      <div className="section-label">Debug Log <span className="debug-live-dot" /></div>
      <div className="debug-panel">
        <div className="debug-stats">
          <div className="debug-count">{entries.length} events (live)</div>
          {cats.map((cat) => (
            <div key={cat} className="debug-cat-row">
              <span className="debug-cat-name">{cat}</span>
              {summary[cat].error > 0 && <span className="debug-badge error">{summary[cat].error} err</span>}
              {summary[cat].warn > 0 && <span className="debug-badge warn">{summary[cat].warn} warn</span>}
              <span className="debug-badge info">{summary[cat].info + summary[cat].debug} info</span>
            </div>
          ))}
        </div>

        <div className="debug-actions">
          <button className="btn btn-sm" onClick={() => setShowRecent(!showRecent)}>
            {showRecent ? 'Hide' : 'Recent'}
          </button>
          <button className="btn btn-sm" onClick={() => debugLog.download()}>
            Download CSV
          </button>
          <button className="btn btn-sm" onClick={() => debugLog.clear()}>
            Clear
          </button>
        </div>

        {showRecent && (
          <div className="debug-recent">
            {recent.map((e, i) => (
              <div key={i} className={`debug-entry debug-entry-${e.level}`}>
                <span className="debug-time">{e.timestamp.slice(11, 19)}</span>
                <span className="debug-lvl">{e.level[0].toUpperCase()}</span>
                <span className="debug-evt">[{e.category}] {e.event}</span>
                {e.details && <div className="debug-det">{e.details.slice(0, 200)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
