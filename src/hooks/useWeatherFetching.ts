import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useResupplyStore } from '../store/resupplyStore';
import { fetchRouteWeather } from '../services/weather';
import { debugLog } from '../utils/debugLogger';

/**
 * Fetches weather forecast when route geometry, day segments, and trip start date
 * are all available. Uses AbortController for cancellation on cleanup.
 */
export function useWeatherFetching(): void {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const daySegments = useRouteStore((s) => s.daySegments);

  const tripStartDate = useResupplyStore((s) => s.resupplyConfig.tripStartDate);
  const setRouteWeather = useResupplyStore((s) => s.setRouteWeather);
  const setIsLoadingWeather = useResupplyStore((s) => s.setIsLoadingWeather);

  useEffect(() => {
    if (!routeGeometry || daySegments.length === 0 || !tripStartDate) {
      setRouteWeather(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setIsLoadingWeather(true);

    async function loadWeather() {
      try {
        debugLog.info('weather', 'fetch:start', { tripStartDate, days: daySegments.length });
        const weather = await fetchRouteWeather(routeGeometry!, daySegments, tripStartDate, controller.signal);
        if (!cancelled) {
          setRouteWeather(weather);
          const available = weather.days.filter(d => d.weatherCode !== -1).length;
          debugLog.info('weather', 'fetch:success', {
            daysWithData: available,
            totalDays: weather.days.length,
            sampleCoord: weather.sampleCoord,
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        debugLog.error('weather', 'fetch:error', err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoadingWeather(false);
      }
    }

    loadWeather();
    return () => { cancelled = true; controller.abort(); };
  }, [routeGeometry, daySegments, tripStartDate, setRouteWeather, setIsLoadingWeather]);
}
