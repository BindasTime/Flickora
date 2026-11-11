import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  LayoutGrid,
  List,
  Play,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { MediaCard } from '../components/MediaCard';
import { EmptyState } from '../components/States';
import { useApp } from '../state/AppState';
import { posterUrl } from '../lib/tmdb';
import { formatScore, yearOf } from '../lib/format';
import { hf } from '../lib/bridge';
import type { MediaSummary, WishlistItem } from '../lib/types';

type Sort = 'recent' | 'title' | 'rating' | 'year';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Recently added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'year', label: 'Newest release' },
];

function toSummary(item: WishlistItem): MediaSummary {
  return {
    id: item.id,
    mediaType: item.mediaType,
    title: item.title,
    originalTitle: item.title,
    overview: '',
    posterPath: item.posterPath,
    backdropPath: null,
    voteAverage: item.voteAverage,
    voteCount: 0,
    releaseDate: item.year ? `${item.year}-01-01` : null,
    popularity: 0,
    genreIds: [],
    adult: false,
    originalLanguage: '',
  };
}

export function Wishlist() {
  const navigate = useNavigate();
  const { wishlist, removeWishlist, clearWishlist, toast } = useApp();
  const [sort, setSort] = useState<Sort>('recent');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState('');

  const items = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const filtered = needle
      ? wishlist.filter((item) => item.title.toLowerCase().includes(needle))
      : wishlist;
    return [...filtered].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'rating') return b.voteAverage - a.voteAverage;
      if (sort === 'year') return Number(b.year || 0) - Number(a.year || 0);
      return b.addedAt - a.addedAt;
    });
  }, [wishlist, filter, sort]);

  const clearAll = async () => {
    const confirmed = await hf.confirm({
      title: 'Clear wishlist',
      message: `Remove all ${wishlist.length} titles from your wishlist?`,
      detail: 'This only clears your saved list. Watch progress is kept.',
    });
    if (confirmed) {
      clearWishlist();
      toast('Wishlist cleared', 'success');
    }
  };

  return (
    <div className="page wishlist-page">
      <header className="page-head">
        <div className="page-head-main">
          <span className="eyebrow">
            <Heart size={13} /> Your library
          </span>
          <h1 className="page-title">Wishlist</h1>
          <p className="page-sub">
            {wishlist.length
              ? `${wishlist.length} saved title${wishlist.length === 1 ? '' : 's'} for later.`
              : 'Everything you save lives here.'}
          </p>
        </div>
        {wishlist.length > 0 && (
          <button type="button" className="button ghost-danger" onClick={() => void clearAll()}>
            <Trash2 size={15} /> Clear list
          </button>
        )}
      </header>

      {wishlist.length === 0 ? (
        <EmptyState
          icon={<Heart size={28} />}
          title="Your wishlist is empty"
          message="Tap the heart on any poster to keep it here for movie night."
          action={
            <div className="state-actions">
              <Link className="button primary" to="/movies">
                Browse movies
              </Link>
              <Link className="button glass" to="/tv">
                Browse TV shows
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="library-toolbar">
            <div className="library-search">
              <Search size={15} />
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter your list…"
                aria-label="Filter wishlist"
              />
            </div>

            <label className="select-field">
              <span className="select-label">Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="view-toggle" role="group" aria-label="Layout">
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                className={view === 'grid' ? 'active' : ''}
                onClick={() => setView('grid')}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === 'list'}
                className={view === 'list' ? 'active' : ''}
                onClick={() => setView('list')}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={<Search size={24} />}
              title="No titles match that filter"
              message="Try a shorter search term."
              action={
                <button type="button" className="button glass" onClick={() => setFilter('')}>
                  Clear filter
                </button>
              }
            />
          ) : view === 'grid' ? (
            <div className="media-grid">
              {items.map((item) => (
                <MediaCard key={`${item.mediaType}-${item.id}`} media={toSummary(item)} />
              ))}
            </div>
          ) : (
            <div className="library-list">
              {items.map((item) => {
                const poster = posterUrl(item.posterPath, 'w185');
                return (
                  <article key={`${item.mediaType}-${item.id}`} className="library-row">
                    <Link to={`/title/${item.mediaType}/${item.id}`} className="library-row-main">
                      <div className="library-poster">
                        {poster ? <img src={poster} alt="" loading="lazy" /> : <span>{item.title.slice(0, 2)}</span>}
                      </div>
                      <div className="library-info">
                        <strong>{item.title}</strong>
                        <span>
                          {[yearOf(item.year ? `${item.year}-01-01` : null), item.mediaType === 'tv' ? 'TV Show' : 'Movie']
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                      {item.voteAverage > 0 && (
                        <span className="library-rating">
                          <Star size={12} fill="currentColor" /> {formatScore(item.voteAverage)}
                        </span>
                      )}
                    </Link>
                    <div className="library-row-actions">
                      <button
                        type="button"
                        className="icon-button solid"
                        aria-label={`Open ${item.title}`}
                        onClick={() =>
                          navigate(
                            item.mediaType === 'movie'
                              ? `/watch/movie/${item.id}?title=${encodeURIComponent(item.title)}`
                              : `/title/tv/${item.id}?episodes=1`,
                          )
                        }
                      >
                        <Play size={15} fill="currentColor" />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove ${item.title} from wishlist`}
                        onClick={() => removeWishlist(item.mediaType, item.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <footer className="page-footer">
        <span>Saved on this device</span>
        <span className="dot-sep">•</span>
        <span>No account required</span>
      </footer>
    </div>
  );
}
