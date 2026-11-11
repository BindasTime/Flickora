import { useId } from 'react';

/**
 * Cinevra mark: a gradient "C" aperture with a white play glyph.
 * The same geometry is used for build/icon.svg so the app icon and the
 * in-app wordmark stay visually identical.
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
      aria-label="HaseebFlix logo"
      className="brand-mark"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF416C" />
          <stop offset="50%" stopColor="#E50914" />
          <stop offset="100%" stopColor="#CBA6FF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="#1C1B22" stroke="#49454F" strokeWidth="1.5" />
      <path
        d="M19 14.5 C19 13.2 20.4 12.4 21.5 13.1 L33.2 21.6 C34.2 22.3 34.2 23.7 33.2 24.4 L21.5 32.9 C20.4 33.6 19 32.8 19 31.5 Z"
        fill={`url(#${gradient})`}
      />
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
