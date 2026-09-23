import { useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useTripStore } from '../store/tripStore';
import { fetchRouteWeather } from '../services/weather';
import { debugLog } from '../utils/debugLogger';

/** Fetch the day-aligned forecast whenever the route, day count or start date changes. */
export function useWeatherFetching(): void {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const daySegments = useRouteStore((s) => s.daySegments);
  const tripStartDate = useTripStore((s) => s.tripStartDate);
  const setRouteWeather = useTripStore((s) => s.setRouteWeather);
  const setIsLoadingWeather = useTripStore((s) => s.setIsLoadingWeather);

  useEffect(() => {
    if (!routeGeometry || daySegments.length === 0 || !tripStartDate) {
      setRouteWeather(null);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setIsLoadingWeather(true);

    fetchRouteWeather(routeGeometry, daySegments, tripStartDate, controller.signal)
      .then((weather) => { if (!cancelled) setRouteWeather(weather); })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        debugLog.error('weather', 'fetch failed', err instanceof Error ? err.message : String(err));
      })
      .finally(() => { if (!cancelled) setIsLoadingWeather(false); });

    return () => { cancelled = true; controller.abort(); };
  }, [routeGeometry, daySegments, tripStartDate, setRouteWeather, setIsLoadingWeather]);
}
