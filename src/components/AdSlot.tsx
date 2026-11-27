import { ArrowUpRight, Megaphone } from 'lucide-react';
import { AD_CONFIG } from '../config/ads';
import { hf } from '../lib/bridge';
import { adsRunNatively } from '../lib/ads';
import { useApp } from '../state/AppState';

/**
 * Inline sponsored card for the web build and desktop browsers. On Android the
 * native AdMob banner takes over, so this renders nothing there.
 */
export function AdSlot({
  placement,
  variant = 'banner',
}: {
  placement: string;
  variant?: 'banner' | 'wide';
}) {
  const { settings } = useApp();
  if (!AD_CONFIG.enabled || !settings.adsEnabled) return null;
  if (adsRunNatively()) return null;

  const { house } = AD_CONFIG;

  return (
    <aside
      className={`ad-slot ad-slot-${variant}`}
      aria-label="Advertisement"
      data-placement={placement}
    >
      <span className="ad-slot-badge">{house.label}</span>
      <span className="ad-slot-art" aria-hidden="true">
        <Megaphone size={20} />
      </span>
      <div className="ad-slot-copy">
        <strong>{house.title}</strong>
        <span>{house.body}</span>
      </div>
      <button type="button" className="ad-slot-cta" onClick={() => void hf.openExternal(house.url)}>
        {house.cta}
        <ArrowUpRight size={14} />
      </button>
    </aside>
  );
}
