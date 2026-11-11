import { Link } from 'react-router-dom';
import { Compass, Home, Search } from 'lucide-react';

export function NotFound() {
  return (
    <div className="page notfound-page">
      <div className="notfound-art" aria-hidden="true">
        <span>404</span>
      </div>
      <div className="notfound-copy">
        <span className="eyebrow">
          <Compass size={13} /> Lost in the credits
        </span>
        <h1>This scene doesn&apos;t exist</h1>
        <p>The page you were looking for has left the frame. Try one of these instead.</p>
        <div className="state-actions">
          <Link className="button primary" to="/">
            <Home size={16} /> Go home
          </Link>
          <Link className="button glass" to="/search">
            <Search size={16} /> Search titles
          </Link>
        </div>
      </div>
    </div>
  );
}
