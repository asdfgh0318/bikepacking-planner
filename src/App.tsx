import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { MapView } from './components/Map/MapView';
import { ElevationProfile } from './components/ElevationProfile';
import { RouteSection } from './components/sections/RouteSection';
import { DaysSection } from './components/sections/DaysSection';
import { SupplySection } from './components/sections/SupplySection';
import { PlanSection } from './components/sections/PlanSection';
import { WeatherSection } from './components/sections/WeatherSection';
import { SettingsSection } from './components/sections/SettingsSection';
import { useRouteStore } from './store/routeStore';
import { useSettingsStore } from './store/settingsStore';
import { decodeRouteFromHash } from './services/routeStorage';
import { useRouteCalculation } from './hooks/useRouteCalculation';
import { useDaySplitting } from './hooks/useDaySplitting';
import { useSupplyPointFetching } from './hooks/useSupplyPointFetching';
import { useBailOutFetching } from './hooks/useBailOutFetching';
import { useWeatherFetching } from './hooks/useWeatherFetching';
import { useGapAnalysis } from './hooks/useGapAnalysis';
import { useAutoPlan } from './hooks/useAutoPlan';

export default function App() {
  const setWaypoints = useRouteStore((s) => s.setWaypoints);
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // A shared link carries the waypoints in the hash.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#route=')) return;
    const decoded = decodeRouteFromHash(hash.slice(7));
    if (decoded && decoded.waypoints.length >= 2) {
      setWaypoints(decoded.waypoints);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [setWaypoints]);

  // The pipeline: route → days → supply points → gaps, weather, plan.
  useRouteCalculation();
  useDaySplitting();
  useSupplyPointFetching();
  useBailOutFetching();
  useWeatherFetching();
  useGapAnalysis();
  useAutoPlan();

  return (
    <>
      {/* Outside the grid: Sonner renders a plain <section> that would take a cell. */}
      <Toaster theme={theme} position="top-center" toastOptions={{ className: 'toast' }} />
      <div className="app">
      <aside className="panel">
        <header className="panel-head">
          <h1>Bikepacking Planner</h1>
          <span className="note">Poland · shops, water, Sundays, weather</span>
        </header>
        <RouteSection />
        <DaysSection />
        <SupplySection />
        <PlanSection />
        <WeatherSection />
        <SettingsSection />
      </aside>
      <main className="map-area">
        <div className="map"><MapView /></div>
        <ElevationProfile />
      </main>
      </div>
    </>
  );
}
