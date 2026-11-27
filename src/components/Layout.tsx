import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MobileHeader } from './MobileHeader';
import { BottomNav } from './BottomNav';
import { Toasts } from './Toasts';
import { AppIntro } from './AppIntro';
import { useApp } from '../state/AppState';
import { adsRunNatively, hideBannerAd, showBannerAd } from '../lib/ads';

/** Docks the AdMob banner above the floating navigation while ads are on. */
function NativeAdBanner() {
  const { settings } = useApp();

  useEffect(() => {
    if (!adsRunNatively() || !settings.adsEnabled) {
      void hideBannerAd();
      return undefined;
    }
    void showBannerAd();
    return () => {
      void hideBannerAd();
    };
  }, [settings.adsEnabled]);

  return null;
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useApp();
  const nativeAds = adsRunNatively() && settings.adsEnabled;
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
    <div className={`mobile-app-shell${nativeAds ? ' has-native-ads' : ''}`}>
      <main className="mobile-main-scroll" ref={scroller}>
        <div className="mobile-main-inner">
          <MobileHeader />
          <div className="page-transition" key={location.pathname}>
            <Outlet />
          </div>
        </div>
      </main>
      <BottomNav />
      <NativeAdBanner />
      <Toasts />
      <AppIntro />
    </div>
  );
}
