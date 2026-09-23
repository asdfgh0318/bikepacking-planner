import { toast } from 'sonner';
import { useSupplyStore, LAYER_LABELS, type LayerGroup } from '../../store/supplyStore';
import { useSettingsStore } from '../../store/settingsStore';
import { clearCache } from '../../services/poiCache';
import { Section, Toggle } from '../ui';

export function SettingsSection() {
  const layers = useSupplyStore((s) => s.layers);
  const toggleLayer = useSupplyStore((s) => s.toggleLayer);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  return (
    <Section title="Map & settings" open={false}>
      {(Object.keys(LAYER_LABELS) as LayerGroup[]).map((g) => (
        <Toggle key={g} label={LAYER_LABELS[g]} checked={layers[g]} onChange={() => toggleLayer(g)} />
      ))}
      <Toggle label="Light theme" checked={theme === 'light'} onChange={toggleTheme} />
      <div className="row">
        <button className="btn" onClick={() => clearCache().then(() => toast.success('Cached shops and water cleared'))}>Clear offline cache</button>
      </div>
      <p className="note">Data: OpenStreetMap via Overpass, BRouter, Open-Meteo, InPost, OpenFreeMap tiles. No account, no tracking.</p>
    </Section>
  );
}
