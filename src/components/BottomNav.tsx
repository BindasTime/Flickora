import { NavLink } from 'react-router-dom';
import { Film, Heart, Home, Search, Tv } from 'lucide-react';
import { useApp } from '../state/AppState';

export function BottomNav() {
  const { wishlist } = useApp();

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <Home size={22} strokeWidth={2.2} />
        </div>
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/movies"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <Film size={22} strokeWidth={2.2} />
        </div>
        <span>Movies</span>
      </NavLink>

      <NavLink
        to="/tv"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <Tv size={22} strokeWidth={2.2} />
        </div>
        <span>TV Shows</span>
      </NavLink>

      <NavLink
        to="/search"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <Search size={22} strokeWidth={2.2} />
        </div>
        <span>Search</span>
      </NavLink>

      <NavLink
        to="/wishlist"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <Heart size={22} strokeWidth={2.2} />
          {wishlist.length > 0 && (
            <span className="bottom-nav-badge">{wishlist.length > 99 ? '99+' : wishlist.length}</span>
          )}
        </div>
        <span>Wishlist</span>
      </NavLink>
    </nav>
  );
}
