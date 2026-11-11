import { NavLink, useLocation } from 'react-router-dom';
import {
  Clapperboard,
  Compass,
  Film,
  Heart,
  Info,
  Languages,
  MapPin,
  Settings,
  Tv,
} from 'lucide-react';
import { useApp } from '../state/AppState';

const nav: {
  to: string;
  label: string;
  icon: typeof Compass;
  end?: boolean;
  match?: 'movies' | 'dual-audio' | 'south-hindi';
}[] = [
  { to: '/', label: 'Home', icon: Compass, end: true },
  { to: '/movies', label: 'Movies', icon: Film, match: 'movies' },
  { to: '/movies?kind=dual_audio', label: 'Dual audio', icon: Languages, match: 'dual-audio' },
  { to: '/movies?kind=south_hindi', label: 'South movies', icon: MapPin, match: 'south-hindi' },
  { to: '/tv', label: 'TV Shows', icon: Tv },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
];

export function Sidebar() {
  const { wishlist, settings } = useApp();
  const location = useLocation();
  const searchKind = new URLSearchParams(location.search).get('kind');
  const onMovies = location.pathname === '/movies';
  const dualAudioActive = onMovies && searchKind === 'dual_audio';
  const southHindiActive = onMovies && searchKind === 'south_hindi';

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav" aria-label="Primary">
        <span className="sidebar-section">Browse</span>
        {nav.map(({ to, label, icon: Icon, end, match }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => {
              const active =
                match === 'dual-audio'
                  ? dualAudioActive
                  : match === 'south-hindi'
                    ? southHindiActive
                    : match === 'movies'
                      ? isActive && !dualAudioActive && !southHindiActive
                      : isActive;
              return `nav-item${active ? ' active' : ''}`;
            }}
          >
            <Icon size={18} strokeWidth={1.9} />
            <span>{label}</span>
            {label === 'Wishlist' && wishlist.length > 0 && (
              <span className="nav-badge">{wishlist.length}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-card">
        <div className="sidebar-card-icon">
          <Clapperboard size={16} />
        </div>
        <div>
          <strong>{settings.language.toUpperCase()}</strong>
          <span>Metadata language</span>
        </div>
      </div>

      <nav className="sidebar-nav sidebar-nav-bottom" aria-label="Secondary">
        <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Settings size={18} strokeWidth={1.9} />
          <span>Settings</span>
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Info size={18} strokeWidth={1.9} />
          <span>About</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <span>Metadata by TMDB</span>
        <span className="dot-sep">•</span>
        <span>v1.0.0</span>
      </div>
    </aside>
  );
}
