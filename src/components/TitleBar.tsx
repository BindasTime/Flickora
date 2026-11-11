import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, WifiOff } from 'lucide-react';
import { useApp } from '../state/AppState';
import { BrandMark, Wordmark } from './Brand';
import { WindowButtons } from './WindowButtons';

export function TitleBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { offline } = useApp();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onSearchPage = location.pathname === '/search';
  const urlQuery = onSearchPage ? params.get('q') || '' : '';

  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const goSearch = (next: string) => {
    setValue(next);
    if (!next.trim()) {
      if (onSearchPage) navigate('/search', { replace: true });
      return;
    }
    navigate(`/search?q=${encodeURIComponent(next)}`, { replace: onSearchPage });
  };

  return (
    <header className="titlebar">
      <div className="titlebar-brand">
        <BrandMark size={24} />
        <Wordmark compact />
      </div>

      <div className="titlebar-search">
        <Search size={16} />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => goSearch(event.target.value)}
          onFocus={() => {
            if (!onSearchPage) navigate('/search');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setValue('');
              if (onSearchPage) navigate('/search', { replace: true });
              inputRef.current?.blur();
            }
          }}
          placeholder="Search movies, TV shows…"
          aria-label="Search"
          spellCheck={false}
        />
        <kbd>{navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'} K</kbd>
      </div>

      <div className="titlebar-right">
        {offline && (
          <span className="offline-pill" title="Showing cached data — no network connection">
            <WifiOff size={13} /> Offline
          </span>
        )}
        <WindowButtons />
      </div>
    </header>
  );
}
