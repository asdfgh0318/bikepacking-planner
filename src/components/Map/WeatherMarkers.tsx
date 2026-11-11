import { useState } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
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
  const [open, setOpen] = useState<{ dayNumber: number; lat: number; lng: number } | null>(null);

  if (!routeGeometry || !routeWeather || !show || daySegments.length === 0) return null;

  const line = lineString(routeGeometry.coordinates);
  const openDay = open && routeWeather.days.find((d) => d.dayNumber === open.dayNumber && d.weatherCode !== -1);

  return (
    <>
      {daySegments.map((seg) => {
        const day = routeWeather.days.find((d) => d.dayNumber === seg.dayNumber);
        if (!day || day.weatherCode === -1) return null;
        const [lng, lat] = along(line, (seg.startKm + seg.endKm) / 2, { units: 'kilometers' }).geometry.coordinates;
        return (
          <Marker
            key={seg.dayNumber}
            latitude={lat}
            longitude={lng}
            anchor="center"
            // Without this the tap reaches the map and adds a waypoint.
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setOpen(open?.dayNumber === seg.dayNumber ? null : { dayNumber: seg.dayNumber, lat, lng });
            }}
          >
            <div className="map-chip">
              <span className="map-chip-emoji">{weatherEmoji(day.condition)}</span>
              <span>{day.tempMin.toFixed(0)}–{day.tempMax.toFixed(0)}°</span>
            </div>
          </Marker>
        );
      })}
      {open && openDay && (
        <Popup latitude={open.lat} longitude={open.lng} onClose={() => setOpen(null)} closeOnClick={false} offset={22} className="custom-popup">
          <div className="popup">
            <strong>Day {open.dayNumber}: {openDay.condition.replace(/_/g, ' ')}</strong>
            <div className="popup-line">{openDay.tempMin.toFixed(0)}–{openDay.tempMax.toFixed(0)}°C · {openDay.precipitationSum.toFixed(0)} mm · wind {openDay.windSpeedMax.toFixed(0)} km/h</div>
          </div>
        </Popup>
      )}
    </>
  );
}
