import { useEffect, useState } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import { AD_CONFIG } from '../config/ads';
import { hf } from '../lib/bridge';
import { HeaderMark } from './Brand';

const SKIP_AFTER_SECONDS = 5;

/**
 * Pre-roll shown before the embedded player starts in a browser, where native
 * AdMob interstitials cannot run. On Android the SDK fills this role.
 */
export function AdPreroll({ onClose }: { onClose: () => void }) {
  const [left, setLeft] = useState(SKIP_AFTER_SECONDS);
  const { house } = AD_CONFIG;

  useEffect(() => {
    if (left <= 0) return undefined;
    const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);

  return (
    <div className="ad-preroll" role="dialog" aria-modal="true" aria-label="Advertisement">
      <div className="ad-preroll-glow" aria-hidden="true" />
      <div className="ad-preroll-card">
        <div className="ad-preroll-top">
          <span className="ad-preroll-badge">{house.label}</span>
          <span className="ad-preroll-brand">
            <HeaderMark size={20} /> Flickora
          </span>
        </div>

        <div className="ad-preroll-art" aria-hidden="true">
          <Play size={30} fill="currentColor" strokeWidth={0} />
        </div>

        <h2>{house.title}</h2>
        <p>{house.body}</p>

        <div className="ad-preroll-bar" aria-hidden="true">
          <span style={{ width: `${((SKIP_AFTER_SECONDS - left) / SKIP_AFTER_SECONDS) * 100}%` }} />
        </div>

        <div className="ad-preroll-actions">
          <button
            type="button"
            className="button glass small"
            onClick={() => void hf.openExternal(house.url)}
          >
            {house.cta}
            <ArrowUpRight size={14} />
          </button>
          <button
            type="button"
            className="button primary small"
            disabled={left > 0}
            onClick={onClose}
          >
            {left > 0 ? `Skip in ${left}s` : 'Skip ad'}
          </button>
        </div>
      </div>
    </div>
  );
}
