import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock3, Search as SearchIcon, Sparkles, Trash2, TrendingUp, X } from 'lucide-react';
import { MediaCard } from '../components/MediaCard';
import { AdSlot } from '../components/AdSlot';
import { GridSkeleton } from '../components/Skeletons';
import { EmptyState, ErrorState } from '../components/States';
import { useApp } from '../state/AppState';
import { useAsync, useDebounced, useInfinite, useInfiniteScroll } from '../lib/hooks';
import { fetchList, searchMedia } from '../lib/tmdb';
import { findMoviesByDescription, isAiEnabled } from '../lib/ai';
import type { MediaSummary } from '../lib/types';

type Tab = 'multi' | 'movie' | 'tv';

const TABS: { value: Tab; label: string }[] = [
  { value: 'multi', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
];

const AI_EXAMPLES = [
  { label: 'Neon detective', text: 'a detective in a rainy neon city who loses his memory' },
  { label: 'Space survival', text: 'a crew fighting to survive on a derelict spaceship' },
  { label: 'Feel-good classic', text: 'a feel-good underdog story about chasing a dream' },
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
  const [aiDescription, setAiDescription] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResults, setAiResults] = useState<MediaSummary[] | null>(null);
  const [aiNotice, setAiNotice] = useState('');
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

  /** Resolve AI title suggestions against TMDB so only real titles are shown. */
  const runAi = async () => {
    const description = aiDescription.trim();
    if (description.length < 8) {
      setAiNotice('Describe a movie in at least a few words.');
      return;
    }
    if (!isAiEnabled()) {
      setAiNotice('AI movie finder is not configured on this device.');
      return;
    }

    setAiBusy(true);
    setAiNotice('');
    setAiResults(null);
    try {
      const { titles, declined } = await findMoviesByDescription(description);
      if (declined || !titles.length) {
        setAiNotice('I only find movies. Describe the kind of film or show you want to watch.');
        setAiResults([]);
        return;
      }

      const resolved = await Promise.all(
        titles.map(async (title) => {
          try {
            const found = await searchMedia('movie', title, 1);
            return found.items[0] || null;
          } catch {
            return null;
          }
        }),
      );
      const unique = resolved.filter(
        (item, position): item is MediaSummary =>
          Boolean(item) && resolved.findIndex((other) => other?.id === item?.id) === position,
      );
      setAiResults(unique);
      if (!unique.length) {
        setAiNotice('No matches in our catalogue. Try describing a better-known movie.');
      }
    } catch (error) {
      setAiNotice(error instanceof Error ? error.message : 'AI service is unavailable right now.');
    } finally {
      setAiBusy(false);
    }
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

      <section className="search-block ai-find" aria-labelledby="ai-find-title">
        <div className="ai-find-head">
          <span className="ai-find-icon">
            <Sparkles size={19} />
          </span>
          <div className="ai-find-copy">
            <div className="ai-find-title-row">
              <h2 id="ai-find-title">Find a movie with AI</h2>
              <span className="ai-find-badge">Movies only</span>
            </div>
            <p>Describe a plot, a mood, or a scene. You get a real movie list — nothing else.</p>
          </div>
        </div>
        <form
          className="ai-find-form"
          onSubmit={(event) => {
            event.preventDefault();
            void runAi();
          }}
        >
          <div className="ai-find-input-wrap">
            <textarea
              value={aiDescription}
              onChange={(event) => setAiDescription(event.target.value)}
              placeholder="e.g. a detective in a rainy neon city who loses his memory…"
              aria-label="Describe the movie you want"
              maxLength={500}
              rows={2}
            />
            <span className="ai-find-count">{aiDescription.length}/500</span>
          </div>
          <div className="ai-find-actions">
            <div className="ai-find-suggestions" aria-label="Example descriptions">
              {AI_EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  className="ai-find-suggestion"
                  onClick={() => setAiDescription(example.text)}
                >
                  {example.label}
                </button>
              ))}
            </div>
            <button type="submit" className="button primary" disabled={aiBusy}>
              {aiBusy ? (
                <>
                  <span className="spinner" /> Finding…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Find movies
                </>
              )}
            </button>
          </div>
        </form>
        {aiNotice && (
          <p className="ai-find-notice" role="status">
            {aiNotice}
          </p>
        )}
        {aiResults && aiResults.length > 0 && (
          <div className="media-grid compact ai-find-results">
            {aiResults.map((media) => (
              <MediaCard key={`${media.mediaType}-${media.id}`} media={media} />
            ))}
          </div>
        )}
      </section>

      <AdSlot placement="search" />

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
