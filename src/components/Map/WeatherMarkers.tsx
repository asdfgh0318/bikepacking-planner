import { Marker } from 'react-map-gl/maplibre';
import { lineString, along } from '@turf/turf';
import { useRouteStore } from '../../store/routeStore';
import { useSupplyStore } from '../../store/supplyStore';
import { useTripStore } from '../../store/tripStore';
import { weatherEmoji } from '../../services/weather';

/** One forecast chip at the midpoint of each riding day. */
export function WeatherMarkers() {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const daySegments = useRouteStore((s) => s.daySegments);
  const routeWeather = useTripStore((s) => s.routeWeather);
  const show = useSupplyStore((s) => s.layers.weather);

  if (!routeGeometry || !routeWeather || !show || daySegments.length === 0) return null;

  const line = lineString(routeGeometry.coordinates);

  return (
    <>
      {daySegments.map((seg) => {
        const day = routeWeather.days.find((d) => d.dayNumber === seg.dayNumber);
        if (!day || day.weatherCode === -1) return null;
        const [lng, lat] = along(line, (seg.startKm + seg.endKm) / 2, { units: 'kilometers' }).geometry.coordinates;
        return (
          <Marker key={seg.dayNumber} latitude={lat} longitude={lng} anchor="center">
            <div
              className="map-chip"
              title={`Day ${seg.dayNumber}: ${day.condition.replace(/_/g, ' ')}, ${day.tempMin.toFixed(0)}–${day.tempMax.toFixed(0)}°C, ${day.precipitationSum.toFixed(0)} mm, wind ${day.windSpeedMax.toFixed(0)} km/h`}
            >
              <span className="map-chip-emoji">{weatherEmoji(day.condition)}</span>
              <span>{day.tempMin.toFixed(0)}–{day.tempMax.toFixed(0)}°</span>
            </div>
          </Marker>
        );
      })}
    </>
  );
}
