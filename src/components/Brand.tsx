import { useId } from 'react';

/**
 * Cinevra mark: a gradient "C" aperture with a white play glyph.
 * The same geometry is used for build/icon.svg so the app icon and the
 * in-app wordmark stay visually identical.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const gradient = `cinevra-${uid}`;
  const glow = `cinevra-glow-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Cinevra logo"
      className="brand-mark"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff6b73" />
          <stop offset="52%" stopColor="#e11d2f" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#e11d2f" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#e11d2f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="#0b0b12" />
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="13"
        fill="none"
        stroke="rgba(255,255,255,.10)"
      />
      <circle cx="24" cy="24" r="17" fill={`url(#${glow})`} />
      <path
        d="M34 15.3a14 14 0 1 0 0 17.4"
        fill="none"
        stroke={`url(#${gradient})`}
        strokeWidth="5.6"
        strokeLinecap="round"
      />
      <path d="M21 17.6 32.4 24 21 30.4V17.6Z" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="wordmark">
      <span className="wordmark-main">HASEEB</span>
      <span className="wordmark-accent">FLIX</span>
      {!compact && <span className="wordmark-dot" aria-hidden="true" />}
    </span>
  );
}
