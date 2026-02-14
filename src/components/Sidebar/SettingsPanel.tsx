import { useSupplyStore } from '../../store/supplyStore';
import { Toggle, RangeSlider } from '../ui';

export function SettingsPanel() {
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

  return (
    <div className="panel">
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

      <div className="section-label">Map Layers</div>
      <div className="setting-card">
        <Toggle checked={showPaczkomaty} onChange={setShowPaczkomaty} label="InPost Paczkomaty" color="#fbbf24" />
        <Toggle checked={showShops} onChange={setShowShops} label="Shops (Żabka, Biedronka)" color="#4ade80" />
        <Toggle checked={showWater} onChange={setShowWater} label="Water Sources" color="#38bdf8" />
        <Toggle checked={showCampsites} onChange={setShowCampsites} label="Campsites & Shelters" color="#c084fc" />
        <Toggle checked={showRepair} onChange={setShowRepair} label="Bike Repair Shops" color="#facc15" />
      </div>
    </div>
  );
}
