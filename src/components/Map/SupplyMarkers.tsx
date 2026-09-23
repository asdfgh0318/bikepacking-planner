import React, { useState, useMemo, useCallback } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import type { MarkerEvent } from 'react-map-gl/maplibre';
import { useSupplyStore, LAYER_TYPES } from '../../store/supplyStore';
import { useRouteStore } from '../../store/routeStore';
import { SUPPLY_COLORS, SUPPLY_ICONS, SUPPLY_TYPE_LABELS } from '../../constants/supplyTypes';
import { distanceKm } from '../../utils/distance';
import { isClosedOnNonTradingSunday } from '../../data/sundayTrading';
import type { SupplyPoint } from '../../types';

/** Campsites and shelters only matter near where you'll actually sleep. */
const SHELTER_RADIUS_KM = 10;

/** Static SVG from the icon table, injected without dangerouslySetInnerHTML. */
function SvgIcon({ svgString }: { svgString: string }) {
  const ref = useCallback((node: HTMLDivElement | null) => { if (node) node.innerHTML = svgString; }, [svgString]);
  return <div ref={ref} className="supply-marker-icon" />;
}

const SupplyMarkerItem = React.memo(function SupplyMarkerItem({ pt, onToggle }: { pt: SupplyPoint; onToggle: (pt: SupplyPoint) => void }) {
  const c = SUPPLY_COLORS[pt.type] || SUPPLY_COLORS.shop;
  const handleClick = useCallback((e: MarkerEvent<MouseEvent>) => { e.originalEvent.stopPropagation(); onToggle(pt); }, [pt, onToggle]);
  return (
    <Marker latitude={pt.lat} longitude={pt.lng} anchor="center" onClick={handleClick}>
      <div className="supply-marker" style={{ background: c.bg, borderColor: c.border }}>
        <SvgIcon svgString={SUPPLY_ICONS[pt.type] || SUPPLY_ICONS.shop} />
      </div>
    </Marker>
  );
});

export function SupplyMarkers() {
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const bailOutPoints = useSupplyStore((s) => s.bailOutPoints);
  const layers = useSupplyStore((s) => s.layers);
  const daySegments = useRouteStore((s) => s.daySegments);
  const [popup, setPopup] = useState<SupplyPoint | null>(null);

  const nightStops = useMemo(
    () => daySegments.filter((s) => s.nightStop).map((s) => ({ lng: s.nightStop!.coord[0], lat: s.nightStop!.coord[1] })),
    [daySegments],
  );

  const visible = useMemo(() => {
    const all = [...supplyPoints, ...(layers.bailout ? bailOutPoints : [])];
    return all.filter((p) => {
      if (LAYER_TYPES.sleep.has(p.type)) {
        if (!layers.sleep) return false;
        return nightStops.length === 0 || nightStops.some((n) => distanceKm(p.lat, p.lng, n.lat, n.lng) <= SHELTER_RADIUS_KM);
      }
      if (LAYER_TYPES.food.has(p.type)) return layers.food;
      if (LAYER_TYPES.water.has(p.type)) return layers.water;
      if (LAYER_TYPES.services.has(p.type)) return layers.services;
      if (LAYER_TYPES.bailout.has(p.type)) return layers.bailout;
      return true;
    });
  }, [supplyPoints, bailOutPoints, layers, nightStops]);

  const toggle = useCallback((pt: SupplyPoint) => setPopup((prev) => (prev?.id === pt.id ? null : pt)), []);

  return (
    <>
      {visible.map((pt) => <SupplyMarkerItem key={pt.id} pt={pt} onToggle={toggle} />)}
      {popup && (
        <Popup latitude={popup.lat} longitude={popup.lng} onClose={() => setPopup(null)} closeOnClick={false} offset={18} className="custom-popup">
          <div className="popup">
            <div className="popup-type">{SUPPLY_TYPE_LABELS[popup.type] || popup.type}</div>
            <strong>{popup.name}</strong>
            {popup.details?.openingHours && <div className="popup-line">{popup.details.openingHours}</div>}
            {popup.details?.address && <div className="popup-line">{popup.details.address}</div>}
            <div className="popup-tags">
              <span className="tag">{popup.distanceFromStartKm.toFixed(1)} km</span>
              {popup.details?.is24h && <span className="tag tag-good">24/7</span>}
              {popup.details?.fee === false && <span className="tag tag-good">free</span>}
              {isClosedOnNonTradingSunday(popup) && <span className="tag tag-warn">closed non-trading Sundays</span>}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
