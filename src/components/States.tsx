import type { ReactNode } from 'react';
import { AlertTriangle, Clapperboard, RefreshCw } from 'lucide-react';

export function EmptyState({
  title,
  message,
  icon,
  action,
}: {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="state-panel">
      <div className="state-icon">{icon || <Clapperboard size={28} />}</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-panel error">
      <div className="state-icon">
        <AlertTriangle size={26} />
      </div>
      <h3>Something went wrong</h3>
      <p>{message || 'The request could not be completed. Check your connection and try again.'}</p>
      {onRetry && (
        <button type="button" className="button glass" onClick={onRetry}>
          <RefreshCw size={15} /> Try again
        </button>
      )}
    </div>
  );
}

export function InlineLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="inline-loader">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}
