import { lazy, Suspense, useState } from 'react';
import { Bike, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, TrendingUp, Package, Coffee, Backpack, ShoppingCart, CloudSun, Settings } from 'lucide-react';
import { RoutePanel } from './RoutePanel';
import { GPXImport } from './GPXImport';
import { SavedRoutes } from './SavedRoutes';

// Only the Route tab is needed on first paint; the rest load on demand.
const SupplyPanel = lazy(() => import('./SupplyPanel').then((m) => ({ default: m.SupplyPanel })));
const DietPanel = lazy(() => import('./DietPanel').then((m) => ({ default: m.DietPanel })));
const GearPanel = lazy(() => import('./GearPanel').then((m) => ({ default: m.GearPanel })));
const ResupplyPanel = lazy(() => import('./ResupplyPanel').then((m) => ({ default: m.ResupplyPanel })));
const WeatherPanel = lazy(() => import('./WeatherPanel').then((m) => ({ default: m.WeatherPanel })));
const SettingsPanel = lazy(() => import('./SettingsPanel').then((m) => ({ default: m.SettingsPanel })));

type Tab = 'route' | 'supply' | 'diet' | 'gear' | 'shopping' | 'weather' | 'settings';

const VALID_TABS: ReadonlySet<string> = new Set<Tab>(['route', 'supply', 'diet', 'gear', 'shopping', 'weather', 'settings']);
const STORAGE_KEY = 'bikepacking-sidebar-tab';

function readStoredTab(): Tab {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && VALID_TABS.has(stored) ? (stored as Tab) : 'route';
}

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>(readStoredTab);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  };
  const [collapsed, setCollapsed] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(true);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${!mobileExpanded ? 'mobile-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <Bike size={22} strokeWidth={2} />
          <span>Bikepacking Planner</span>
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button className="mobile-toggle" onClick={() => setMobileExpanded(!mobileExpanded)} aria-label={mobileExpanded ? 'Collapse panel' : 'Expand panel'}>
          {mobileExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {!collapsed && (
        <>
          <nav className="tab-nav" role="tablist" aria-label="Sidebar navigation">
            <button className={`tab ${activeTab === 'route' ? 'active' : ''}`} onClick={() => handleTabChange('route')} role="tab" aria-selected={activeTab === 'route'} aria-label="Route planning and stats">
              <TrendingUp size={16} />
              Route
            </button>
            <button className={`tab ${activeTab === 'supply' ? 'active' : ''}`} onClick={() => handleTabChange('supply')} role="tab" aria-selected={activeTab === 'supply'} aria-label="Supply points and gaps">
              <Package size={16} />
              Supply
            </button>
            <button className={`tab ${activeTab === 'diet' ? 'active' : ''}`} onClick={() => handleTabChange('diet')} role="tab" aria-selected={activeTab === 'diet'} aria-label="Diet and nutrition planning">
              <Coffee size={16} />
              Diet
            </button>
            <button className={`tab ${activeTab === 'gear' ? 'active' : ''}`} onClick={() => handleTabChange('gear')} role="tab" aria-selected={activeTab === 'gear'} aria-label="Gear checklist and weight">
              <Backpack size={16} />
              Gear
            </button>
            <button className={`tab ${activeTab === 'shopping' ? 'active' : ''}`} onClick={() => handleTabChange('shopping')} role="tab" aria-selected={activeTab === 'shopping'} aria-label="Shopping and resupply plan">
              <ShoppingCart size={16} />
              Shop
            </button>
            <button className={`tab ${activeTab === 'weather' ? 'active' : ''}`} onClick={() => handleTabChange('weather')} role="tab" aria-selected={activeTab === 'weather'} aria-label="Weather forecast">
              <CloudSun size={16} />
              Weather
            </button>
            <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => handleTabChange('settings')} role="tab" aria-selected={activeTab === 'settings'} aria-label="Settings and preferences">
              <Settings size={16} />
              Settings
            </button>
          </nav>

          {mobileExpanded && (
            <div className="tab-content" role="tabpanel" aria-label={`${activeTab} panel`}>
              {activeTab === 'route' && (
                <>
                  <RoutePanel />
                  <GPXImport />
                  <SavedRoutes />
                </>
              )}
              <Suspense fallback={<div className="panel" />}>
                {activeTab === 'supply' && <SupplyPanel />}
                {activeTab === 'diet' && <DietPanel />}
                {activeTab === 'gear' && <GearPanel />}
                {activeTab === 'shopping' && <ResupplyPanel />}
                {activeTab === 'weather' && <WeatherPanel />}
                {activeTab === 'settings' && <SettingsPanel />}
              </Suspense>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
