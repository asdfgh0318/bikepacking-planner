import { ShoppingCart, Zap, Cloud } from 'lucide-react';
import { toast } from 'sonner';
import { useRouteStore } from '../../store/routeStore';
import { useSupplyStore } from '../../store/supplyStore';
import { useDietStore } from '../../store/dietStore';
import { useResupplyStore } from '../../store/resupplyStore';
import { DIET_PROFILES } from '../../services/diet';
import { RESUPPLY_PRESETS } from '../../services/resupplyPlanner';
import type { ResupplyStrategyId } from '../../types';
import { generateUnifiedPlan } from '../../services/unifiedPlan';
import { debugLog } from '../../utils/debugLogger';
import { weatherEmoji } from '../../services/weather';
import { RangeSlider, Toggle, StatCard, EmptyState } from '../ui';
import { ShoppingTimeline } from './ShoppingTimeline';
import { PreTripChecklist } from './PreTripChecklist';
import { OnRouteShoppingLists } from './OnRouteShoppingLists';
import { CarryWeightGraph } from './CarryWeightGraph';

const STRATEGY_OPTIONS: { id: ResupplyStrategyId; emoji: string }[] = [
  { id: 'daily-ration', emoji: '📦' },
  { id: 'grazer', emoji: '🍪' },
  { id: 'ultralight', emoji: '🪶' },
  { id: 'self-sufficient', emoji: '🎒' },
];

const VIEW_TABS = [
  { key: 'timeline' as const, label: 'Timeline' },
  { key: 'checklist' as const, label: 'Pre-trip' },
  { key: 'shopping' as const, label: 'Lists' },
  { key: 'weight' as const, label: 'Weight' },
];

export function ResupplyPanel() {
  const daySegments = useRouteStore((s) => s.daySegments);
  const supplyPoints = useSupplyStore((s) => s.supplyPoints);
  const supplyGaps = useSupplyStore((s) => s.supplyGaps);
  const selectedDiet = useDietStore((s) => s.selectedDiet);

  const enablePaczkomat = useResupplyStore((s) => s.enablePaczkomatShipping);
  const setEnablePaczkomat = useResupplyStore((s) => s.setEnablePaczkomatShipping);
  const paczkomatConfig = useResupplyStore((s) => s.paczkomatConfig);
  const setPaczkomatConfig = useResupplyStore((s) => s.setPaczkomatConfig);
  const resupplyConfig = useResupplyStore((s) => s.resupplyConfig);
  const setResupplyConfig = useResupplyStore((s) => s.setResupplyConfig);
  const tripContext = useResupplyStore((s) => s.tripContext);
  const strategyId = useResupplyStore((s) => s.strategyId);
  const strategy = useResupplyStore((s) => s.strategy);
  const setStrategyId = useResupplyStore((s) => s.setStrategyId);
  const setStrategyParam = useResupplyStore((s) => s.setStrategyParam);
  const unifiedPlan = useResupplyStore((s) => s.unifiedPlan);
  const setUnifiedPlan = useResupplyStore((s) => s.setUnifiedPlan);
  const isPlanning = useResupplyStore((s) => s.isPlanning);
  const setIsPlanning = useResupplyStore((s) => s.setIsPlanning);
  const activeView = useResupplyStore((s) => s.activeView);
  const setActiveView = useResupplyStore((s) => s.setActiveView);
  const routeWeather = useResupplyStore((s) => s.routeWeather);
  const isLoadingWeather = useResupplyStore((s) => s.isLoadingWeather);

  if (daySegments.length === 0) {
    return (
      <div className="panel">
        <EmptyState
          icon={<ShoppingCart size={40} strokeWidth={1.5} color="#fbbf24" opacity={0.6} />}
          message="No trip plan yet"
          hint="Create a route with at least 2 waypoints"
        />
      </div>
    );
  }

  const handleGenerate = () => {
    setIsPlanning(true);
    debugLog.info('resupply', 'generate:start', {
      strategyId,
      strategy: strategy.label,
      dayCount: daySegments.length,
      supplyPointCount: supplyPoints.length,
      supplyGapCount: supplyGaps.length,
      diet: selectedDiet,
      paczkomat: enablePaczkomat,
      rideStartHour: resupplyConfig.rideStartHour,
      avgSpeedKmh: resupplyConfig.avgSpeedKmh,
    });
    try {
      const profile = DIET_PROFILES[selectedDiet];
      const plan = generateUnifiedPlan(
        profile,
        daySegments,
        supplyPoints,
        supplyGaps,
        enablePaczkomat ? paczkomatConfig : null,
        { ...resupplyConfig, strategy, tripStartDate: resupplyConfig.tripStartDate, tripContext }
      );
      setUnifiedPlan(plan);
      debugLog.info('resupply', 'generate:success', {
        purchases: plan.resupply.purchases.length,
        totalCalories: plan.resupply.totalCalories,
        maxCarryWeightG: plan.resupply.maxCarryWeightG,
        warnings: plan.resupply.warnings.length,
        parcels: plan.shipping?.totalParcels ?? 0,
        dayBreakdowns: plan.dayBreakdown.length,
      });
      if (plan.resupply.warnings.length > 0) {
        for (const w of plan.resupply.warnings) {
          debugLog.warn('resupply', `warning:${w.type}`, w.message);
        }
      }
      toast.success('Smart resupply plan generated');
    } catch (err) {
      debugLog.error('resupply', 'generate:fail', err instanceof Error ? err.message : String(err));
      toast.error('Failed to generate resupply plan');
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div className="panel">
      {/* Strategy presets */}
      <div className="strategy-presets">
        <div className="strategy-label">Resupply Strategy</div>
        <div className="strategy-grid">
          {STRATEGY_OPTIONS.map(({ id, emoji }) => {
            const preset = RESUPPLY_PRESETS[id];
            return (
              <button
                key={id}
                className={`strategy-card ${strategyId === id ? 'active' : ''}`}
                onClick={() => setStrategyId(id)}
                title={preset.description}
              >
                <span className="strategy-emoji">{emoji}</span>
                <span className="strategy-name">{preset.label}</span>
              </button>
            );
          })}
        </div>
        <div className="strategy-desc">{strategy.description}</div>
      </div>

      {/* Custom strategy params */}
      {strategyId === 'custom' && (
        <div className="strategy-custom">
          <RangeSlider
            label="Max stops/day"
            value={strategy.maxStopsPerDay}
            onChange={(v) => setStrategyParam('maxStopsPerDay', v)}
            min={1}
            max={5}
            step={1}
          />
          <RangeSlider
            label="Buffer days"
            value={strategy.carryBufferDays}
            onChange={(v) => setStrategyParam('carryBufferDays', v)}
            min={0}
            max={3}
            step={1}
            unit="days"
          />
          <RangeSlider
            label="Min reserve"
            value={strategy.minCalorieReserve}
            onChange={(v) => setStrategyParam('minCalorieReserve', v)}
            min={0}
            max={2000}
            step={100}
            unit="kcal"
          />
          <Toggle
            checked={strategy.preferEarlyStop}
            onChange={(v) => setStrategyParam('preferEarlyStop', v)}
            label="Prefer early stop"
            color="#fbbf24"
          />
        </div>
      )}

      {/* Config */}
      <div className="resupply-config">
        <div className="config-row">
          <label className="config-label">Trip start date</label>
          <input
            type="date"
            className="config-date"
            value={resupplyConfig.tripStartDate}
            onChange={(e) => setResupplyConfig('tripStartDate', e.target.value)}
          />
        </div>
        <RangeSlider
          label="Ride start"
          value={resupplyConfig.rideStartHour}
          onChange={(v) => setResupplyConfig('rideStartHour', v)}
          min={5}
          max={10}
          step={1}
          unit=":00"
        />
        <RangeSlider
          label="Avg speed"
          value={resupplyConfig.avgSpeedKmh}
          onChange={(v) => setResupplyConfig('avgSpeedKmh', v)}
          min={10}
          max={25}
          step={1}
          unit="km/h"
        />

        <Toggle
          checked={enablePaczkomat}
          onChange={setEnablePaczkomat}
          label="Paczkomat pre-shipping"
          color="#fbbf24"
        />

        {enablePaczkomat && (
          <div className="paczkomat-config">
            <RangeSlider
              label="Ship every"
              value={paczkomatConfig.intervalDays}
              onChange={(v) => setPaczkomatConfig('intervalDays', v)}
              min={1}
              max={5}
              step={1}
              unit="days"
            />
            <Toggle
              checked={paczkomatConfig.prefer24h}
              onChange={(v) => setPaczkomatConfig('prefer24h', v)}
              label="Prefer 24/7 lockers"
              color="#fbbf24"
            />
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        className="btn btn-generate"
        onClick={handleGenerate}
        disabled={isPlanning}
      >
        {isPlanning ? (
          <>
            <div className="spinner" />
            Generating...
          </>
        ) : (
          <>
            <Zap size={14} />
            Generate Smart Plan
          </>
        )}
      </button>

      {/* Weather Forecast Bar */}
      {isLoadingWeather && (
        <div className="weather-bar loading">
          <Cloud size={14} />
          <span>Loading weather forecast...</span>
        </div>
      )}
      {routeWeather && routeWeather.forecastAvailable && routeWeather.days.some(d => d.weatherCode !== -1) && (
        <div className="weather-bar">
          <div className="weather-bar-header">
            <Cloud size={12} />
            <span>Weather Forecast</span>
          </div>
          <div className="weather-bar-days">
            {routeWeather.days.filter(d => d.weatherCode !== -1).map((d) => (
              <div key={d.dayNumber} className="weather-day-chip" title={`Day ${d.dayNumber}: ${d.condition}, ${d.precipitationSum.toFixed(0)}mm rain, wind ${d.windSpeedMax.toFixed(0)}km/h`}>
                <span className="weather-day-num">D{d.dayNumber}</span>
                <span className="weather-day-icon">{weatherEmoji(d.condition)}</span>
                <span className="weather-day-temp">{d.tempMin.toFixed(0)}°/{d.tempMax.toFixed(0)}°</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {routeWeather && (routeWeather.forecastAvailable === false || routeWeather.days.every(d => d.weatherCode === -1)) && (
        <div className="weather-bar no-data">
          <Cloud size={12} />
          <span>Weather forecasts are available for trips starting within 16 days</span>
        </div>
      )}

      {/* Results */}
      {unifiedPlan && (
        <>
          {/* Summary stats */}
          <div className="stats-grid" style={{ marginTop: 12 }}>
            <StatCard value={unifiedPlan.resupply.purchases.length} label="stops" />
            <StatCard value={unifiedPlan.resupply.totalCalories.toFixed(0)} label="kcal" />
            <StatCard
              value={(unifiedPlan.resupply.maxCarryWeightG / 1000).toFixed(1)}
              label="kg max"
            />
            {unifiedPlan.shipping && unifiedPlan.shipping.totalParcels > 0 && (
              <StatCard value={unifiedPlan.shipping.totalParcels} label="parcels" />
            )}
          </div>

          {/* View tabs */}
          <div className="resupply-tabs">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`resupply-tab ${activeView === tab.key ? 'active' : ''}`}
                onClick={() => setActiveView(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active view */}
          <div className="resupply-view">
            {activeView === 'timeline' && <ShoppingTimeline plan={unifiedPlan} />}
            {activeView === 'checklist' && unifiedPlan.shipping && (
              <PreTripChecklist shipping={unifiedPlan.shipping} />
            )}
            {activeView === 'checklist' && !unifiedPlan.shipping && (
              <div className="resupply-note">Enable Paczkomat shipping to see the pre-trip checklist</div>
            )}
            {activeView === 'shopping' && <OnRouteShoppingLists plan={unifiedPlan} />}
            {activeView === 'weight' && <CarryWeightGraph plan={unifiedPlan} />}
          </div>
        </>
      )}
    </div>
  );
}
