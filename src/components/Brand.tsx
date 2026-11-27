/** Served from Vite's public dir, so it keeps the correct base in web,
 * Capacitor and packaged desktop builds. */
const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

/**
 * Flickora mark — the updated logo supplied in assets/. Used in the top app
 * bar, the About screen and the ad pre-roll.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src={LOGO_URL}
      width={size}
      height={size}
      alt="Flickora logo"
      className="brand-mark"
      draggable={false}
    />
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
