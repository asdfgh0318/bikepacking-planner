import { useRouteStore } from '../../store/routeStore';
import { useTripStore } from '../../store/tripStore';
import { weatherEmoji, getWeatherWarnings } from '../../services/weather';
import { formatShortDate } from '../../utils/date';
import { Section, Alert } from '../ui';

export function WeatherSection() {
  const daySegments = useRouteStore((s) => s.daySegments);
  const weather = useTripStore((s) => s.routeWeather);
  const loading = useTripStore((s) => s.isLoadingWeather);

  if (daySegments.length === 0) return null;

  const days = weather?.days.filter((d) => d.weatherCode !== -1) ?? [];
  const warnings = weather ? getWeatherWarnings(weather.days) : [];

  return (
    <Section title="Weather" meta={days.length > 0 ? `${Math.min(...days.map((d) => d.tempMin)).toFixed(0)}–${Math.max(...days.map((d) => d.tempMax)).toFixed(0)}°` : undefined}>
      {loading && days.length === 0 && <p className="note">Loading forecast…</p>}
      {!loading && weather && weather.forecastAvailable === false && (
        <p className="note">Forecasts cover 16 days ahead. Set a start date within that window.</p>
      )}
      {!loading && weather && weather.forecastAvailable && days.length === 0 && <p className="note">Forecast unavailable right now.</p>}

      {warnings.map((w, i) => <Alert key={i} severity={w.severity}>{w.message}</Alert>)}

      {days.length > 0 && (
        <ol className="list">
          {days.map((d) => (
            <li key={d.dayNumber} className="item">
              <span className="emoji">{weatherEmoji(d.condition)}</span>
              <span className="grow">
                <strong>Day {d.dayNumber}</strong> <span className="note">{formatShortDate(d.date)}</span>
                <small>{d.tempMin.toFixed(0)}–{d.tempMax.toFixed(0)}° · {d.precipitationSum.toFixed(0)} mm ({d.precipitationProbMax}%) · wind {d.windSpeedMax.toFixed(0)} km/h</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
