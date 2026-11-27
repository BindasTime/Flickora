import type { ReactNode } from 'react';

/**
 * Hand-drawn SVG navigation icons. They inherit `currentColor`, so the active
 * tab and the liquid-glass theme can tint them without extra markup.
 */
type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

function Svg({
  size = 22,
  className,
  strokeWidth = 1.9,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function NavHomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.3 10.6 12 3.6l8.7 7" />
      <path d="M5.8 9.4v9.1a1.7 1.7 0 0 0 1.7 1.7h8.9a1.7 1.7 0 0 0 1.7-1.7V9.4" />
      <path d="M9.6 20.2v-5.1a2.4 2.4 0 0 1 4.8 0v5.1" />
    </Svg>
  );
}

export function NavExploreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.7" />
      <path d="m15.4 8.6-2.1 4.7-4.7 2.1 2.1-4.7z" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function NavTvIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.7" y="5" width="18.6" height="12.3" rx="2.7" />
      <path d="M8.4 20.4h7.2M12 17.3v3.1" />
      <path d="m10.3 9.1 3.4 2-3.4 2z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function NavSearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.6" cy="10.6" r="6.6" />
      <path d="m15.5 15.5 4.3 4.3" />
      <path d="M8.2 10.6h4.8M10.6 8.2v4.8" opacity=".55" />
    </Svg>
  );
}

export function NavListIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 7.25 8.4 5l3.4 2.25L8.4 9.5z" />
      <path d="M5 12 8.4 9.75 11.8 12 8.4 14.25z" />
      <path d="M5 16.75 8.4 14.5l3.4 2.25L8.4 19z" />
      <path d="M13.8 6.6h5.3M13.8 11.35h5.3M13.8 16.1h5.3" />
    </Svg>
  );
}

export function NavSettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.1 2.8h3.8l.5 2.3c.7.2 1.3.5 1.9.9l2.2-1 2.6 2.7-1 2.2c.4.6.7 1.2.9 1.9l2.3.5v3.8l-2.3.5c-.2.7-.5 1.3-.9 1.9l1 2.2-2.6 2.7-2.2-1c-.6.4-1.2.7-1.9.9l-.5 2.3h-3.8l-.5-2.3c-.7-.2-1.3-.5-1.9-.9l-2.2 1-2.6-2.7 1-2.2c-.4-.6-.7-1.2-.9-1.9l-2.3-.5v-3.8l2.3-.5c.2-.7.5-1.3.9-1.9l-1-2.2 2.6-2.7 2.2 1c.6-.4 1.2-.7 1.9-.9z" />
      <circle cx="12" cy="12" r="3.1" />
    </Svg>
  );
}
