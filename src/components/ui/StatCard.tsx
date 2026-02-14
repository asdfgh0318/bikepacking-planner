interface StatCardProps {
  value: string | number;
  label: string;
  variant?: 'default' | 'up' | 'down';
}

export function StatCard({ value, label, variant = 'default' }: StatCardProps) {
  return (
    <div className="stat-card">
      <span className={`stat-value ${variant !== 'default' ? variant : ''}`}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
