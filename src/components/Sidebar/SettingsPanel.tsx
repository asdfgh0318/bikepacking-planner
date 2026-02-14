import { useSupplyStore } from '../../store/supplyStore';

export function SettingsPanel() {
  const corridorWidthKm = useSupplyStore((s) => s.corridorWidthKm);
  const setCorridorWidthKm = useSupplyStore((s) => s.setCorridorWidthKm);
  const showPaczkomaty = useSupplyStore((s) => s.showPaczkomaty);
  const setShowPaczkomaty = useSupplyStore((s) => s.setShowPaczkomaty);
  const showShops = useSupplyStore((s) => s.showShops);
  const setShowShops = useSupplyStore((s) => s.setShowShops);
  const showWater = useSupplyStore((s) => s.showWater);
  const setShowWater = useSupplyStore((s) => s.setShowWater);

  return (
    <div className="panel">
      <div className="section-label">Search Corridor</div>
      <div className="setting-card">
        <div className="setting-header">
          <span>Corridor width</span>
          <span className="setting-value">{corridorWidthKm} km</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={corridorWidthKm}
          onChange={(e) => setCorridorWidthKm(Number(e.target.value))}
          className="range-input"
        />
        <div className="range-labels">
          <span>1 km</span>
          <span>10 km</span>
        </div>
      </div>

      <div className="section-label">Map Layers</div>
      <div className="setting-card">
        <label className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-dot" style={{ background: '#fbbf24' }} />
            <span>InPost Paczkomaty</span>
          </div>
          <div className={`toggle ${showPaczkomaty ? 'on' : ''}`} onClick={() => setShowPaczkomaty(!showPaczkomaty)}>
            <div className="toggle-thumb" />
          </div>
        </label>

        <label className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-dot" style={{ background: '#4ade80' }} />
            <span>Shops (Żabka, Biedronka)</span>
          </div>
          <div className={`toggle ${showShops ? 'on' : ''}`} onClick={() => setShowShops(!showShops)}>
            <div className="toggle-thumb" />
          </div>
        </label>

        <label className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-dot" style={{ background: '#38bdf8' }} />
            <span>Water Sources</span>
          </div>
          <div className={`toggle ${showWater ? 'on' : ''}`} onClick={() => setShowWater(!showWater)}>
            <div className="toggle-thumb" />
          </div>
        </label>
      </div>
    </div>
  );
}
