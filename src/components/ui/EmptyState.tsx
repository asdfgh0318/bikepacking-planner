import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
  hint?: string;
}

export function EmptyState({ icon, message, hint }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon}
      <p>{message}</p>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
