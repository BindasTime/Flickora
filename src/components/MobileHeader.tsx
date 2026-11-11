import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Search, Settings, User, WifiOff } from 'lucide-react';
import { BrandMark } from './Brand';
import { useApp } from '../state/AppState';

export function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { offline, wishlist } = useApp();

  const isSubPage =
    location.pathname.startsWith('/title/') ||
    location.pathname === '/settings' ||
    location.pathname === '/about';

  return (
    <header className="mobile-header">
      <div className="mobile-header-left">
        {isSubPage ? (
          <div className="mobile-subpage-header">
            <button
              type="button"
              className="mobile-back-btn"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              aria-label="Back"
            >
              <ArrowLeft size={22} />
            </button>
            <span className="mobile-subpage-title">
              {location.pathname === '/settings'
                ? 'Settings'
                : location.pathname === '/about'
                ? 'About'
                : 'Details'}
            </span>
          </div>
        ) : (
          <div className="mobile-brand-wrap" onClick={() => navigate('/')}>
            <BrandMark size={32} />
            <div className="mobile-brand-copy">
              <span className="brand-title">HaseebFlix</span>
              <span className="brand-subtitle">OTT Platform</span>
            </div>
          </div>
        )}
      </div>

      <div className="mobile-header-right">
        {offline && (
          <span className="mobile-offline-pill" title="Offline mode">
            <WifiOff size={13} />
          </span>
        )}
        {!isSubPage ? (
          <>
            <button
              type="button"
              className="mobile-icon-btn"
              onClick={() => navigate('/search')}
              aria-label="Search"
            >
              <Search size={19} />
            </button>
            <button
              type="button"
              className="mobile-icon-btn notif-btn"
              onClick={() => navigate('/wishlist')}
              aria-label="My List"
            >
              <Bell size={19} />
              {wishlist.length > 0 && <span className="notif-dot" />}
            </button>
            <button
              type="button"
              className="mobile-avatar-btn"
              onClick={() => navigate('/settings')}
              aria-label="Profile"
            >
              <div className="mobile-avatar-inner">
                <User size={17} />
              </div>
            </button>
          </>
        ) : (
          location.pathname !== '/settings' && (
            <button
              type="button"
              className="mobile-icon-btn"
              onClick={() => navigate('/settings')}
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
          )
        )}
      </div>
    </header>
  );
}
