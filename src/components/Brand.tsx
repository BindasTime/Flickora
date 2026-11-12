import { useId } from 'react';

/**
 * Flickora mark: a cinematic midnight tile with a coral F-shaped play mark.
 * Used in the top app bar and the About screen.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const gradient = `hf-brand-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Flickora logo"
      className="brand-mark"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff795f" />
          <stop offset="100%" stopColor="#ef3f4f" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="#11131b" />
      <rect x="2.7" y="2.7" width="42.6" height="42.6" rx="13.3" fill="none" stroke="#ffffff" strokeOpacity=".1" />
      <path d="M17 13v22M18 14h16M18 23h12" stroke={`url(#${gradient})`} strokeWidth="5" strokeLinecap="round" />
      <path d="m25 27 9 5-9 5z" fill="#fff0e7" />
    </svg>
  );
}

/** Compact Flickora tile used in the top app bar. */
export function HeaderMark({ size = 28 }: { size?: number }) {
  return <BrandMark size={size} />;
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="wordmark">
      <span className="wordmark-main">FLICK</span>
      <span className="wordmark-accent">ORA</span>
      {!compact && <span className="wordmark-dot" aria-hidden="true" />}
    </span>
  );
}
