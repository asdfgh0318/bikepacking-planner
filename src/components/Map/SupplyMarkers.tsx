import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useSupplyStore } from '../../store/supplyStore';
import type { SupplyPoint } from '../../types';

const paczkomatIcon = L.divIcon({
  className: 'supply-marker',
  html: '<div class="supply-icon paczkomat">P</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const shopIcon = L.divIcon({
  className: 'supply-marker',
  html: '<div class="supply-icon shop">S</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function getIcon(type: SupplyPoint['type']) {
  return type === 'paczkomat' ? paczkomatIcon : shopIcon;
}

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
          <Popup>
            <strong>{pt.name}</strong>
            <br />
            <span style={{ textTransform: 'capitalize' }}>{pt.type}</span>
            {pt.details?.address && (
              <>
                <br />
                {pt.details.address}
              </>
            )}
            {pt.details?.is24h && (
              <>
                <br />
                24/7
              </>
            )}
            <br />
            <small>{pt.distanceFromStartKm.toFixed(1)} km from start</small>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
