import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock3, Search as SearchIcon, Trash2, TrendingUp, X } from 'lucide-react';
import { MediaCard } from '../components/MediaCard';
import { GridSkeleton } from '../components/Skeletons';
import { EmptyState, ErrorState } from '../components/States';
import { useApp } from '../state/AppState';
import { useAsync, useDebounced, useInfinite, useInfiniteScroll } from '../lib/hooks';
import { fetchList, searchMedia } from '../lib/tmdb';
import type { MediaSummary } from '../lib/types';

type Tab = 'multi' | 'movie' | 'tv';

const TABS: { value: Tab; label: string }[] = [
  { value: 'multi', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
];

function interleave(a: MediaSummary[], b: MediaSummary[]): MediaSummary[] {
  const out: MediaSummary[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

export function Search() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const { recentSearches, addRecentSearch, clearRecentSearches } = useApp();
  const [input, setInput] = useState(query);
  const [tab, setTab] = useState<Tab>('multi');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debouncedQuery = useDebounced(query.trim(), 420);
  const enabled = debouncedQuery.length >= 2;

  useEffect(() => {
    setInput(query);
  }, [query]);

  const list = useInfinite<MediaSummary>(
    (page) => searchMedia(tab, debouncedQuery, page),
    [debouncedQuery, tab],
    enabled,
  );
  const sentinel = useInfiniteScroll(
    list.loadMore,
    enabled && !list.loading && !list.loadingMore && list.hasMore && !list.error,
  );

  const trendingMovies = useAsync(() => fetchList('movie', 'trending'), []);
  const trendingTv = useAsync(() => fetchList('tv', 'trending'), []);
  const trending = useMemo(
    () => interleave(trendingMovies.data?.items || [], trendingTv.data?.items || []).slice(0, 12),
    [trendingMovies.data, trendingTv.data],
  );

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      navigate('/search', { replace: true });
      return;
    }
    addRecentSearch(trimmed);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`, { replace: true });
  };

  const hasQuery = query.trim().length > 0;
  const resultCount = list.totalResults;
  const showLoading = enabled && list.loading;

  return (
    <div className="page search-page">
      <header className="page-head">
        <div className="page-head-main">
          <span className="eyebrow">
            <SearchIcon size={13} /> Discover
          </span>
          <h1 className="page-title">Search</h1>
          <p className="page-sub">Find a movie or series by title.</p>
        </div>
      </header>

      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        role="search"
      >
        <SearchIcon size={20} />
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search for a movie, series, or anything you're in the mood for…"
          aria-label="Search movies and TV shows"
          spellCheck={false}
          autoComplete="off"
        />
        {input && (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear search"
            onClick={() => {
              setInput('');
              submit('');
              inputRef.current?.focus();
            }}
          >
            <X size={16} />
          </button>
        )}
        <button type="submit" className="button primary search-submit">
          Search
        </button>
      </form>

      {!hasQuery ? (
        <>
          {recentSearches.length > 0 && (
            <section className="search-block">
              <div className="row-head">
                <div>
                  <h2>
                    <Clock3 size={17} className="head-icon" /> Recent searches
                  </h2>
                </div>
                <button type="button" className="text-button" onClick={clearRecentSearches}>
                  <Trash2 size={14} /> Clear
                </button>
              </div>
              <div className="chips">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="chip ghost"
                    onClick={() => {
                      setInput(term);
                      submit(term);
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="search-block">
            <div className="row-head">
              <div>
                <h2>
                  <TrendingUp size={18} className="head-icon" /> Trending this week
                </h2>
                <p>Not sure what to watch? Start here.</p>
              </div>
            </div>
            {trendingMovies.loading && trendingTv.loading ? (
              <GridSkeleton count={12} />
            ) : (
              <div className="media-grid compact">
                {trending.map((media) => (
                  <MediaCard key={`${media.mediaType}-${media.id}`} media={media} />
                ))}
              </div>
            )}
          </section>
        </>
      ) : query.trim().length < 2 ? (
        <EmptyState
          icon={<SearchIcon size={26} />}
          title="Keep typing"
          message="Enter at least two characters to search."
        />
      ) : (
        <>
          <div className="search-toolbar">
            <div className="chips" role="tablist" aria-label="Search filters">
              {TABS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.value}
                  className={`chip${tab === item.value ? ' active' : ''}`}
                  onClick={() => setTab(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {enabled && !showLoading && resultCount > 0 && (
              <span className="result-count">
                {resultCount.toLocaleString()} result{resultCount === 1 ? '' : 's'} for{' '}
                <strong>{debouncedQuery}</strong>
              </span>
            )}
          </div>

          {showLoading ? (
            <GridSkeleton count={18} />
          ) : list.error && !list.items.length ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : list.items.length === 0 ? (
            <EmptyState
              icon={<SearchIcon size={26} />}
              title={`No matches for “${debouncedQuery}”`}
              message="Check the spelling or try a different title."
              action={
                <button
                  type="button"
                  className="button glass"
                  onClick={() => {
                    const fallback = tab === 'tv' ? 'movie' : 'tv';
                    setTab(fallback);
                  }}
                >
                  Search {tab === 'tv' ? 'movies' : 'TV shows'} instead
                </button>
              }
            />
          ) : (
            <>
              <div
                className="media-grid"
                onClick={() => addRecentSearch(debouncedQuery)}
                role="presentation"
              >
                {list.items.map((media) => (
                  <MediaCard key={`${media.mediaType}-${media.id}`} media={media} />
                ))}
              </div>
              <div className="load-more" ref={sentinel}>
                {list.loadingMore && <span className="spinner" />}
                {list.error && (
                  <button type="button" className="button glass" onClick={list.loadMore}>
                    Try loading more again
                  </button>
                )}
                {!list.hasMore && !list.loadingMore && !list.error && (
                  <span className="end-note">That&apos;s everything we found.</span>
                )}
              </div>
            </>
          )}
        </>
      )}

      <footer className="page-footer">
        <span>Search powered by TMDB</span>
      </footer>
    </div>
  );
}
