interface RangeSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  minLabel?: string;
  maxLabel?: string;
}

export function RangeSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  minLabel,
  maxLabel,
}: RangeSliderProps) {
  return (
    <div className="setting-card">
      <div className="setting-header">
        <span>{label}</span>
        <span className="setting-value">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-input"
        aria-label={label}
      />
      <div className="range-labels">
        <span>{minLabel ?? `${min} ${unit}`}</span>
        <span>{maxLabel ?? `${max} ${unit}`}</span>
      </div>
    </div>
  );
}
