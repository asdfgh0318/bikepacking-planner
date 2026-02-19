import { CloudSun, CloudOff, CloudRain, Wind, Thermometer, AlertTriangle, Droplets } from 'lucide-react';
import { useRouteStore } from '../../store/routeStore';
import { useResupplyStore } from '../../store/resupplyStore';
import { weatherEmoji, getWeatherWarnings } from '../../services/weather';
import { StatCard, EmptyState } from '../ui';
import type { DayWeather, DaySegment } from '../../types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(tripStartDate: string, dayNumber: number): string {
  const d = new Date(tripStartDate + 'T12:00:00');
  d.setDate(d.getDate() + dayNumber - 1);
  return `${DAY_NAMES[d.getDay()]} ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function formatHours(h: number): string {
  return `${Math.floor(h)}h${Math.round((h % 1) * 60).toString().padStart(2, '0')}`;
}

function getTravelImpact(weather: DayWeather, _segment: DaySegment): { text: string; severity: 'good' | 'caution' | 'bad' } {
  if (weather.weatherCode === -1) return { text: 'No forecast data', severity: 'good' };

  const issues: string[] = [];
  let severity: 'good' | 'caution' | 'bad' = 'good';

  if (weather.precipitationSum > 10) {
    issues.push('heavy rain slows progress');
    severity = 'bad';
  } else if (weather.precipitationSum > 3) {
    issues.push('rain may slow progress');
    if (severity === 'good') severity = 'caution';
  }

  if (weather.windSpeedMax > 40) {
    issues.push(`strong wind ${weather.windSpeedMax.toFixed(0)} km/h`);
    severity = 'bad';
  } else if (weather.windSpeedMax > 25) {
    issues.push('moderate wind');
    if (severity === 'good') severity = 'caution';
  }

  if (weather.tempMax > 33) {
    issues.push('heat — start early, extra water');
    severity = 'bad';
  } else if (weather.tempMax > 28) {
    issues.push('warm — stay hydrated');
    if (severity === 'good') severity = 'caution';
  }

  if (weather.tempMin < 0) {
    issues.push('freezing — watch for ice');
    severity = 'bad';
  } else if (weather.tempMin < 5) {
    issues.push('cold morning — layer up');
    if (severity === 'good') severity = 'caution';
  }

  if (weather.condition === 'thunderstorm') {
    issues.push('thunderstorms — seek shelter');
    severity = 'bad';
  }

  if (weather.condition === 'fog') {
    issues.push('fog — reduced visibility');
    if (severity === 'good') severity = 'caution';
  }

  if (issues.length === 0) return { text: 'Good riding conditions', severity: 'good' };
  return { text: issues.join('; '), severity };
}

function tempBarGradient(tempMin: number, tempMax: number): string {
  if (tempMax > 30) return 'linear-gradient(90deg, var(--yellow), var(--red))';
  if (tempMin < 5) return 'linear-gradient(90deg, var(--blue), var(--green))';
  return 'linear-gradient(90deg, var(--blue), var(--yellow))';
}

const DIFF_COLORS: Record<string, string> = {
  easy: 'var(--green)',
  moderate: 'var(--yellow)',
  hard: 'var(--red)',
};

export function WeatherPanel() {
  const daySegments = useRouteStore((s) => s.daySegments);
  const routeWeather = useResupplyStore((s) => s.routeWeather);
  const isLoadingWeather = useResupplyStore((s) => s.isLoadingWeather);
  const tripStartDate = useResupplyStore((s) => s.resupplyConfig.tripStartDate);

  if (daySegments.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={<CloudSun size={40} strokeWidth={1.5} color="#60a5fa" opacity={0.6} />}
          message="No route planned yet"
          hint="Create a route to see weather forecast"
        />
      </div>
    );
  }

  if (isLoadingWeather) {
    return (
      <div className="panel">
        <div className="calculating">
          <div className="spinner" />
          <span>Loading weather forecast...</span>
        </div>
      </div>
    );
  }

  if (!routeWeather || routeWeather.forecastAvailable === false || routeWeather.days.every((d) => d.weatherCode === -1)) {
    const isTooFarOut = routeWeather?.forecastAvailable === false;
    return (
      <div className="panel">
        <EmptyState
          icon={
            isTooFarOut
              ? <CloudOff size={40} strokeWidth={1.5} color="#94a3b8" opacity={0.7} />
              : <CloudSun size={40} strokeWidth={1.5} color="#60a5fa" opacity={0.6} />
          }
          message={isTooFarOut ? 'Weather forecast not yet available' : 'Forecast not available'}
          hint={
            !tripStartDate
              ? 'Set a trip start date in the Shop tab'
              : isTooFarOut
                ? 'Weather forecasts are available for trips starting within 16 days. Check back closer to your departure.'
                : 'Could not load forecast data'
          }
        />
      </div>
    );
  }

  const daysWithData = routeWeather.days.filter((d) => d.weatherCode !== -1);
  const overallTempMin = Math.min(...daysWithData.map((d) => d.tempMin));
  const overallTempMax = Math.max(...daysWithData.map((d) => d.tempMax));
  const totalPrecip = daysWithData.reduce((sum, d) => sum + d.precipitationSum, 0);
  const maxWind = Math.max(...daysWithData.map((d) => d.windSpeedMax));
  const weatherWarnings = getWeatherWarnings(routeWeather.days);

  return (
    <div className="panel">
      <div className="section-label">Trip Weather Overview</div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard value={`${overallTempMin.toFixed(0)}°`} label="min" />
        <StatCard value={`${overallTempMax.toFixed(0)}°`} label="max" />
        <StatCard value={`${totalPrecip.toFixed(0)}`} label="mm rain" />
        <StatCard value={`${maxWind.toFixed(0)}`} label="km/h" />
      </div>

      {weatherWarnings.length > 0 && (
        <div className="weather-alerts-section">
          <div className="weather-alerts-header">
            <AlertTriangle size={14} />
            <span>Weather Alerts</span>
          </div>
          {weatherWarnings.map((w, i) => (
            <div key={i} className={`timeline-warning ${w.severity}`}>
              {w.message}
            </div>
          ))}
        </div>
      )}

      <div className="section-label">Daily Forecast</div>
      <div className="weather-day-cards">
        {daySegments.map((seg) => {
          const dayWeather = routeWeather.days.find((d) => d.dayNumber === seg.dayNumber);
          if (!dayWeather || dayWeather.weatherCode === -1) {
            return (
              <div key={seg.dayNumber} className="weather-day-card">
                <div className="weather-card-header">
                  <span className="weather-card-day">Day {seg.dayNumber}</span>
                  <span className="weather-card-date">{formatDate(tripStartDate, seg.dayNumber)}</span>
                  <span className="weather-card-meta">
                    <span>{seg.distanceKm.toFixed(0)} km</span>
                    <span>{formatHours(seg.estimatedHours)}</span>
                  </span>
                </div>
                <div className="weather-card-nodata">No forecast data for this day</div>
              </div>
            );
          }

          const impact = getTravelImpact(dayWeather, seg);

          return (
            <div key={seg.dayNumber} className={`weather-day-card severity-${impact.severity}`}>
              <div className="weather-card-header">
                <span className="weather-card-day">Day {seg.dayNumber}</span>
                <span className="weather-card-date">{formatDate(tripStartDate, seg.dayNumber)}</span>
                <span className="weather-card-meta">
                  <span>{seg.distanceKm.toFixed(0)} km</span>
                  <span>{formatHours(seg.estimatedHours)}</span>
                  <span className="weather-difficulty" style={{ color: DIFF_COLORS[seg.difficulty] }}>
                    {seg.difficulty}
                  </span>
                </span>
              </div>

              <div className="weather-card-condition">
                <span className="weather-card-emoji">{weatherEmoji(dayWeather.condition)}</span>
                <span className="weather-card-condition-name">
                  {dayWeather.condition.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="weather-temp-bar">
                <Thermometer size={12} className="weather-temp-icon" />
                <span className="weather-temp-min">{dayWeather.tempMin.toFixed(0)}°</span>
                <div className="weather-temp-track">
                  <div
                    className="weather-temp-fill"
                    style={{
                      left: `${Math.max(0, ((dayWeather.tempMin + 10) / 50) * 100)}%`,
                      right: `${Math.max(0, 100 - ((dayWeather.tempMax + 10) / 50) * 100)}%`,
                      background: tempBarGradient(dayWeather.tempMin, dayWeather.tempMax),
                    }}
                  />
                </div>
                <span className="weather-temp-max">{dayWeather.tempMax.toFixed(0)}°</span>
              </div>

              <div className="weather-detail-row">
                <CloudRain size={12} />
                <span className="weather-detail-value">{dayWeather.precipitationSum.toFixed(1)} mm</span>
                <Droplets size={10} />
                <span>{dayWeather.precipitationProbMax}%</span>
              </div>

              <div className="weather-detail-row">
                <Wind size={12} />
                <span className="weather-detail-value">{dayWeather.windSpeedMax.toFixed(0)} km/h</span>
                <span
                  className="weather-wind-arrow"
                  title={`Wind from ${dayWeather.windDirection}°`}
                  style={{ transform: `rotate(${dayWeather.windDirection + 180}deg)` }}
                >
                  ↓
                </span>
              </div>

              <div className={`weather-impact ${impact.severity}`}>
                {impact.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
