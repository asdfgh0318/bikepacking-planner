import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useSupplyStore } from '../../store/supplyStore';

// SVG icons for supply types
const ICONS: Record<string, string> = {
  paczkomat: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#92400e" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  zabka: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#166534" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  biedronka: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#991b1b" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  shop: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#1e40af" stroke-width="2.5"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/></svg>`,
  water: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0c4a6e" stroke-width="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  campsite: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#5b21b6" stroke-width="2.5"><path d="M12 2L2 22h20L12 2z"/><path d="M12 14v4"/></svg>`,
  repair: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#854d0e" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
};

const COLORS: Record<string, { bg: string; border: string }> = {
  paczkomat: { bg: '#fbbf24', border: '#92400e' },
  zabka: { bg: '#4ade80', border: '#166534' },
  biedronka: { bg: '#f87171', border: '#991b1b' },
  shop: { bg: '#60a5fa', border: '#1e40af' },
  water: { bg: '#38bdf8', border: '#0c4a6e' },
  campsite: { bg: '#c084fc', border: '#5b21b6' },
  repair: { bg: '#facc15', border: '#854d0e' },
};

function createSupplyIcon(type: string) {
  const c = COLORS[type] || COLORS.shop;
  const svg = ICONS[type] || ICONS.shop;
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
function getIcon(type: string) {
  if (!iconCache.has(type)) {
    iconCache.set(type, createSupplyIcon(type));
  }
  return iconCache.get(type)!;
}

const TYPE_LABELS: Record<string, string> = {
  paczkomat: 'InPost Paczkomat',
  zabka: 'Żabka',
  biedronka: 'Biedronka',
  shop: 'Shop',
  water: 'Water Source',
  campsite: 'Campsite',
  repair: 'Bike Repair',
};

export function SupplyMarkers() {
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const showPaczkomaty = useSupplyStore((s) => s.showPaczkomaty);
  const showShops = useSupplyStore((s) => s.showShops);
  const showWater = useSupplyStore((s) => s.showWater);
  const showCampsites = useSupplyStore((s) => s.showCampsites);
  const showRepair = useSupplyStore((s) => s.showRepair);

  const visible = supplyPoints.filter((p) => {
    if (p.type === 'paczkomat' && !showPaczkomaty) return false;
    if (p.type === 'water' && !showWater) return false;
    if (p.type === 'campsite' && !showCampsites) return false;
    if (p.type === 'repair' && !showRepair) return false;
    if (!['paczkomat', 'water', 'campsite', 'repair'].includes(p.type) && !showShops) return false;
    return true;
  });

  return (
    <>
      {visible.map((pt) => (
        <Marker key={pt.id} position={[pt.lat, pt.lng]} icon={getIcon(pt.type)}>
          <Popup className="custom-popup">
            <div style={{ fontFamily: '-apple-system, sans-serif', minWidth: 160 }}>
              <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                {TYPE_LABELS[pt.type] || pt.type}
              </div>
              <strong style={{ fontSize: 14 }}>{pt.name}</strong>
              {pt.details?.waterType && (
                <div style={{ fontSize: 12, color: '#38bdf8', marginTop: 4 }}>
                  {pt.details.waterType.replace('_', ' ')}
                </div>
              )}
              {pt.details?.campsiteType && (
                <div style={{ fontSize: 12, color: '#c084fc', marginTop: 4 }}>
                  {pt.details.campsiteType.replace('_', ' ')}
                  {pt.details.capacity && ` · ${pt.details.capacity} spots`}
                </div>
              )}
              {pt.details?.repairType && (
                <div style={{ fontSize: 12, color: '#facc15', marginTop: 4 }}>
                  {pt.details.repairType === 'repair_station' ? 'Self-service station' : 'Bike shop'}
                  {pt.details.phone && ` · ${pt.details.phone}`}
                </div>
              )}
              {pt.details?.address && (
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  {pt.details.address}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
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
                {pt.details?.fee === false && (
                  <span style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    Free
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
