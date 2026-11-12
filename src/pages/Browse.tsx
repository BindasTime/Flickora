import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Film, Globe2, Languages, LayoutGrid, RefreshCw, Shuffle, Tv } from 'lucide-react';
import { MediaCard } from '../components/MediaCard';
import { GridSkeleton } from '../components/Skeletons';
import { EmptyState, ErrorState } from '../components/States';
import { hf } from '../lib/bridge';
import { useAsync, useInfinite, useInfiniteScroll } from '../lib/hooks';
import {
  discoverTitles,
  fetchCountries,
  fetchDualAudioMovies,
  fetchLatestMovies,
  fetchList,
  fetchSouthHindiMovies,
  GENRES,
  REGIONS,
  type CountryOption,
} from '../lib/tmdb';
import type { ListKind, MediaSummary, MediaType } from '../lib/types';

const CATEGORIES: Record<MediaType, { kind: ListKind; label: string }[]> = {
  movie: [
    { kind: 'latest', label: 'Latest' },
    { kind: 'trending', label: 'Trending' },
    { kind: 'popular', label: 'Popular' },
    { kind: 'dual_audio', label: 'Dual audio' },
    { kind: 'south_hindi', label: 'South · Hindi' },
    { kind: 'top_rated', label: 'Top rated' },
    { kind: 'now_playing', label: 'In theatres' },
    { kind: 'upcoming', label: 'Coming soon' },
  ],
  tv: [
    { kind: 'trending', label: 'Trending' },
    { kind: 'popular', label: 'Popular' },
    { kind: 'top_rated', label: 'Top rated' },
    { kind: 'now_playing', label: 'On the air' },
  ],
};

const FALLBACK_COUNTRIES: CountryOption[] = REGIONS.map((region) => ({
  code: region.value,
  name: region.label,
}));

export function Browse({ type }: { type: MediaType }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const categories = CATEGORIES[type];
  const kindParam = params.get('kind');
  const kind: ListKind = categories.some((item) => item.kind === kindParam)
    ? (kindParam as ListKind)
    : 'trending';
  const genreParam = Number(params.get('genre'));
  const genre = GENRES[type].some((item) => item.id === genreParam) ? genreParam : 0;
  const countryParam = (params.get('country') || '').toUpperCase();
  const country = /^[A-Z]{2}$/.test(countryParam) ? countryParam : '';
  const title = type === 'movie' ? 'Movies' : 'TV Shows';
  const Icon = type === 'movie' ? Film : Tv;
  const isDualAudio = type === 'movie' && kind === 'dual_audio';
  const isSouthHindi = type === 'movie' && kind === 'south_hindi';
  // Both of these verify VidRift audio tracks, so their batches are slower and
  // can come back empty.
  const isAudioScan = isDualAudio || isSouthHindi;
  // Audio verification reads VidRift through the Electron main process, so a
  // browser tab cannot run these categories at all.
  const audioUnavailable = isDualAudio && hf.audio.available === false;
  const southHindiUnverified = isSouthHindi && hf.audio.available === false;

  const countryList = useAsync<CountryOption[]>(() => fetchCountries(), []);
  const countryOptions = countryList.data?.length ? countryList.data : FALLBACK_COUNTRIES;
  const countryLabel = countryOptions.find((item) => item.code === country)?.name || country;

  const fetchPage = (page: number, onItem?: (media: MediaSummary) => void) => {
    if (isDualAudio) {
      return fetchDualAudioMovies({
        page,
        genreId: genre || undefined,
        country: country || undefined,
        onItem,
      });
    }
    if (kind === 'latest') {
      return fetchLatestMovies({
        page,
        genreId: genre || undefined,
        country: country || undefined,
      });
    }
    if (isSouthHindi) {
      return fetchSouthHindiMovies({
        page,
        genreId: genre || undefined,
        country: country || undefined,
        verifyAudio: hf.audio.available !== false,
        onItem,
      });
    }
    // `movie/upcoming` includes titles that are already out, and the dedicated
    // list endpoints cannot be filtered by country. Discover is the only path
    // that gives us both a correct upcoming window and origin-country filters.
    if (country || genre || kind === 'upcoming') {
      return discoverTitles(type, kind, {
        page,
        genreId: genre || undefined,
        country: country || undefined,
      });
    }
    return fetchList(type, kind, page);
  };

  const list = useInfinite<MediaSummary>(fetchPage, [type, kind, genre, country]);
  const sentinel = useInfiniteScroll(
    list.loadMore,
    !list.loading && !list.loadingMore && list.hasMore && !list.error,
  );

  const activeLabel = useMemo(() => {
    if (isDualAudio) {
      const base = genre
        ? `Dual audio · ${GENRES[type].find((item) => item.id === genre)?.name || 'Genre'}`
        : 'Movies with two or more audio languages';
      return country ? `${base} · ${countryLabel}` : base;
    }
    if (isSouthHindi) {
      const base = genre
        ? `South · ${GENRES[type].find((item) => item.id === genre)?.name || 'Genre'}`
        : 'South Indian movies with a Hindi audio track';
      return country ? `${base} · ${countryLabel}` : base;
    }
    const base = genre
      ? GENRES[type].find((item) => item.id === genre)?.name || 'Genre'
      : categories.find((item) => item.kind === kind)?.label || 'Trending';
    return country ? `${base} · ${countryLabel}` : base;
  }, [categories, country, countryLabel, genre, isDualAudio, isSouthHindi, kind, type]);

  const setKind = (next: ListKind) => {
    const nextParams: Record<string, string> = { kind: next };
    if (genre) nextParams.genre = String(genre);
    if (country) nextParams.country = country;
    setParams(nextParams, { replace: true });
  };

  const setGenre = (value: string) => {
    const nextParams: Record<string, string> = { kind };
    if (value) nextParams.genre = value;
    if (country) nextParams.country = country;
    setParams(nextParams, { replace: true });
  };

  const setCountry = (value: string) => {
    const nextParams: Record<string, string> = { kind };
    if (genre) nextParams.genre = String(genre);
    if (value) nextParams.country = value;
    setParams(nextParams, { replace: true });
  };

  const surprise = () => {
    const pool = list.items.filter((item) => item.posterPath);
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    navigate(`/title/${pick.mediaType}/${pick.id}`);
  };

  return (
    <div className="page browse-page">
      <header className="page-head browse-head">
        <div className="page-head-main">
          <span className="eyebrow">
            <Icon size={13} /> Library
          </span>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">
            {activeLabel}
            {!isDualAudio && list.totalResults > 0 && (
              <>
                {' '}
                · {list.totalResults.toLocaleString()} titles
              </>
            )}
          </p>
        </div>
        <button type="button" className="button glass" onClick={surprise} disabled={!list.items.length}>
          <Shuffle size={16} /> Surprise me
        </button>
      </header>

      <div className="browse-controls">
        <div className="chips hide-scrollbar" role="tablist" aria-label="Categories">
          {categories.map((item) => (
            <button
              key={item.kind}
              type="button"
              role="tab"
              aria-selected={kind === item.kind}
              className={`chip${kind === item.kind ? ' active' : ''}`}
              onClick={() => setKind(item.kind)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="browse-filters">
          <label className="select-field">
            <LayoutGrid size={15} />
            <select
              value={genre || ''}
              onChange={(event) => setGenre(event.target.value)}
              aria-label="Filter by genre"
            >
              <option value="">All genres</option>
              {GENRES[type].map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field">
            <Globe2 size={15} />
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              aria-label="Filter by country"
            >
              <option value="">All countries</option>
              {countryOptions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isAudioScan && !audioUnavailable && !southHindiUnverified && (
        <div className="audio-scan-note">
          <Languages size={15} />
          <span>
            {list.loading ? (
              <>
                <strong>Checking VidRift audio tracks…</strong>{' '}
                {isSouthHindi
                  ? 'The first scan takes a little longer because four industries are checked.'
                  : 'The first scan takes a few seconds.'}
              </>
            ) : isSouthHindi ? (
              <>
                Tamil, Telugu, Malayalam, and Kannada movies
                {southHindiUnverified
                  ? ' are shown here; Hindi audio tracks cannot be verified on this device.'
                  : ' with Hindi audio verified in their VidRift embed are listed.'}{' '}
                Results are cached so repeat visits are quick.
              </>
            ) : (
              <>
                Audio tracks are verified against each title&apos;s VidRift embed. Results are cached
                so repeat visits are quick.
              </>
            )}
          </span>
        </div>
      )}

      {audioUnavailable ? (
        <EmptyState
          icon={<Languages size={26} />}
          title="Desktop feature"
          message="Deep audio-track verification scans require the desktop edition of Flickora. You can explore all other categories, genres, and countries directly here on mobile!"
          action={
            <button type="button" className="button glass" onClick={() => navigate('/movies')}>
              <Film size={15} /> Browse all movies
            </button>
          }
        />
      ) : list.loading && !list.items.length ? (
        <GridSkeleton count={20} />
      ) : list.error && !list.items.length ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        isAudioScan && !southHindiUnverified ? (
          <EmptyState
            icon={<Languages size={26} />}
            title={
              isDualAudio
                ? 'No dual-audio titles in this batch'
                : 'No Hindi-audio south titles in this batch'
            }
            message={
              isDualAudio
                ? 'None of the movies checked in this batch published a non-original audio track yet. VidRift also rate-limits lookups, so scanning again in a moment can reveal more.'
                : 'None of the south titles checked in this batch published a Hindi audio track yet. VidRift also rate-limits lookups, so scanning again in a moment can reveal more.'
            }
            action={
              list.hasMore ? (
                <button
                  type="button"
                  className="button glass"
                  onClick={list.loadMore}
                  disabled={list.loadingMore}
                >
                  <RefreshCw size={15} /> Scan next batch
                </button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={<LayoutGrid size={26} />}
            title="No titles found"
            message="Try a different category, genre, or country."
          />
        )
      ) : (
        <>
          <div className="media-grid">
            {list.items.map((media) => (
              <MediaCard key={`${media.mediaType}-${media.id}`} media={media} />
            ))}
          </div>

          <div className="load-more" ref={sentinel}>
            {list.loadingMore && (
              <span className="inline-loader">
                <span className="spinner" />
                <span>{isAudioScan ? 'Checking another batch…' : 'Loading more'}</span>
              </span>
            )}
            {list.error && (
              <button type="button" className="button glass" onClick={list.loadMore}>
                <RefreshCw size={15} /> Try loading more again
              </button>
            )}
            {isAudioScan && list.hasMore && !list.loadingMore && !list.error && (
              <button type="button" className="button glass" onClick={list.loadMore}>
                <RefreshCw size={15} /> Scan next batch
              </button>
            )}
            {!list.hasMore && !list.loadingMore && !list.error && (
              <span className="end-note">You&apos;ve reached the end of the list.</span>
            )}
          </div>
        </>
      )}

      <footer className="page-footer">
        <span>Metadata &amp; artwork by TMDB</span>
        <span className="dot-sep">•</span>
        <span>Playback by VidRift</span>
      </footer>
    </div>
  );
}
