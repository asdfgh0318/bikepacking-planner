import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { MapView } from './components/Map/MapView';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ElevationProfile } from './components/ElevationProfile';
import { Wizard } from './components/Wizard';
import { useRouteStore } from './store/routeStore';
import { decodeRouteFromHash } from './services/routeStorage';
import { useRouteCalculation } from './hooks/useRouteCalculation';
import { useSupplyPointFetching } from './hooks/useSupplyPointFetching';
import { useWeatherFetching } from './hooks/useWeatherFetching';
import { useGapAnalysis } from './hooks/useGapAnalysis';
import { useBailOutFetching } from './hooks/useBailOutFetching';

function App() {
  const setWaypoints = useRouteStore((s) => s.setWaypoints);

  // Load shared route from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#route=')) {
      const encoded = hash.slice(7);
      const decoded = decodeRouteFromHash(encoded);
      if (decoded && decoded.waypoints.length >= 2) {
        setWaypoints(decoded.waypoints);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [setWaypoints]);

  // Route calculation with debounce
  useRouteCalculation();

  // Fetch supply points (shops, water, campsites, paczkomaty, repair)
  useSupplyPointFetching();

  // Fetch bail-out points (train stations, hospitals)
  useBailOutFetching();

  // Fetch weather forecast
  useWeatherFetching();

  // Re-analyze water gaps when weather data arrives (heat-adjusted)
  useGapAnalysis();

  return (
    <div className="app">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--surface-2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: 'inherit',
          },
        }}
      />
      <Wizard />
      <Sidebar />
      <div className="main-area">
        <main className="map-container">
          <MapView />
        </main>
        <ElevationProfile />
      </div>
    </div>
  );
}

export default App;
