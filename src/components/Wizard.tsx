import { useState, useEffect } from 'react';
import { useRouteStore } from '../store/routeStore';
import { useResupplyStore } from '../store/resupplyStore';
import { useSupplyStore } from '../store/supplyStore';
import { MapPin, Calendar, CheckCircle, ChevronRight, X } from 'lucide-react';
import { RangeSlider } from './ui';

const WIZARD_KEY = 'bikepacking-wizard-complete';

export function Wizard() {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(WIZARD_KEY) === 'true'
  );
  const [localDailyKm, setLocalDailyKm] = useState(80);

  const waypoints = useRouteStore((s) => s.waypoints);
  const routeStats = useRouteStore((s) => s.routeStats);
  const daySegments = useRouteStore((s) => s.daySegments);
  const setDailyTargetKm = useRouteStore((s) => s.setDailyTargetKm);

  const resupplyConfig = useResupplyStore((s) => s.resupplyConfig);
  const setResupplyConfig = useResupplyStore((s) => s.setResupplyConfig);

  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const supplyGaps = useSupplyStore((s) => s.supplyGaps);
  const waterGaps = useSupplyStore((s) => s.waterGaps);

  // Auto-advance step 0 when user has 2+ waypoints
  useEffect(() => {
    if (step === 0 && waypoints.length >= 2) {
      setStep(1);
    }
  }, [waypoints.length, step]);

  function dismiss() {
    localStorage.setItem(WIZARD_KEY, 'true');
    setDismissed(true);
  }

  function handleStep1Next() {
    setDailyTargetKm(localDailyKm);
    setStep(2);
  }

  if (dismissed) return null;

  const shopCount = supplyPoints.filter(
    (p) => p.type === 'shop' || p.type === 'zabka' || p.type === 'biedronka'
  ).length;
  const waterCount = supplyPoints.filter((p) => p.type === 'water').length;
  const totalGaps = supplyGaps.length + waterGaps.length;

  return (
    <div
      className={`wizard-overlay ${step === 0 ? 'wizard-overlay--sidebar' : ''}`}
      onClick={(e) => {
        // Allow map clicks to pass through in step 0
        if (step === 0 && e.target === e.currentTarget) return;
      }}
    >
      <button
        className="wizard-skip"
        onClick={dismiss}
        aria-label="Skip wizard"
      >
        <X size={20} />
      </button>

      <div className="wizard-card">
        {/* Step indicator */}
        <div className="wizard-step-indicator">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`wizard-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            />
          ))}
        </div>

        {step === 0 && (
          <>
            <div className="wizard-icon wizard-icon--pulse">
              <MapPin size={48} strokeWidth={1.5} />
            </div>
            <h2 className="wizard-title">Click on the map to set your route</h2>
            <p className="wizard-text">
              Add your start and end points by clicking on the map.
            </p>
            <p className="wizard-text">
              You can add intermediate waypoints too.
            </p>
            <p className="wizard-text wizard-text--hint">
              Or import a GPX file from the Route tab.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <div className="wizard-icon">
              <Calendar size={48} strokeWidth={1.5} />
            </div>
            <h2 className="wizard-title">When are you starting?</h2>
            <p className="wizard-text">
              Set your trip date and daily distance target.
            </p>

            <div className="wizard-field">
              <label className="wizard-field-label" htmlFor="wizard-start-date">
                Trip start date
              </label>
              <input
                id="wizard-start-date"
                type="date"
                className="wizard-date-input"
                value={resupplyConfig.tripStartDate}
                onChange={(e) =>
                  setResupplyConfig('tripStartDate', e.target.value)
                }
              />
            </div>

            <div className="wizard-field">
              <RangeSlider
                label="Daily distance target"
                value={localDailyKm}
                onChange={setLocalDailyKm}
                min={40}
                max={150}
                step={5}
                unit="km"
                minLabel="40 km (relaxed)"
                maxLabel="150 km (fast)"
              />
            </div>

            <button className="btn btn-primary wizard-btn" onClick={handleStep1Next}>
              Next <ChevronRight size={16} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="wizard-icon wizard-icon--success">
              <CheckCircle size={48} strokeWidth={1.5} />
            </div>
            <h2 className="wizard-title">Your route is ready!</h2>

            <div className="wizard-stats-grid">
              <div className="wizard-stat">
                <span className="wizard-stat-value">
                  {routeStats ? Math.round(routeStats.distanceKm) : '—'}
                </span>
                <span className="wizard-stat-label">km</span>
              </div>
              <div className="wizard-stat">
                <span className="wizard-stat-value">
                  {daySegments.length || '—'}
                </span>
                <span className="wizard-stat-label">days</span>
              </div>
              <div className="wizard-stat">
                <span className="wizard-stat-value">
                  {routeStats ? Math.round(routeStats.ascentM) : '—'}
                </span>
                <span className="wizard-stat-label">m ascent</span>
              </div>
              <div className="wizard-stat">
                <span className="wizard-stat-value">{shopCount}</span>
                <span className="wizard-stat-label">shops</span>
              </div>
              <div className="wizard-stat">
                <span className="wizard-stat-value">{waterCount}</span>
                <span className="wizard-stat-label">water</span>
              </div>
              <div className="wizard-stat">
                <span className="wizard-stat-value">{totalGaps}</span>
                <span className="wizard-stat-label">gaps</span>
              </div>
            </div>

            {totalGaps > 0 && (
              <div className="wizard-warning">
                {totalGaps} supply gap{totalGaps !== 1 ? 's' : ''} detected —
                check the Supply tab
              </div>
            )}

            <button className="btn btn-primary wizard-btn" onClick={dismiss}>
              Start Planning <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
