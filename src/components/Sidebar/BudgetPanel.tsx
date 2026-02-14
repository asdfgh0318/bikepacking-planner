import { Wallet } from 'lucide-react';
import { useRouteStore } from '../../store/routeStore';
import { useBudgetStore } from '../../store/budgetStore';
import { useResupplyStore } from '../../store/resupplyStore';
import { RangeSlider } from '../ui';

export function BudgetPanel() {
  const daySegments = useRouteStore((s) => s.daySegments);
  const rates = useBudgetStore((s) => s.rates);
  const setRate = useBudgetStore((s) => s.setRate);
  const resupplyPlan = useResupplyStore((s) => s.unifiedPlan);

  if (daySegments.length === 0) return null;

  const numDays = daySegments.length;
  const numNights = Math.max(0, numDays - 1);
  const paidNights = daySegments.filter(
    (seg) => seg.nightStop?.type === 'campsite' && seg.nightStop.campsite?.details?.fee !== false
  ).length;
  const freeNights = numNights - paidNights;

  const foodTotal = numDays * rates.foodPerDay;
  const campingTotal = paidNights * rates.campingPerNight;
  const transportTotal = rates.transportToStart * 2; // round trip
  const numParcels = resupplyPlan?.shipping?.totalParcels ?? 0;
  const shippingTotal = numParcels * rates.paczkomatShippingPerParcel;
  const total = foodTotal + campingTotal + transportTotal + shippingTotal + rates.emergencyFund;

  return (
    <div className="panel budget-panel">
      <div className="budget-header">
        <Wallet size={16} />
        <span>Trip Budget</span>
      </div>

      <div className="budget-total">
        <span className="budget-total-amount">{total.toFixed(0)} PLN</span>
        <span className="budget-total-label">estimated total</span>
      </div>

      <div className="budget-breakdown">
        <div className="budget-row">
          <span>Food ({numDays} days × {rates.foodPerDay} PLN)</span>
          <span>{foodTotal.toFixed(0)} PLN</span>
        </div>
        <div className="budget-row">
          <span>Camping ({paidNights} paid night{paidNights !== 1 ? 's' : ''} × {rates.campingPerNight} PLN)</span>
          <span>{campingTotal.toFixed(0)} PLN</span>
        </div>
        {freeNights > 0 && (
          <div className="budget-row budget-row-free">
            <span>{freeNights} free night{freeNights !== 1 ? 's' : ''} (wild/free campsite)</span>
            <span>0 PLN</span>
          </div>
        )}
        <div className="budget-row">
          <span>Transport (round trip)</span>
          <span>{transportTotal.toFixed(0)} PLN</span>
        </div>
        {numParcels > 0 && (
          <div className="budget-row">
            <span>Shipping ({numParcels} parcel{numParcels !== 1 ? 's' : ''} × {rates.paczkomatShippingPerParcel} PLN)</span>
            <span>{shippingTotal.toFixed(0)} PLN</span>
          </div>
        )}
        <div className="budget-row">
          <span>Emergency fund</span>
          <span>{rates.emergencyFund.toFixed(0)} PLN</span>
        </div>
      </div>

      <div className="budget-sliders">
        <RangeSlider
          label="Food / day"
          value={rates.foodPerDay}
          onChange={(v) => setRate('foodPerDay', v)}
          min={20}
          max={150}
          step={5}
          unit="PLN"
        />
        <RangeSlider
          label="Camping / night"
          value={rates.campingPerNight}
          onChange={(v) => setRate('campingPerNight', v)}
          min={0}
          max={100}
          step={5}
          unit="PLN"
        />
        <RangeSlider
          label="Transport"
          value={rates.transportToStart}
          onChange={(v) => setRate('transportToStart', v)}
          min={0}
          max={300}
          step={10}
          unit="PLN"
        />
        <RangeSlider
          label="Emergency"
          value={rates.emergencyFund}
          onChange={(v) => setRate('emergencyFund', v)}
          min={0}
          max={500}
          step={25}
          unit="PLN"
        />
      </div>
    </div>
  );
}
