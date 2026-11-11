import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useApp } from '../state/AppState';

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.kind}`}>
          {toast.kind === 'success' && <CheckCircle2 size={16} />}
          {toast.kind === 'error' && <XCircle size={16} />}
          {toast.kind === 'info' && <Info size={16} />}
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => dismissToast(toast.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
