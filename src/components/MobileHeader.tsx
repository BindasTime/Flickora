import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Settings, User, WifiOff } from 'lucide-react';
import { HeaderMark } from './Brand';
import { useApp } from '../state/AppState';

export function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { offline } = useApp();
  const headerRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const isSubPage =
    location.pathname.startsWith('/title/') ||
    location.pathname === '/settings' ||
    location.pathname === '/about';

  useEffect(() => {
    const scroller = headerRef.current?.closest('.mobile-main-scroll');
    if (!scroller) return;
    const onScroll = () => setScrolled(scroller.scrollTop > 8);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`mobile-header${scrolled ? ' scrolled' : ''}`} ref={headerRef}>
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
            <HeaderMark size={28} />
            <span className="brand-title">Flickora</span>
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
              <Search size={20} />
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
