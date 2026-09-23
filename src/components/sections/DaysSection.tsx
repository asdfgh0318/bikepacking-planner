import { useRouteStore } from '../../store/routeStore';
import { useTripStore } from '../../store/tripStore';
import { tripDayDate, formatShortDate, weekday } from '../../utils/date';
import { isTradingSunday } from '../../data/sundayTrading';
import { Section, Slider } from '../ui';

function hours(h: number) {
  return `${Math.floor(h)}h${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
}

/** Sunday status for a trip day: null on weekdays. */
function sundayNote(iso: string | null): { text: string; bad: boolean } | null {
  if (!iso || weekday(iso) !== 0) return null;
  return isTradingSunday(iso)
    ? { text: 'trading Sunday', bad: false }
    : { text: 'non-trading Sunday: Biedronka, Lidl and other chains closed', bad: true };
}

export function DaysSection() {
  const daySegments = useRouteStore((s) => s.daySegments);
  const dailyTargetKm = useRouteStore((s) => s.dailyTargetKm);
  const setDailyTargetKm = useRouteStore((s) => s.setDailyTargetKm);
  const tripStartDate = useTripStore((s) => s.tripStartDate);
  const setTripStartDate = useTripStore((s) => s.setTripStartDate);

  if (daySegments.length === 0) return null;

  return (
    <Section title="Days" meta={`${daySegments.length}`}>
      <label className="field">
        <span>Trip starts</span>
        <input type="date" value={tripStartDate} onChange={(e) => setTripStartDate(e.target.value)} />
      </label>
      <Slider label="Daily target" value={dailyTargetKm} onChange={setDailyTargetKm} min={30} max={150} step={5} unit=" km" />

      <ol className="list">
        {daySegments.map((seg) => {
          const iso = tripDayDate(tripStartDate, seg.dayNumber);
          const sunday = sundayNote(iso);
          return (
            <li key={seg.dayNumber} className="item day">
              <span className={`badge badge-${seg.difficulty}`}>D{seg.dayNumber}</span>
              <div className="grow">
                <div className="row">
                  <strong>{seg.distanceKm.toFixed(0)} km</strong>
                  <span>{hours(seg.estimatedHours)}</span>
                  <span className="note">+{seg.ascentM.toFixed(0)} / −{seg.descentM.toFixed(0)} m</span>
                  {iso && <span className="note">{formatShortDate(iso)}</span>}
                </div>
                <div className="row note">
                  <span>{seg.supplyStops.length > 0 ? `${seg.supplyStops.length} supply stop${seg.supplyStops.length > 1 ? 's' : ''}` : 'no supply stops'}</span>
                  <span>· {seg.nightStop?.type === 'campsite' ? (seg.nightStop.campsite?.name ?? 'campsite') : 'wild camp'}</span>
                </div>
                {sunday && <span className={`tag ${sunday.bad ? 'tag-bad' : 'tag-good'}`}>{sunday.text}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
