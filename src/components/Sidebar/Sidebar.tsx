import { useState } from 'react';
import { RoutePanel } from './RoutePanel';
import { SupplyPanel } from './SupplyPanel';
import { DietPanel } from './DietPanel';
import { SettingsPanel } from './SettingsPanel';
import { GPXImport } from './GPXImport';

type Tab = 'route' | 'supply' | 'diet' | 'settings';

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('route');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/>
            <path d="M12 2l-3.5 7h7L12 2z"/>
            <path d="M5 18l3.5-7"/><path d="M15.5 9L19 18"/>
          </svg>
          <span>Bikepacking Planner</span>
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed
              ? <path d="M9 18l6-6-6-6"/>
              : <path d="M15 18l-6-6 6-6"/>
            }
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          <nav className="tab-nav">
            <button className={`tab ${activeTab === 'route' ? 'active' : ''}`} onClick={() => setActiveTab('route')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8"/></svg>
              Route
            </button>
            <button className={`tab ${activeTab === 'supply' ? 'active' : ''}`} onClick={() => setActiveTab('supply')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              Supply
            </button>
            <button className={`tab ${activeTab === 'diet' ? 'active' : ''}`} onClick={() => setActiveTab('diet')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
              Diet
            </button>
            <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              Settings
            </button>
          </nav>

          <div className="tab-content">
            {activeTab === 'route' && (
              <>
                <RoutePanel />
                <GPXImport />
              </>
            )}
            {activeTab === 'supply' && <SupplyPanel />}
            {activeTab === 'diet' && <DietPanel />}
            {activeTab === 'settings' && <SettingsPanel />}
          </div>
        </>
      )}
    </aside>
  );
}
