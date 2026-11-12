import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MobileHeader } from './MobileHeader';
import { BottomNav } from './BottomNav';
import { Toasts } from './Toasts';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const scroller = useRef<HTMLElement | null>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    const onAndroidBack = () => {
      if (location.pathname.startsWith('/watch/')) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      } else if (location.pathname !== '/') {
        navigate(-1);
      }
      // At the home route, consume back instead of letting Android close the app.
    };
    window.addEventListener('hf:android-back', onAndroidBack);
    return () => window.removeEventListener('hf:android-back', onAndroidBack);
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname !== '/') return;
    const keepHomeInHistory = () => window.history.pushState({ haseebflixHome: true }, '', window.location.href);
    if (!window.history.state?.haseebflixHome) keepHomeInHistory();
    window.addEventListener('popstate', keepHomeInHistory);
    return () => window.removeEventListener('popstate', keepHomeInHistory);
  }, [location.pathname]);

  return (
    <div className="mobile-app-shell">
      <main className="mobile-main-scroll" ref={scroller}>
        <div className="mobile-main-inner">
          <MobileHeader />
          <Outlet />
        </div>
      </main>
      <BottomNav />
      <Toasts />
    </div>
  );
}
