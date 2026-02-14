import { useState } from 'react';
import { Copy, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { ShippingPlan } from '../../types';

export function PreTripChecklist({ shipping }: { shipping: ShippingPlan }) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  if (shipping.parcels.length === 0) {
    return (
      <div className="pretip-empty">
        No Paczkomat shipments planned. Enable Paczkomat shipping in settings above.
      </div>
    );
  }

  const toggleItem = (parcelId: string, itemIdx: number) => {
    const key = `${parcelId}-${itemIdx}`;
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied');
  };

  const printChecklist = () => {
    const html = shipping.parcels
      .map(
        (p) => `
        <div style="margin-bottom:20px;page-break-inside:avoid">
          <h3>📦 ${p.targetPaczkomat.name}</h3>
          <p><strong>Address:</strong> ${p.targetPaczkomat.details?.address || 'N/A'}</p>
          <p><strong>Ship by:</strong> ${p.shipByDate} · <strong>Pickup:</strong> Day ${p.dayNumber} (${p.estimatedPickupDate})</p>
          <p><strong>Locker size:</strong> ${p.lockerSize} · <strong>Weight:</strong> ${(p.totalWeightG / 1000).toFixed(1)} kg</p>
          <ul>${p.items.map((item) => `<li>☐ ${item.name} (${item.calories} kcal, ${item.weightG}g)</li>`).join('')}</ul>
        </div>`
      )
      .join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Paczkomat Shipping Checklist</title>
      <style>body{font-family:system-ui;max-width:600px;margin:20px auto}h3{margin:0 0 8px}ul{padding-left:20px}li{margin:4px 0}</style>
      </head><body><h1>Pre-Trip Paczkomat Checklist</h1><p>${shipping.totalParcels} parcels · ${(shipping.totalShippingWeightG / 1000).toFixed(1)} kg total</p>${html}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="pretip-checklist">
      <div className="pretip-summary">
        <span>{shipping.totalParcels} parcel{shipping.totalParcels !== 1 ? 's' : ''}</span>
        <span>{(shipping.totalShippingWeightG / 1000).toFixed(1)} kg total</span>
        <button className="btn-icon" onClick={printChecklist} aria-label="Print checklist">
          <Printer size={14} />
        </button>
      </div>

      {shipping.parcels.map((parcel) => (
        <div key={parcel.id} className="parcel-card">
          <div className="parcel-header">
            <div className="parcel-target">
              <span className="parcel-badge">P</span>
              <span className="parcel-name">{parcel.targetPaczkomat.name}</span>
            </div>
            <span className="parcel-day">Day {parcel.dayNumber}</span>
          </div>

          <div className="parcel-meta">
            <span>Ship by: {parcel.shipByDate}</span>
            <span>Locker: {parcel.lockerSize}</span>
            <span>{(parcel.totalWeightG / 1000).toFixed(1)} kg</span>
          </div>

          {parcel.targetPaczkomat.details?.address && (
            <div className="parcel-address">
              <span>{parcel.targetPaczkomat.details.address}</span>
              <button
                className="btn-icon btn-copy"
                onClick={() => copyAddress(parcel.targetPaczkomat.details?.address || '')}
                aria-label="Copy address"
              >
                <Copy size={12} />
              </button>
            </div>
          )}

          <ul className="parcel-items">
            {parcel.items.map((item, idx) => {
              const key = `${parcel.id}-${idx}`;
              return (
                <li
                  key={idx}
                  className={`parcel-item ${checkedItems.has(key) ? 'checked' : ''}`}
                  onClick={() => toggleItem(parcel.id, idx)}
                >
                  <span className="parcel-check">{checkedItems.has(key) ? '✓' : ''}</span>
                  <span className="parcel-item-name">{item.name}</span>
                  <span className="parcel-item-meta">{item.calories} kcal</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
