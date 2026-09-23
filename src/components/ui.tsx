import type { ReactNode } from 'react';

/** Collapsible panel section. Native <details>, so it works without JS state. */
export function Section({ title, meta, open = true, children }: { title: string; meta?: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details className="section" open={open}>
      <summary>
        <span className="section-title">{title}</span>
        {meta && <span className="section-meta">{meta}</span>}
      </summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

export function Slider({ label, value, onChange, min, max, step = 1, unit = '' }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string;
}) {
  return (
    <label className="slider">
      <span className="slider-head"><span>{label}</span><strong>{value}{unit}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; ariaLabel: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat"><strong>{value}</strong><span>{label}</span></div>
  );
}

export function Alert({ severity, children }: { severity: 'info' | 'warning' | 'danger'; children: ReactNode }) {
  return <div className={`alert alert-${severity}`}>{children}</div>;
}
