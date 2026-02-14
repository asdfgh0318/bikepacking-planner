import { useSupplyStore } from '../../store/supplyStore';

export function SettingsPanel() {
  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const setCorridorWidthKm = useSupplyStore((s) => s.setCorridorWidthKm);
  const showPaczkomaty = useSupplyStore((s) => s.showPaczkomaty);
  const setShowPaczkomaty = useSupplyStore((s) => s.setShowPaczkomaty);
  const showShops = useSupplyStore((s) => s.showShops);
  const setShowShops = useSupplyStore((s) => s.setShowShops);

  return (
    <div className="panel">
      <h3>Settings</h3>

      <label className="setting-row">
        <span>Corridor: {corridorWidthKm} km</span>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={corridorWidthKm}
          onChange={(e) => setCorridorWidthKm(Number(e.target.value))}
        />
      </label>

      <label className="setting-row checkbox">
        <input
          type="checkbox"
          checked={showPaczkomaty}
          onChange={(e) => setShowPaczkomaty(e.target.checked)}
        />
        <span>Paczkomaty</span>
      </label>

      <label className="setting-row checkbox">
        <input
          type="checkbox"
          checked={showShops}
          onChange={(e) => setShowShops(e.target.checked)}
        />
        <span>Shops (Żabka, Biedronka)</span>
      </label>
    </div>
  );
}
