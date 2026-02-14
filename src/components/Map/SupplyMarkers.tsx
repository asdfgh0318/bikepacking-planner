import { useState, useMemo } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import { useSupplyStore } from '../../store/supplyStore';
import { useRouteStore } from '../../store/routeStore';
import type { SupplyPoint } from '../../types';

const COLORS: Record<string, { bg: string; border: string }> = {
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

const ICONS: Record<string, string> = {
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

const TYPE_LABELS: Record<string, string> = {
  paczkomat: 'InPost Paczkomat',
  zabka: 'Żabka',
  biedronka: 'Biedronka',
  shop: 'Shop',
  water: 'Water Source',
  campsite: 'Campsite',
  repair: 'Bike Repair',
  train_station: 'Train Station',
  bus_stop: 'Bus Stop',
  hospital: 'Hospital',
};

// Distance in km between two points (haversine approximation)
function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dx = (lng2 - lng1) * 111.32 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const dy = (lat2 - lat1) * 110.574;
  return Math.sqrt(dx * dx + dy * dy);
}

const SHELTER_RADIUS_KM = 10; // show shelters within 10km of predicted night stops

export function SupplyMarkers() {
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const showPaczkomaty = useSupplyStore((s) => s.showPaczkomaty);
  const showShops = useSupplyStore((s) => s.showShops);
  const showWater = useSupplyStore((s) => s.showWater);
  const showCampsites = useSupplyStore((s) => s.showCampsites);
  const showRepair = useSupplyStore((s) => s.showRepair);
  const showBailOut = useSupplyStore((s) => s.showBailOut);
  const bailOutPoints = useSupplyStore((s) => s.bailOutPoints);
  const daySegments = useRouteStore((s) => s.daySegments);
  const [popupPoint, setPopupPoint] = useState<SupplyPoint | null>(null);

  // Night stop coordinates for filtering shelters/campsites
  const nightStopCoords = useMemo(() =>
    daySegments
      .filter((s) => s.nightStop)
      .map((s) => ({ lng: s.nightStop!.coord[0], lat: s.nightStop!.coord[1] })),
    [daySegments]
  );

  const allPoints = [...supplyPoints, ...(showBailOut ? bailOutPoints : [])];

  const visible = allPoints.filter((p) => {
    if (p.type === 'paczkomat' && !showPaczkomaty) return false;
    if (p.type === 'water' && !showWater) return false;
    if (p.type === 'campsite' && !showCampsites) return false;
    if (p.type === 'repair' && !showRepair) return false;
    if (['train_station', 'hospital'].includes(p.type) && !showBailOut) return false;
    if (!['paczkomat', 'water', 'campsite', 'repair', 'train_station', 'hospital'].includes(p.type) && !showShops) return false;

    // Filter campsites/shelters to only show near predicted night stops
    if (p.type === 'campsite' && nightStopCoords.length > 0) {
      const nearNightStop = nightStopCoords.some(
        (ns) => distKm(p.lat, p.lng, ns.lat, ns.lng) <= SHELTER_RADIUS_KM
      );
      if (!nearNightStop) return false;
    }

    return true;
  });

  return (
    <>
      {visible.map((pt) => {
        const c = COLORS[pt.type] || COLORS.shop;
        const svg = ICONS[pt.type] || ICONS.shop;
        return (
          <Marker
            key={pt.id}
            latitude={pt.lat}
            longitude={pt.lng}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupPoint(popupPoint?.id === pt.id ? null : pt);
            }}
          >
            <div
              className="supply-marker"
              style={{
                width: 30,
                height: 30,
                background: c.bg,
                border: `2.5px solid ${c.border}`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                cursor: 'pointer',
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </Marker>
        );
      })}
      {popupPoint && (
        <Popup
          latitude={popupPoint.lat}
          longitude={popupPoint.lng}
          onClose={() => setPopupPoint(null)}
          closeOnClick={false}
          offset={18}
          className="custom-popup"
        >
          <div style={{ fontFamily: '-apple-system, sans-serif', minWidth: 160 }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              {TYPE_LABELS[popupPoint.type] || popupPoint.type}
            </div>
            <strong style={{ fontSize: 14 }}>{popupPoint.name}</strong>
            {popupPoint.details?.waterType && (
              <div style={{ fontSize: 12, color: '#38bdf8', marginTop: 4 }}>
                {popupPoint.details.waterType.replace('_', ' ')}
              </div>
            )}
            {popupPoint.details?.campsiteType && (
              <div style={{ fontSize: 12, color: '#c084fc', marginTop: 4 }}>
                {popupPoint.details.campsiteType.replace('_', ' ')}
                {popupPoint.details.capacity && ` · ${popupPoint.details.capacity} spots`}
              </div>
            )}
            {popupPoint.details?.repairType && (
              <div style={{ fontSize: 12, color: '#facc15', marginTop: 4 }}>
                {popupPoint.details.repairType === 'repair_station' ? 'Self-service station' : 'Bike shop'}
                {popupPoint.details.phone && ` · ${popupPoint.details.phone}`}
              </div>
            )}
            {popupPoint.details?.address && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {popupPoint.details.address}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                {popupPoint.distanceFromStartKm.toFixed(1)} km
              </span>
              {popupPoint.details?.is24h && (
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                  24/7
                </span>
              )}
              {popupPoint.details?.fee === false && (
                <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                  Free
                </span>
              )}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
