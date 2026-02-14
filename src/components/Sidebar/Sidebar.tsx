import { RoutePanel } from './RoutePanel';
import { SupplyPanel } from './SupplyPanel';
import { SettingsPanel } from './SettingsPanel';
import { GPXImport } from './GPXImport';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <h2>Bikepacking Planner</h2>
      <RoutePanel />
      <GPXImport />
      <SettingsPanel />
      <SupplyPanel />
    </aside>
  );
}
