import type { DaySegment } from '../types';

export interface MaintenanceReminder {
  type: 'chain_lube' | 'brake_check' | 'tire_check';
  label: string;
  intervalKm: number;
  distanceKm: number;
  dayNumber: number;
}

const MAINTENANCE_INTERVALS: { type: MaintenanceReminder['type']; label: string; intervalKm: number }[] = [
  { type: 'chain_lube', label: 'Lube chain', intervalKm: 150 },
  { type: 'brake_check', label: 'Check brakes', intervalKm: 500 },
  { type: 'tire_check', label: 'Check tire pressure', intervalKm: 300 },
];

/**
 * Generate maintenance reminders based on accumulated distance.
 * Returns reminders sorted by distance.
 */
export function generateMaintenanceReminders(daySegments: DaySegment[]): MaintenanceReminder[] {
  if (daySegments.length === 0) return [];

  const totalKm = daySegments[daySegments.length - 1].endKm;
  const reminders: MaintenanceReminder[] = [];

  for (const interval of MAINTENANCE_INTERVALS) {
    let km = interval.intervalKm;
    while (km <= totalKm) {
      // Find which day this falls on
      const seg = daySegments.find((s) => s.startKm <= km && s.endKm >= km);
      const dayNumber = seg?.dayNumber ?? 1;

      reminders.push({
        type: interval.type,
        label: interval.label,
        intervalKm: interval.intervalKm,
        distanceKm: km,
        dayNumber,
      });
      km += interval.intervalKm;
    }
  }

  return reminders.sort((a, b) => a.distanceKm - b.distanceKm);
}
