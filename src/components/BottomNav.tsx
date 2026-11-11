import { NavLink } from 'react-router-dom';
import { Bookmark, Compass, Home, Search, Tv } from 'lucide-react';
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
          <div className="bottom-nav-indicator" />
          <Home size={22} strokeWidth={2.2} className="bottom-nav-icon" />
        </div>
        <span className="bottom-nav-label">Home</span>
      </NavLink>

      <NavLink
        to="/movies"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <div className="bottom-nav-indicator" />
          <Compass size={22} strokeWidth={2.2} className="bottom-nav-icon" />
        </div>
        <span className="bottom-nav-label">Explore</span>
      </NavLink>

      <NavLink
        to="/tv"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <div className="bottom-nav-indicator" />
          <Tv size={22} strokeWidth={2.2} className="bottom-nav-icon" />
        </div>
        <span className="bottom-nav-label">Live TV</span>
      </NavLink>

      <NavLink
        to="/search"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <div className="bottom-nav-indicator" />
          <Search size={22} strokeWidth={2.2} className="bottom-nav-icon" />
        </div>
        <span className="bottom-nav-label">Search</span>
      </NavLink>

      <NavLink
        to="/wishlist"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <div className="bottom-nav-indicator" />
          <Bookmark size={22} strokeWidth={2.2} className="bottom-nav-icon" />
          {wishlist.length > 0 && (
            <span className="bottom-nav-badge">{wishlist.length > 99 ? '99+' : wishlist.length}</span>
          )}
        </div>
        <span className="bottom-nav-label">My List</span>
      </NavLink>
    </nav>
  );
}
