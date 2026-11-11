import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MobileHeader } from './MobileHeader';
import { BottomNav } from './BottomNav';
import { Toasts } from './Toasts';

export function Layout() {
  const location = useLocation();
  const scroller = useRef<HTMLElement | null>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="mobile-app-shell">
      <MobileHeader />
      <main className="mobile-main-scroll" ref={scroller}>
        <div className="mobile-main-inner">
          <Outlet />
        </div>
      </main>
      <BottomNav />
      <Toasts />
    </div>
  );
}
