import { NavLink } from 'react-router-dom';
import { NavExploreIcon, NavHomeIcon, NavListIcon, NavSearchIcon, NavTvIcon } from './NavIcons';

export function BottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <div className="bottom-nav-indicator" />
          <NavHomeIcon size={23} className="bottom-nav-icon" />
        </div>
        <span className="bottom-nav-label">Home</span>
      </NavLink>

      <NavLink
        to="/movies"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <div className="bottom-nav-indicator" />
          <NavExploreIcon size={23} className="bottom-nav-icon" />
        </div>
        <span className="bottom-nav-label">Explore</span>
      </NavLink>

      <NavLink
        to="/tv"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <div className="bottom-nav-indicator" />
          <NavTvIcon size={23} className="bottom-nav-icon" />
        </div>
        <span className="bottom-nav-label">TV Series</span>
      </NavLink>

      <NavLink
        to="/search"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <div className="bottom-nav-indicator" />
          <NavSearchIcon size={23} className="bottom-nav-icon" />
        </div>
        <span className="bottom-nav-label">Search</span>
      </NavLink>

      <NavLink
        to="/wishlist"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <div className="bottom-nav-icon-wrap">
          <div className="bottom-nav-indicator" />
          <NavListIcon size={23} className="bottom-nav-icon" />
        </div>
        <span className="bottom-nav-label">My List</span>
      </NavLink>
    </nav>
  );
}
