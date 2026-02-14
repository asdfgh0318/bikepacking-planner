import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useSupplyStore } from '../../store/supplyStore';
import type { SupplyPoint } from '../../types';

// SVG icons for supply types
const ICONS = {
  paczkomat: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#92400e" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  zabka: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#166534" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  biedronka: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#166534" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  shop: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#166534" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
};

const COLORS = {
  paczkomat: { bg: '#fbbf24', border: '#92400e' },
  zabka: { bg: '#4ade80', border: '#166534' },
  biedronka: { bg: '#f87171', border: '#991b1b' },
  shop: { bg: '#60a5fa', border: '#1e40af' },
};

function createSupplyIcon(type: SupplyPoint['type']) {
  const c = COLORS[type];
  const svg = ICONS[type];
  return L.divIcon({
    className: 'supply-marker-wrap',
    html: `<div style="
      width:30px;height:30px;
      background:${c.bg};
      border:2.5px solid ${c.border};
      border-radius:8px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">${svg}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const iconCache = new Map<string, L.DivIcon>();
function getIcon(type: SupplyPoint['type']) {
  if (!iconCache.has(type)) {
    iconCache.set(type, createSupplyIcon(type));
  }
  return iconCache.get(type)!;
}

const TYPE_LABELS: Record<SupplyPoint['type'], string> = {
  paczkomat: 'InPost Paczkomat',
  zabka: 'Żabka',
  biedronka: 'Biedronka',
  shop: 'Shop',
};

export function SupplyMarkers() {
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const showPaczkomaty = useSupplyStore((s) => s.showPaczkomaty);
  const showShops = useSupplyStore((s) => s.showShops);

  const visible = supplyPoints.filter((p) => {
    if (p.type === 'paczkomat' && !showPaczkomaty) return false;
    if (p.type !== 'paczkomat' && !showShops) return false;
    return true;
  });

  return (
    <>
      {visible.map((pt) => (
        <Marker key={pt.id} position={[pt.lat, pt.lng]} icon={getIcon(pt.type)}>
          <Popup className="custom-popup">
            <div style={{ fontFamily: '-apple-system, sans-serif', minWidth: 160 }}>
              <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                {TYPE_LABELS[pt.type]}
              </div>
              <strong style={{ fontSize: 14 }}>{pt.name}</strong>
              {pt.details?.address && (
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  {pt.details.address}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span style={{
                  background: '#f1f5f9',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {pt.distanceFromStartKm.toFixed(1)} km
                </span>
                {pt.details?.is24h && (
                  <span style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    24/7
                  </span>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
