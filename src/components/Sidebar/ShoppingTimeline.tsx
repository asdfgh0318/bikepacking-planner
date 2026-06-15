import React, { useMemo } from 'react';
import { AlertTriangle, CloudRain, Wind, Thermometer } from 'lucide-react';
import type { UnifiedShoppingPlan } from '../../types';
import { useResupplyStore } from '../../store/resupplyStore';
import { weatherEmoji, getWeatherWarnings } from '../../services/weather';
import { SUPPLY_COLORS, SUPPLY_BADGE_LETTERS } from '../../constants/supplyTypes';
import { isTradingSunday } from '../../data/sundayTrading';
import { tripDayDate } from '../../utils/date';

/**
 * Format a decimal hour (e.g. 14.5) as "HH:MM" (e.g. "14:30").
 */
function formatArrivalHour(decimalHour: number): string {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Return a CSS class for the arrival time badge based on store-hour viability.
 * Green: 7:00-20:00 (comfortable shopping window)
 * Yellow: 20:00-21:00 (close to closing)
 * Red: before 7:00 or after 21:00 (likely closed)
 */
function arrivalTimeClass(decimalHour: number): string {
  if (decimalHour < 7 || decimalHour >= 21) return 'timeline-arrival timeline-arrival-red';
  if (decimalHour >= 20) return 'timeline-arrival timeline-arrival-yellow';
  return 'timeline-arrival timeline-arrival-green';
}

export const ShoppingTimeline = React.memo(function ShoppingTimeline({ plan }: { plan: UnifiedShoppingPlan }) {
  const routeWeather = useResupplyStore((s) => s.routeWeather);
  const tripStartDate = useResupplyStore((s) => s.resupplyConfig.tripStartDate);
  const weatherWarnings = useMemo(
    () => (routeWeather ? getWeatherWarnings(routeWeather.days) : []),
    [routeWeather],
  );

  const dayMetaMap = useMemo(
    () => {
      const map = new Map<number, { dateStr: string | null; isTradingDay: boolean }>();
      for (const day of plan.dayBreakdown) {
        const dateStr = tripDayDate(tripStartDate, day.dayNumber);
        map.set(day.dayNumber, {
          dateStr,
          isTradingDay: dateStr !== null && isTradingSunday(dateStr),
        });
      }
      return map;
    },
    [plan.dayBreakdown, tripStartDate],
  );

  return (
    <div className="shopping-timeline">
      {plan.dayBreakdown.map((day) => {
        const dayWeather = routeWeather?.days.find(d => d.dayNumber === day.dayNumber);
        const hasWeather = dayWeather && dayWeather.weatherCode !== -1;
        const isTradingDay = dayMetaMap.get(day.dayNumber)?.isTradingDay ?? false;

        return (
        <div key={day.dayNumber} className="timeline-day">
          <div className="timeline-day-header">
            <span className="timeline-day-num">Day {day.dayNumber}</span>
            {isTradingDay && (
              <span className="timeline-trading-badge">Trading Sunday</span>
            )}
            {hasWeather && (
              <span className="timeline-weather" title={`${dayWeather.tempMin.toFixed(0)}–${dayWeather.tempMax.toFixed(0)}°C, ${dayWeather.precipitationSum.toFixed(0)}mm rain, wind ${dayWeather.windSpeedMax.toFixed(0)}km/h`}>
                <span className="weather-emoji">{weatherEmoji(dayWeather.condition)}</span>
                <span className="weather-temp">{dayWeather.tempMin.toFixed(0)}–{dayWeather.tempMax.toFixed(0)}°</span>
                {dayWeather.precipitationSum > 1 && (
                  <span className="weather-rain">
                    <CloudRain size={10} />
                    {dayWeather.precipitationSum.toFixed(0)}mm
                  </span>
                )}
                {dayWeather.windSpeedMax > 25 && (
                  <span className="weather-wind">
                    <Wind size={10} />
                    {dayWeather.windSpeedMax.toFixed(0)}
                  </span>
                )}
              </span>
            )}
            <span className="timeline-day-dist">{day.distanceKm.toFixed(0)} km</span>
          </div>

          {day.stops.length === 0 && (
            <div className="timeline-no-stops">No food stops</div>
          )}

          {day.stops.map((stop, i) => (
            <div key={`${stop.stopId}-${i}`} className="timeline-stop">
              <span
                className="timeline-badge"
                style={{ background: (SUPPLY_COLORS[stop.stopType] || SUPPLY_COLORS.shop).bg }}
              >
                {stop.source === 'paczkomat' ? 'P' : SUPPLY_BADGE_LETTERS[stop.stopType] || 'S'}
              </span>
              <div className="timeline-stop-info">
                <div className="timeline-stop-name">
                  {stop.source === 'paczkomat' ? `📦 ${stop.stopName}` : stop.stopName}
                  {stop.estimatedArrivalHour != null && (
                    <span className={arrivalTimeClass(stop.estimatedArrivalHour)}>
                      ~{formatArrivalHour(stop.estimatedArrivalHour)}
                    </span>
                  )}
                </div>
                <div className="timeline-stop-meta">
                  <span>km {stop.distanceKm.toFixed(0)}</span>
                  <span>{stop.totalCalories} kcal</span>
                  <span>{(stop.totalWeightG / 1000).toFixed(1)} kg</span>
                  {stop.isOpenOnArrival === false && (
                    <span className="timeline-closed">closed</span>
                  )}
                  {stop.isOpenOnArrival === null && (
                    <span className="timeline-unknown">hours?</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="timeline-day-footer">
            {(() => {
              const carryLevel = day.carryWeightMaxG < 1000 ? 'Safe' : day.carryWeightMaxG < 2000 ? 'Caution' : 'Danger';
              const carryColor = day.carryWeightMaxG < 1000 ? '#4ade80' : day.carryWeightMaxG < 2000 ? '#fbbf24' : '#f87171';
              return (
                <>
                  <div
                    className="timeline-carry-bar"
                    role="meter"
                    aria-label={`Food carry weight: ${(day.carryWeightMaxG / 1000).toFixed(1)} kg - ${carryLevel}`}
                    aria-valuemin={0}
                    aria-valuemax={3}
                    aria-valuenow={parseFloat((day.carryWeightMaxG / 1000).toFixed(1))}
                  >
                    <div
                      className="timeline-carry-fill"
                      style={{
                        width: `${Math.min(100, (day.carryWeightMaxG / 3000) * 100)}%`,
                        background: carryColor,
                      }}
                    />
                  </div>
                  <span className="timeline-carry-label">
                    max {(day.carryWeightMaxG / 1000).toFixed(1)} kg food
                    <span className="timeline-carry-severity" style={{ color: carryColor }}> {carryLevel}</span>
                  </span>
                </>
              );
            })()}
          </div>
        </div>
        );
      })}

      {/* Weather Warnings */}
      {weatherWarnings.length > 0 && (
        <div className="timeline-warnings weather-warnings">
          <div className="timeline-warnings-header">
            <Thermometer size={14} />
            <span>Weather Alerts</span>
          </div>
          {weatherWarnings.map((w, i) => (
            <div key={`wx-${i}`} className={`timeline-warning ${w.severity}`} aria-label={`${w.severity === 'danger' ? 'Danger' : w.severity === 'warning' ? 'Caution' : 'Info'}: ${w.message}`}>
              {w.message}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {plan.resupply.warnings.length > 0 && (
        <div className="timeline-warnings">
          <div className="timeline-warnings-header">
            <AlertTriangle size={14} />
            <span>Warnings</span>
          </div>
          {plan.resupply.warnings.map((w, i) => (
            <div key={i} className={`timeline-warning ${w.severity}`} aria-label={`${w.severity === 'danger' ? 'Danger' : w.severity === 'warning' ? 'Caution' : 'Info'}: ${w.message}`}>
              {w.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
