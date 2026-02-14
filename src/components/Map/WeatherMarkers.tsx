import { Marker } from 'react-map-gl/maplibre';
import * as turf from '@turf/turf';
import { useRouteStore } from '../../store/routeStore';
import { useResupplyStore } from '../../store/resupplyStore';
import { weatherEmoji } from '../../services/weather';

export function WeatherMarkers() {
  const routeGeometry = useRouteStore((s) => s.routeGeometry);
  const daySegments = useRouteStore((s) => s.daySegments);
  const routeWeather = useResupplyStore((s) => s.routeWeather);
  const showWeatherMarkers = useResupplyStore((s) => s.showWeatherMarkers);

  if (!routeGeometry || !routeWeather || !showWeatherMarkers || daySegments.length === 0) {
    return null;
  }

  const line = turf.lineString(routeGeometry.coordinates);

  return (
    <>
      {daySegments.map((seg) => {
        const dayWeather = routeWeather.days.find((d) => d.dayNumber === seg.dayNumber);
        if (!dayWeather || dayWeather.weatherCode === -1) return null;

        const midKm = (seg.startKm + seg.endKm) / 2;
        const midPoint = turf.along(line, midKm, { units: 'kilometers' });
        const [lng, lat] = midPoint.geometry.coordinates;

        return (
          <Marker
            key={`weather-${seg.dayNumber}`}
            latitude={lat}
            longitude={lng}
            anchor="center"
          >
            <div
              className="weather-map-marker"
              title={`Day ${seg.dayNumber}: ${dayWeather.condition.replace(/_/g, ' ')}, ${dayWeather.tempMin.toFixed(0)}–${dayWeather.tempMax.toFixed(0)}°C, ${dayWeather.precipitationSum.toFixed(0)}mm rain, wind ${dayWeather.windSpeedMax.toFixed(0)}km/h`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(15,23,42,0.85)',
                border: '1.5px solid rgba(96,165,250,0.4)',
                borderRadius: 8,
                padding: '3px 6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>
                {weatherEmoji(dayWeather.condition)}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', marginTop: 1 }}>
                {dayWeather.tempMin.toFixed(0)}–{dayWeather.tempMax.toFixed(0)}°
              </span>
            </div>
          </Marker>
        );
      })}
    </>
  );
}
