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
  const scrolledRef = useRef(false);
  const hiddenRef = useRef(false);
  const frame = useRef(0);
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
    const update = () => {
      frame.current = 0;
      const y = scroller.scrollTop;
      const delta = y - lastScrollY.current;

      const nextScrolled = y > 8;
      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }

      // Hide only after a deliberate downward gesture; reveal immediately on
      // any upward gesture, at the top, or when the route changes below.
      let nextHidden = hiddenRef.current;
      if (y < 56) nextHidden = false;
      else if (y > 120 && delta > 6) nextHidden = true;
      else if (delta < -6) nextHidden = false;
      if (nextHidden !== hiddenRef.current) {
        hiddenRef.current = nextHidden;
        setHidden(nextHidden);
      }

      if (Math.abs(delta) > 6 || y < 56) lastScrollY.current = y;
    };
    // One state update per painted frame keeps the sticky glass layers from
    // being re-laid out on every native scroll tick.
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(update);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, []);

  useEffect(() => {
    lastScrollY.current = 0;
    hiddenRef.current = false;
    setHidden(false);
  }, [location.pathname]);

  return (
    <header
      className={`mobile-header${scrolled ? ' scrolled' : ''}${hidden ? ' is-hidden' : ''}`}
      ref={headerRef}
      onFocusCapture={() => {
        hiddenRef.current = false;
        setHidden(false);
      }}
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
