/**
 * Single source of truth for supply-type configuration.
 * All per-type data (color, icon, label, badge) lives in SUPPLY_TYPE_CONFIG.
 * Derived maps (SUPPLY_COLORS, SUPPLY_ICONS, etc.) are generated below.
 */

interface SupplyTypeDefinition {
  label: string;
  badge: string;
  color: { bg: string; border: string };
  icon: string;
}

const SUPPLY_TYPE_CONFIG: Record<string, SupplyTypeDefinition> = {
  paczkomat: {
    label: 'InPost Paczkomat',
    badge: 'P',
    color: { bg: '#fbbf24', border: '#92400e' },
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#92400e" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  },
  zabka: {
    label: 'Zabka',
    badge: 'Z',
    color: { bg: '#4ade80', border: '#166534' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#166534" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  },
  biedronka: {
    label: 'Biedronka',
    badge: 'B',
    color: { bg: '#f87171', border: '#991b1b' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#991b1b" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  },
  shop: {
    label: 'Shop',
    badge: 'S',
    color: { bg: '#60a5fa', border: '#1e40af' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#1e40af" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  },
  water: {
    label: 'Water Source',
    badge: 'W',
    color: { bg: '#38bdf8', border: '#0c4a6e' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0c4a6e" stroke-width="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  },
  campsite: {
    label: 'Campsite',
    badge: 'C',
    color: { bg: '#c084fc', border: '#5b21b6' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#5b21b6" stroke-width="2.5"><path d="M12 2L2 22h20L12 2z"/><path d="M12 14v4"/></svg>`,
  },
  repair: {
    label: 'Bike Repair',
    badge: 'R',
    color: { bg: '#facc15', border: '#854d0e' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#854d0e" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
  },
  train_station: {
    label: 'Train Station',
    badge: 'T',
    color: { bg: '#fca5a5', border: '#dc2626' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2.5"><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><circle cx="8" cy="20" r="1"/><circle cx="16" cy="20" r="1"/></svg>`,
  },
  bus_stop: {
    label: 'Bus Stop',
    badge: 'X',
    color: { bg: '#fed7aa', border: '#ea580c' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ea580c" stroke-width="2.5"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 9h18"/><circle cx="7" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></svg>`,
  },
  hospital: {
    label: 'Hospital',
    badge: 'H',
    color: { bg: '#fecaca', border: '#dc2626' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>`,
  },
  supermarket: {
    label: 'Supermarket',
    badge: 'M',
    color: { bg: '#34d399', border: '#065f46' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#065f46" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
  },
  convenience: {
    label: 'Convenience Store',
    badge: 'C',
    color: { bg: '#6ee7b7', border: '#047857' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#047857" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9"/><line x1="12" y1="13" x2="12" y2="17"/></svg>`,
  },
  fuel: {
    label: 'Fuel Station',
    badge: 'F',
    color: { bg: '#fb923c', border: '#9a3412' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#9a3412" stroke-width="2.5"><path d="M3 22V5a2 2 0 012-2h8a2 2 0 012 2v17"/><path d="M15 10h2a2 2 0 012 2v3a2 2 0 002 2"/><path d="M3 22h12"/><rect x="6" y="6" width="6" height="5" rx="1"/></svg>`,
  },
  bakery: {
    label: 'Bakery',
    badge: 'K',
    color: { bg: '#fbbf24', border: '#78350f' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#78350f" stroke-width="2.5"><path d="M12 6c-3.5 0-7 2-7 6 0 3 2 5 3 6h8c1-1 3-3 3-6 0-4-3.5-6-7-6z"/><path d="M10 6V4a2 2 0 014 0v2"/><line x1="8" y1="18" x2="8" y2="21"/><line x1="16" y1="18" x2="16" y2="21"/></svg>`,
  },
  cafe: {
    label: 'Cafe',
    badge: 'E',
    color: { bg: '#a78bfa', border: '#4c1d95' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#4c1d95" stroke-width="2.5"><path d="M17 8h1a4 4 0 010 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`,
  },
  restaurant: {
    label: 'Restaurant',
    badge: 'R',
    color: { bg: '#f472b6', border: '#831843' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#831843" stroke-width="2.5"><path d="M18 2v6a4 4 0 01-4 4H6"/><line x1="6" y1="2" x2="6" y2="22"/><path d="M18 12v10"/><path d="M2 2v4a4 4 0 004 4"/></svg>`,
  },
  pharmacy: {
    label: 'Pharmacy',
    badge: '+',
    color: { bg: '#2dd4bf', border: '#134e4a' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#134e4a" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`,
  },
  toilets: {
    label: 'Public Toilet',
    badge: 'T',
    color: { bg: '#94a3b8', border: '#334155' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#334155" stroke-width="2.5"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><path d="M8 8v4l-2 6"/><path d="M8 12l2 6"/><path d="M16 8v4l-2 6"/><path d="M16 12l2 6"/></svg>`,
  },
  compressed_air: {
    label: 'Compressed Air',
    badge: 'A',
    color: { bg: '#67e8f9', border: '#164e63' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#164e63" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/><path d="M12 8v8"/><circle cx="12" cy="12" r="3"/></svg>`,
  },
  halt: {
    label: 'Train Halt',
    badge: 'H',
    color: { bg: '#fca5a5', border: '#dc2626' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" stroke-width="2.5"><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16"/><circle cx="8" cy="20" r="1"/><circle cx="16" cy="20" r="1"/></svg>`,
  },
  alpine_hut: {
    label: 'Alpine Hut',
    badge: 'U',
    color: { bg: '#e879f9', border: '#701a75' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#701a75" stroke-width="2.5"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><rect x="9" y="13" width="6" height="8"/><path d="M9 9h6"/></svg>`,
  },
  basic_shelter: {
    label: 'Basic Shelter',
    badge: 'L',
    color: { bg: '#d8b4fe', border: '#6b21a8' },
    icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#6b21a8" stroke-width="2.5"><path d="M3 21h18"/><path d="M12 3L3 14h18L12 3z"/><line x1="12" y1="14" x2="12" y2="21"/></svg>`,
  },
};

// Derived maps — single source of truth above, consumed everywhere
function deriveMap<T>(fn: (def: SupplyTypeDefinition) => T): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, def] of Object.entries(SUPPLY_TYPE_CONFIG)) {
    result[key] = fn(def);
  }
  return result;
}

export const SUPPLY_COLORS = deriveMap((d) => d.color);
export const SUPPLY_ICONS = deriveMap((d) => d.icon);
export const SUPPLY_TYPE_LABELS = deriveMap((d) => d.label);
export const SUPPLY_BADGE_LETTERS = deriveMap((d) => d.badge);
