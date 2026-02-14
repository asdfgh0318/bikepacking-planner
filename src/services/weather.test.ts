import { describe, it, expect } from 'vitest';
import { weatherEmoji, getWeatherWarnings } from './weather';
import type { DayWeather, WeatherCondition } from '../types';

/** Helper to create a DayWeather object with sensible defaults. */
function makeDayWeather(overrides: Partial<DayWeather> = {}): DayWeather {
  return {
    dayNumber: 1,
    date: '2026-07-01',
    tempMin: 15,
    tempMax: 25,
    precipitationSum: 0,
    precipitationProbMax: 10,
    windSpeedMax: 10,
    windDirection: 180,
    condition: 'clear',
    weatherCode: 0,
    ...overrides,
  };
}

describe('weatherEmoji', () => {
  it('returns sun emoji for clear sky', () => {
    expect(weatherEmoji('clear')).toBe('\u2600\uFE0F'); // ☀️
  });

  it('returns rain emoji for rain', () => {
    expect(weatherEmoji('rain')).toBe('\uD83C\uDF27\uFE0F'); // 🌧️
  });

  it('returns snowflake emoji for snow', () => {
    expect(weatherEmoji('snow')).toBe('\uD83C\uDF28\uFE0F'); // 🌨️
  });

  it('returns storm emoji for thunderstorm', () => {
    expect(weatherEmoji('thunderstorm')).toBe('\u26C8\uFE0F'); // ⛈️
  });

  it('returns cloud emoji for cloudy', () => {
    expect(weatherEmoji('cloudy')).toBe('\u2601\uFE0F'); // ☁️
  });

  it('returns fog emoji for fog', () => {
    expect(weatherEmoji('fog')).toBe('\uD83C\uDF2B\uFE0F'); // 🌫️
  });

  it('returns partly cloudy emoji for partly_cloudy', () => {
    expect(weatherEmoji('partly_cloudy')).toBe('\u26C5'); // ⛅
  });

  it('returns drizzle emoji for drizzle', () => {
    expect(weatherEmoji('drizzle')).toBe('\uD83C\uDF26\uFE0F'); // 🌦️
  });

  it('returns storm emoji for heavy_rain', () => {
    expect(weatherEmoji('heavy_rain')).toBe('\u26C8\uFE0F'); // ⛈️
  });

  it('returns fallback emoji for unknown condition', () => {
    // Force an unknown condition through the type system
    expect(weatherEmoji('unknown_thing' as WeatherCondition)).toBe('\uD83C\uDF24\uFE0F'); // 🌤️
  });
});

describe('getWeatherWarnings', () => {
  it('returns no warnings for mild weather', () => {
    const days = [makeDayWeather()];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toEqual([]);
  });

  it('returns no warnings for days with no forecast data (weatherCode -1)', () => {
    const days = [makeDayWeather({ weatherCode: -1, tempMin: -10, precipitationSum: 50 })];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toEqual([]);
  });

  it('warns about heavy rain (>10mm)', () => {
    const days = [makeDayWeather({ precipitationSum: 15 })];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].dayNumber).toBe(1);
    expect(warnings[0].message).toContain('rain');
    expect(warnings[0].severity).toBe('warning');
  });

  it('escalates to danger for very heavy rain (>20mm)', () => {
    const days = [makeDayWeather({ precipitationSum: 25 })];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('danger');
  });

  it('warns about strong wind (>40 km/h)', () => {
    const days = [makeDayWeather({ windSpeedMax: 50 })];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('wind');
    expect(warnings[0].severity).toBe('warning');
  });

  it('escalates to danger for very strong wind (>60 km/h)', () => {
    const days = [makeDayWeather({ windSpeedMax: 70 })];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('danger');
  });

  it('warns about extreme cold (<0 degrees C)', () => {
    const days = [makeDayWeather({ tempMin: -3 })];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('Freezing');
    expect(warnings[0].severity).toBe('warning');
  });

  it('escalates to danger for deep freeze (<-5 degrees C)', () => {
    const days = [makeDayWeather({ tempMin: -10 })];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('danger');
  });

  it('warns about extreme heat (>33 degrees C)', () => {
    const days = [makeDayWeather({ tempMax: 36 })];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('Heat');
    expect(warnings[0].severity).toBe('warning');
  });

  it('escalates to danger for extreme heat (>38 degrees C)', () => {
    const days = [makeDayWeather({ tempMax: 40 })];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('danger');
  });

  it('warns about thunderstorms', () => {
    const days = [makeDayWeather({ condition: 'thunderstorm', weatherCode: 95 })];
    const warnings = getWeatherWarnings(days);
    expect(warnings.some((w) => w.message.includes('Thunderstorm'))).toBe(true);
    expect(warnings.find((w) => w.message.includes('Thunderstorm'))!.severity).toBe('danger');
  });

  it('produces multiple warnings when multiple thresholds are exceeded', () => {
    const days = [
      makeDayWeather({
        dayNumber: 1,
        precipitationSum: 15,
        windSpeedMax: 50,
        tempMax: 36,
      }),
    ];
    const warnings = getWeatherWarnings(days);
    // Should have rain + wind + heat = 3 warnings
    expect(warnings).toHaveLength(3);
    const types = warnings.map((w) => w.message);
    expect(types.some((m) => m.includes('rain'))).toBe(true);
    expect(types.some((m) => m.includes('wind'))).toBe(true);
    expect(types.some((m) => m.includes('Heat'))).toBe(true);
  });

  it('handles multiple days correctly', () => {
    const days = [
      makeDayWeather({ dayNumber: 1 }), // mild - no warnings
      makeDayWeather({ dayNumber: 2, precipitationSum: 15 }), // rain warning
      makeDayWeather({ dayNumber: 3, tempMin: -3 }), // cold warning
    ];
    const warnings = getWeatherWarnings(days);
    expect(warnings).toHaveLength(2);
    expect(warnings[0].dayNumber).toBe(2);
    expect(warnings[1].dayNumber).toBe(3);
  });
});
