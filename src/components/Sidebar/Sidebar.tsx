import { useState } from 'react';
import { Bike, ChevronLeft, ChevronRight, TrendingUp, Package, Coffee, Backpack, Settings } from 'lucide-react';
import { RoutePanel } from './RoutePanel';
import { SupplyPanel } from './SupplyPanel';
import { DietPanel } from './DietPanel';
import { GearPanel } from './GearPanel';
import { SettingsPanel } from './SettingsPanel';
import { GPXImport } from './GPXImport';
import { SavedRoutes } from './SavedRoutes';

type Tab = 'route' | 'supply' | 'diet' | 'gear' | 'settings';

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('route');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <Bike size={22} strokeWidth={2} />
          <span>Bikepacking Planner</span>
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {!collapsed && (
        <>
          <nav className="tab-nav">
            <button className={`tab ${activeTab === 'route' ? 'active' : ''}`} onClick={() => setActiveTab('route')}>
              <TrendingUp size={16} />
              Route
            </button>
            <button className={`tab ${activeTab === 'supply' ? 'active' : ''}`} onClick={() => setActiveTab('supply')}>
              <Package size={16} />
              Supply
            </button>
            <button className={`tab ${activeTab === 'diet' ? 'active' : ''}`} onClick={() => setActiveTab('diet')}>
              <Coffee size={16} />
              Diet
            </button>
            <button className={`tab ${activeTab === 'gear' ? 'active' : ''}`} onClick={() => setActiveTab('gear')}>
              <Backpack size={16} />
              Gear
            </button>
            <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={16} />
              Settings
            </button>
          </nav>

          <div className="tab-content">
            {activeTab === 'route' && (
              <>
                <RoutePanel />
                <GPXImport />
                <SavedRoutes />
              </>
            )}
            {activeTab === 'supply' && <SupplyPanel />}
            {activeTab === 'diet' && <DietPanel />}
            {activeTab === 'gear' && <GearPanel />}
            {activeTab === 'settings' && <SettingsPanel />}
          </div>
        </>
      )}
    </aside>
  );
}
