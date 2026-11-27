import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Settings, WifiOff } from 'lucide-react';
import { HeaderMark } from './Brand';
import { useApp } from '../state/AppState';

export function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { offline } = useApp();
  const headerRef = useRef<HTMLElement | null>(null);
  const lastScrollY = useRef(0);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  const isSubPage =
    location.pathname.startsWith('/title/') ||
    location.pathname === '/settings' ||
    location.pathname === '/about';

  useEffect(() => {
    const scroller = headerRef.current?.closest('.mobile-main-scroll');
    if (!scroller) return;
    lastScrollY.current = scroller.scrollTop;
    const onScroll = () => {
      const y = scroller.scrollTop;
      const delta = y - lastScrollY.current;
      setScrolled(y > 8);

      // Hide only after a deliberate downward gesture; reveal immediately on
      // any upward gesture, at the top, or when the route changes below.
      if (y < 56) setHidden(false);
      else if (y > 120 && delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);

      if (Math.abs(delta) > 6 || y < 56) lastScrollY.current = y;
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    lastScrollY.current = 0;
    setHidden(false);
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('topbar-hidden', hidden);
    return () => root.classList.remove('topbar-hidden');
  }, [hidden]);

  return (
    <header
      className={`mobile-header${scrolled ? ' scrolled' : ''}${hidden ? ' is-hidden' : ''}`}
      ref={headerRef}
      onFocusCapture={() => setHidden(false)}
    >
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
          <button
            type="button"
            className="mobile-brand-wrap"
            onClick={() => navigate('/')}
            aria-label="Flickora home"
          >
            <HeaderMark size={44} />
          </button>
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
              aria-label="Settings"
            >
              <div className="mobile-avatar-inner">
                <Settings size={19} />
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
