import { useState, useMemo, useCallback } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import { useSupplyStore } from '../../store/supplyStore';
import { useRouteStore } from '../../store/routeStore';
import { SUPPLY_COLORS, SUPPLY_ICONS, SUPPLY_TYPE_LABELS } from '../../constants/supplyTypes';
import { distanceKm } from '../../utils/distance';
import type { SupplyPoint } from '../../types';

const SHELTER_RADIUS_KM = 10; // show shelters within 10km of predicted night stops

/**
 * Small helper to inject a static SVG string into a DOM node via ref callback,
 * avoiding dangerouslySetInnerHTML while still using pre-built SVG markup from
 * the ICONS lookup table (which contains only hardcoded constants).
 */
function SvgIcon({ svgString }: { svgString: string }) {
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) node.innerHTML = svgString;
    },
    [svgString],
  );
  return <div ref={ref} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} />;
}

export function SupplyMarkers() {
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const showPaczkomaty = useSupplyStore((s) => s.showPaczkomaty);
  const showShops = useSupplyStore((s) => s.showShops);
  const showWater = useSupplyStore((s) => s.showWater);
  const showCampsites = useSupplyStore((s) => s.showCampsites);
  const showRepair = useSupplyStore((s) => s.showRepair);
  const showBailOut = useSupplyStore((s) => s.showBailOut);
  const showFuel = useSupplyStore((s) => s.showFuel);
  const showFood = useSupplyStore((s) => s.showFood);
  const showPharmacy = useSupplyStore((s) => s.showPharmacy);
  const showToilets = useSupplyStore((s) => s.showToilets);
  const showHalts = useSupplyStore((s) => s.showHalts);
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

  const visible = useMemo(() => {
    const allPoints = [...supplyPoints, ...(showBailOut ? bailOutPoints : [])];

    return allPoints.filter((p) => {
      // Toggle checks by type
      if (p.type === 'paczkomat' && !showPaczkomaty) return false;
      if (['zabka', 'biedronka', 'supermarket', 'convenience', 'shop'].includes(p.type) && !showShops) return false;
      if (p.type === 'water' && !showWater) return false;
      if (['campsite', 'alpine_hut', 'basic_shelter'].includes(p.type) && !showCampsites) return false;
      if (['repair', 'compressed_air'].includes(p.type) && !showRepair) return false;
      if (['train_station', 'hospital', 'bus_stop'].includes(p.type) && !showBailOut) return false;
      if (p.type === 'fuel' && !showFuel) return false;
      if (['bakery', 'cafe', 'restaurant'].includes(p.type) && !showFood) return false;
      if (p.type === 'pharmacy' && !showPharmacy) return false;
      if (p.type === 'toilets' && !showToilets) return false;
      if (p.type === 'halt' && !showHalts) return false;

      // Filter shelters/campsites to only show near predicted night stops
      if (['campsite', 'alpine_hut', 'basic_shelter'].includes(p.type) && nightStopCoords.length > 0) {
        const nearNightStop = nightStopCoords.some(
          (ns) => distanceKm(p.lat, p.lng, ns.lat, ns.lng) <= SHELTER_RADIUS_KM
        );
        if (!nearNightStop) return false;
      }

      return true;
    });
  }, [supplyPoints, bailOutPoints, showPaczkomaty, showShops, showWater, showCampsites, showRepair, showBailOut, showFuel, showFood, showPharmacy, showToilets, showHalts, nightStopCoords]);

  return (
    <>
      {visible.map((pt) => {
        const c = SUPPLY_COLORS[pt.type] || SUPPLY_COLORS.shop;
        const svg = SUPPLY_ICONS[pt.type] || SUPPLY_ICONS.shop;
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
            >
              <SvgIcon svgString={svg} />
            </div>
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
          <div className="popup-body">
            <div className="popup-type">
              {SUPPLY_TYPE_LABELS[popupPoint.type] || popupPoint.type}
            </div>
            <strong className="popup-name">{popupPoint.name}</strong>
            {popupPoint.details?.waterType && (
              <div className="popup-detail popup-detail--water">
                {popupPoint.details.waterType.replace('_', ' ')}
              </div>
            )}
            {popupPoint.details?.campsiteType && (
              <div className="popup-detail popup-detail--campsite">
                {popupPoint.details.campsiteType.replace('_', ' ')}
                {popupPoint.details.capacity && ` · ${popupPoint.details.capacity} spots`}
              </div>
            )}
            {popupPoint.details?.repairType && (
              <div className="popup-detail popup-detail--repair">
                {popupPoint.details.repairType === 'repair_station' ? 'Self-service station' : 'Bike shop'}
                {popupPoint.details.phone && ` · ${popupPoint.details.phone}`}
              </div>
            )}
            {popupPoint.details?.hasToilet && (
              <div className="popup-detail">WC available</div>
            )}
            {popupPoint.details?.hasWater && (
              <div className="popup-detail">Water available</div>
            )}
            {popupPoint.details?.address && (
              <div className="popup-detail popup-detail--address">
                {popupPoint.details.address}
              </div>
            )}
            <div className="popup-tags">
              <span className="popup-tag popup-tag--km">
                {popupPoint.distanceFromStartKm.toFixed(1)} km
              </span>
              {popupPoint.details?.is24h && (
                <span className="popup-tag popup-tag--24h">
                  24/7
                </span>
              )}
              {popupPoint.details?.fee === false && (
                <span className="popup-tag popup-tag--free">
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
