import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, WifiOff } from 'lucide-react';
import { BrandMark, Wordmark } from './Brand';
import { useApp } from '../state/AppState';

export function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { offline } = useApp();

  const isSubPage =
    location.pathname.startsWith('/title/') ||
    location.pathname === '/settings' ||
    location.pathname === '/about';

  return (
    <header className="mobile-header">
      <div className="mobile-header-left">
        {isSubPage ? (
          <button
            type="button"
            className="mobile-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
        ) : (
          <div className="mobile-brand-wrap" onClick={() => navigate('/')}>
            <BrandMark size={26} />
            <Wordmark compact />
          </div>
        )}
      </div>

      <div className="mobile-header-right">
        {offline && (
          <span className="mobile-offline-pill" title="Offline mode">
            <WifiOff size={13} />
          </span>
        )}
        {location.pathname !== '/settings' && (
          <button
            type="button"
            className="mobile-icon-btn"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
