import { useMemo } from 'react';
import { ArrowUpRight, Clapperboard, Flame, Home as HomeIcon, Radio, Smile, Sparkles, Tv } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { MediaRow } from '../components/MediaRow';
import { ContinueCard } from '../components/ContinueCard';
import { useApp } from '../state/AppState';
import { useAsync } from '../lib/hooks';
import { fetchLatestMovies, fetchList } from '../lib/tmdb';
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
      <div className="home-category-bar hide-scrollbar">
        <NavLink to="/" end className={({ isActive }) => `home-cat-chip${isActive ? ' active' : ''}`}>
          <HomeIcon size={16} /> Home
        </NavLink>
        <NavLink to="/movies" className="home-cat-chip">
          <Clapperboard size={16} /> Movies
        </NavLink>
        <NavLink to="/tv" className="home-cat-chip">
          <Tv size={16} /> Series
        </NavLink>
        <NavLink to="/tv?kind=now_playing" className="home-cat-chip">
          <Radio size={16} /> Live TV
        </NavLink>
        <NavLink to="/movies?genre=10751" className="home-cat-chip">
          <Smile size={16} /> Kids
        </NavLink>
      </div>

      <Hero items={heroItems} loading={movieTrending.loading && tvTrending.loading} />

      <div className="page-body">
        {continueItems.length > 0 && (
          <section className="continue-section">
            <div className="row-head">
              <div>
                <h2>
                  <Flame size={19} className="head-icon" /> Continue watching
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

        <div className="section-divider">
          <span>
            <Sparkles size={14} /> Movies
          </span>
        </div>

        <MediaRow
          title="Latest this month"
          subtitle={`New releases in ${monthLabel} · updates every 30 minutes`}
          items={latestMovies.data?.items || []}
          loading={latestMovies.loading}
          seeAllTo="/movies?kind=latest"
        />
        <ListRow
          type="movie"
          kind="trending"
          title="Trending today"
          subtitle="What everyone is watching right now"
          ranked
          seeAllTo="/movies?kind=trending"
        />
        <ListRow
          type="movie"
          kind="popular"
          title="Popular movies"
          seeAllTo="/movies?kind=popular"
        />
        <ListRow
          type="movie"
          kind="top_rated"
          title="Top rated of all time"
          seeAllTo="/movies?kind=top_rated"
        />
        <ListRow
          type="movie"
          kind="now_playing"
          title="In theatres now"
          seeAllTo="/movies?kind=now_playing"
        />
        <ListRow
          type="movie"
          kind="upcoming"
          title="Coming soon"
          seeAllTo="/movies?kind=upcoming"
        />

        <div className="section-divider">
          <span>
            <Sparkles size={14} /> Series
          </span>
        </div>

        <ListRow
          type="tv"
          kind="trending"
          title="Trending series"
          ranked
          seeAllTo="/tv?kind=trending"
        />
        <ListRow type="tv" kind="popular" title="Popular series" seeAllTo="/tv?kind=popular" />
        <ListRow
          type="tv"
          kind="top_rated"
          title="Top rated series"
          seeAllTo="/tv?kind=top_rated"
        />
        <ListRow
          type="tv"
          kind="now_playing"
          title="On the air"
          subtitle="Currently airing seasons"
          seeAllTo="/tv?kind=now_playing"
        />

        <footer className="page-footer">
          <span>HaseebFlix Mobile</span>
          <span className="dot-sep">•</span>
          <span>Metadata &amp; artwork by TMDB</span>
          <span className="dot-sep">•</span>
          <span>Playback by VidRift</span>
        </footer>
      </div>
    </div>
  );
}
