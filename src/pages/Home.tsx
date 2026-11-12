import { useMemo } from 'react';
import { ArrowUpRight, Clapperboard, Flame, Sparkles, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { MediaRow } from '../components/MediaRow';
import { ContinueCard } from '../components/ContinueCard';
import { useApp } from '../state/AppState';
import { useAsync } from '../lib/hooks';
import { fetchLatestMovies, fetchList, fetchTopMoviesToday } from '../lib/tmdb';
import type { ListKind, MediaSummary, MediaType } from '../lib/types';

function ListRow({
  type,
  kind,
  title,
  subtitle,
  ranked,
  seeAllTo,
}: {
  type: MediaType;
  kind: ListKind;
  title: string;
  subtitle?: string;
  ranked?: boolean;
  seeAllTo: string;
}) {
  const { data, loading } = useAsync(() => fetchList(type, kind), [type, kind]);
  return (
    <MediaRow
      title={title}
      subtitle={subtitle}
      items={data?.items || []}
      loading={loading}
      ranked={ranked}
      seeAllTo={seeAllTo}
    />
  );
}

function TopMoviesTodayRow() {
  const { data, loading } = useAsync(() => fetchTopMoviesToday(), []);
  return (
    <MediaRow
      title="Top 10 Movies Today"
      subtitle="Released movies trending today"
      items={data?.items || []}
      loading={loading}
      ranked
      seeAllTo="/movies?kind=trending"
    />
  );
}

function interleave(a: MediaSummary[], b: MediaSummary[]): MediaSummary[] {
  const out: MediaSummary[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

export function Home() {
  const { progress } = useApp();
  const movieTrending = useAsync(() => fetchList('movie', 'trending'), []);
  const tvTrending = useAsync(() => fetchList('tv', 'trending'), []);
  // Newest releases of the month; re-fetched quietly every 30 minutes.
  const latestMovies = useAsync(() => fetchLatestMovies(), [], 30 * 60 * 1000);
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const heroItems = useMemo(
    () => interleave(movieTrending.data?.items || [], tvTrending.data?.items || []),
    [movieTrending.data, tvTrending.data],
  );

  const continueItems = useMemo(() => {
    const seen = new Set<string>();
    return [...progress]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((item) => {
        const key = `${item.mediaType}-${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 12);
  }, [progress]);

  return (
    <div className="home">
      <Hero items={heroItems} loading={movieTrending.loading && tvTrending.loading} />

      <div className="page-body">
        <nav className="home-category-bar" aria-label="Explore Flickora">
          <Link className="home-cat-chip active" to="/movies?kind=trending"><Sparkles size={15} /> For you</Link>
          <Link className="home-cat-chip" to="/movies"><Clapperboard size={15} /> Movies</Link>
          <Link className="home-cat-chip" to="/tv"><Tv size={15} /> Series</Link>
        </nav>
        {continueItems.length > 0 && (
          <section className="continue-section">
            <div className="row-head">
              <div>
                <h2>
                  <Flame size={18} className="head-icon" /> Continue Watching
                </h2>
                <p>Pick up right where you left off.</p>
              </div>
              <Link className="see-all" to="/wishlist">
                Your list <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="continue-scroller">
              {continueItems.map((item) => (
                <ContinueCard key={`${item.mediaType}-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        )}

        <TopMoviesTodayRow />
        <ListRow
          type="movie"
          kind="trending"
          title="Trending Now"
          subtitle="What everyone is watching"
          seeAllTo="/movies?kind=trending"
        />
        <MediaRow
          title="New Releases"
          subtitle={`Fresh titles in ${monthLabel}`}
          items={latestMovies.data?.items || []}
          loading={latestMovies.loading}
          seeAllTo="/movies?kind=latest"
        />
        <ListRow type="movie" kind="popular" title="Popular Movies" seeAllTo="/movies?kind=popular" />
        <ListRow
          type="movie"
          kind="top_rated"
          title="Top Rated Movies"
          seeAllTo="/movies?kind=top_rated"
        />
        <ListRow
          type="movie"
          kind="now_playing"
          title="In Theatres"
          seeAllTo="/movies?kind=now_playing"
        />
        <ListRow type="movie" kind="upcoming" title="Coming Soon" seeAllTo="/movies?kind=upcoming" />

        <ListRow
          type="tv"
          kind="trending"
          title="Trending Series"
          seeAllTo="/tv?kind=trending"
        />
        <ListRow type="tv" kind="popular" title="Popular Series" seeAllTo="/tv?kind=popular" />
        <ListRow
          type="tv"
          kind="top_rated"
          title="Top Rated Series"
          seeAllTo="/tv?kind=top_rated"
        />
        <ListRow
          type="tv"
          kind="now_playing"
          title="On the Air"
          subtitle="Currently airing seasons"
          seeAllTo="/tv?kind=now_playing"
        />

        <footer className="page-footer">
          <span>Flickora</span>
          <span className="dot-sep">•</span>
          <span>Metadata &amp; artwork by TMDB</span>
          <span className="dot-sep">•</span>
          <span>Playback by VidRift</span>
        </footer>
      </div>
    </div>
  );
}
