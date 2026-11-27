import { useEffect, useState } from 'react';
import { useApp } from '../state/AppState';

/**
 * Animated brand hand-off between the Android system splash and the app UI.
 * Uses the same updated logo as the header, so the startup mark can never
 * drift out of sync with the rest of the app.
 */
export function AppIntro() {
  const { ready, settings } = useApp();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!ready) return undefined;
    const duration = settings.reduceMotion ? 420 : 1650;
    const timer = window.setTimeout(() => setDone(true), duration);
    return () => window.clearTimeout(timer);
  }, [ready, settings.reduceMotion]);

  if (done) return null;

  return (
    <div className={`app-intro${settings.reduceMotion ? ' reduced' : ''}`} aria-hidden="true">
      <div className="app-intro-glow" />
      <div className="app-intro-ring" />
      <div className="app-intro-ring delay" />
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="app-intro-logo" />
      <span className="app-intro-caption">FLICKORA</span>
      <div className="app-intro-bar">
        <span />
      </div>
    </div>
  );
}
