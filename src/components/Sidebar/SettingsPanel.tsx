import { toast } from 'sonner';
import { useSupplyStore } from '../../store/supplyStore';
import { useResupplyStore } from '../../store/resupplyStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Toggle, RangeSlider } from '../ui';
import type { Season } from '../../types';

const SEASON_OPTIONS: { id: Season; label: string; icon: string }[] = [
  { id: 'spring', label: 'Spring', icon: '🌱' },
  { id: 'summer', label: 'Summer', icon: '☀️' },
  { id: 'autumn', label: 'Autumn', icon: '🍂' },
  { id: 'winter', label: 'Winter', icon: '❄️' },
];

export function SettingsPanel() {
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
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cached shops, water and stations</span>
          <button className="btn btn-sm" onClick={async () => {
            const { clearCache } = await import('../../services/poiCache');
            await clearCache();
            toast.success('POI cache cleared');
          }}>
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
}
