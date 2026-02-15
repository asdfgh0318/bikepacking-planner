/**
 * Shared supply-type configuration: colors, SVG icons, short labels, and badge letters.
 * Imported by SupplyMarkers, SupplyPanel, and ShoppingTimeline to avoid duplication.
 */

export const SUPPLY_COLORS: Record<string, { bg: string; border: string }> = {
  paczkomat: { bg: '#fbbf24', border: '#92400e' },
  zabka: { bg: '#4ade80', border: '#166534' },
  biedronka: { bg: '#f87171', border: '#991b1b' },
  shop: { bg: '#60a5fa', border: '#1e40af' },
  water: { bg: '#38bdf8', border: '#0c4a6e' },
  campsite: { bg: '#c084fc', border: '#5b21b6' },
  repair: { bg: '#facc15', border: '#854d0e' },
  train_station: { bg: '#fca5a5', border: '#dc2626' },
  bus_stop: { bg: '#fed7aa', border: '#ea580c' },
  hospital: { bg: '#fecaca', border: '#dc2626' },
};

export const SUPPLY_ICONS: Record<string, string> = {
  paczkomat: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#92400e" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  zabka: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#166534" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  biedronka: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#991b1b" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  shop: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#1e40af" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  water: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0c4a6e" stroke-width="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  campsite: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#5b21b6" stroke-width="2.5"><path d="M12 2L2 22h20L12 2z"/><path d="M12 14v4"/></svg>`,
  repair: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#854d0e" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
  train_station: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2.5"><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><circle cx="8" cy="20" r="1"/><circle cx="16" cy="20" r="1"/></svg>`,
  bus_stop: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ea580c" stroke-width="2.5"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 9h18"/><circle cx="7" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></svg>`,
  hospital: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>`,
};

export const SUPPLY_TYPE_LABELS: Record<string, string> = {
  paczkomat: 'InPost Paczkomat',
  zabka: 'Zabka',
  biedronka: 'Biedronka',
  shop: 'Shop',
  water: 'Water Source',
  campsite: 'Campsite',
  repair: 'Bike Repair',
  train_station: 'Train Station',
  bus_stop: 'Bus Stop',
  hospital: 'Hospital',
};

/** Single-character badge letters used in SupplyPanel and ShoppingTimeline */
export const SUPPLY_BADGE_LETTERS: Record<string, string> = {
  paczkomat: 'P',
  zabka: 'Z',
  biedronka: 'B',
  shop: 'S',
  water: 'W',
  campsite: 'C',
  repair: 'R',
  train_station: 'T',
  bus_stop: 'X',
  hospital: 'H',
};
