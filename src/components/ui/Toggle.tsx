interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  color?: string;
}

export function Toggle({ checked, onChange, label, color }: ToggleProps) {
  return (
    <div
      className="toggle-row"
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div className="toggle-info">
        {color && <span className="toggle-dot" style={{ background: color }} />}
        <span>{label}</span>
      </div>
      <div className={`toggle ${checked ? 'on' : ''}`}>
        <div className="toggle-thumb" />
      </div>
    </div>
  );
}
