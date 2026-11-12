import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  Calendar,
  Check,
  ChevronRight,
  Clapperboard,
  Clock3,
  Download,
  ExternalLink,
  FileJson,
  Film,
  ImageIcon,
  Images,
  Info,
  Languages,
  ListVideo,
  Play,
  Star,
  Tv,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppState';
import { useAsync } from '../lib/hooks';
import { hf } from '../lib/bridge';
import {
  backdropUrl,
  dualAudioInfo,
  fetchDetails,
  fetchSeason,
  posterUrl,
  profileUrl,
  stillUrl,
} from '../lib/tmdb';
import {
  episodeCode,
  formatCount,
  formatRuntime,
  formatScore,
  yearOf,
} from '../lib/format';
import type { MediaDetails, MediaType, SeasonDetails } from '../lib/types';
import { MediaRow } from '../components/MediaRow';
import { ErrorState, InlineLoader } from '../components/States';

type Tab = 'episodes' | 'more' | 'details';

function DetailsSkeleton() {
  return (
    <div className="details-page details-skeleton" aria-hidden="true">
      <div className="details-hero">
        <div className="shimmer details-backdrop" />
        <div className="details-shell">
          <div className="shimmer details-poster-wrap" />
          <div className="details-main">
            <div className="shimmer line short" />
            <div className="shimmer line title" />
            <div className="shimmer line medium" />
            <div className="shimmer line long" />
            <div className="shimmer button-shape" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Details() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const mediaType: MediaType = params.mediaType === 'tv' ? 'tv' : 'movie';
  const id = Number(params.id);
  const { data: details, loading, error, reload } = useAsync(
    () => fetchDetails(mediaType, id),
    [mediaType, id],
  );
  const { progress, toggleWishlist, isWishlisted, toast } = useApp();
  const [season, setSeason] = useState<number | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<{ season: number; episode: number } | null>(null);
  const [tab, setTab] = useState<Tab>('details');
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const episodesRef = useRef<HTMLDivElement | null>(null);

  const seasonData = useAsync<SeasonDetails | null>(
    () => (mediaType === 'tv' && season ? fetchSeason(id, season) : Promise.resolve(null)),
    [mediaType, id, season],
  );
  const audio = useAsync(async () => {
    if (mediaType !== 'movie') return null;
    let result = await hf.audio.lookup({ type: 'movie', id, priority: true });
    if (result.throttled) {
      // VidRift's shared bucket may be empty right after a list scan. A single
      // delayed retry usually lands once the window reopens.
      await new Promise((resolve) => setTimeout(resolve, 3200));
      result = await hf.audio.lookup({ type: 'movie', id, priority: true });
    }
    return result;
  }, [mediaType, id]);
  const audioInfo =
    details && audio.data?.ok && audio.data.known
      ? dualAudioInfo(audio.data.languages, details.originalLanguage)
      : null;

  const wished = details ? isWishlisted(details.mediaType, details.id) : false;
  const resume = useMemo(
    () =>
      [...progress]
        .filter((item) => item.mediaType === mediaType && item.id === id)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] || null,
    [progress, mediaType, id],
  );

  const videos = useMemo(
    () => (details?.videos || []).filter((video) => video.site === 'YouTube'),
    [details],
  );
  const featuredTrailer = useMemo(
    () => videos.find((video) => video.type === 'Trailer' && video.official) || videos[0],
    [videos],
  );

  useEffect(() => {
    if (!details) return;
    const available = details.seasons.map((item) => item.seasonNumber);
    setSeason((current) => {
      if (current && available.includes(current)) return current;
      if (resume?.season && available.includes(resume.season)) return resume.season;
      return available[0] ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details?.id]);

  useEffect(() => {
    if (!details) return;
    if (mediaType === 'tv') setTab('episodes');
    const wantsEpisodes = searchParams.get('episodes') || searchParams.get('play');
    if (!wantsEpisodes || mediaType !== 'tv') return;
    const timer = window.setTimeout(() => {
      episodesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [details, mediaType, searchParams]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTrailerKey(null);
        setDownloadOpen(false);
      }
    };
    if (trailerKey || downloadOpen) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [trailerKey, downloadOpen]);

  if (loading) return <DetailsSkeleton />;

  if (error || !details) {
    return (
      <div className="page">
        <button type="button" className="back-link text-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <ErrorState message={error || 'This title could not be loaded.'} onRetry={reload} />
      </div>
    );
  }

  const year = yearOf(details.releaseDate || details.firstAirDate);
  const runtime =
    mediaType === 'movie'
      ? formatRuntime(details.runtime)
      : formatRuntime(details.episodeRunTime[0] || null);
  const networks = details.networks.map((network) => network.name).join(', ');
  const match = details.voteAverage > 0 ? Math.round(details.voteAverage * 10) : 0;
  const crew = details.crew
    .filter((member) =>
      ['Director', 'Creator', 'Writer', 'Screenplay', 'Story', 'Executive Producer'].includes(
        member.job,
      ),
    )
    .filter(
      (member, index, all) =>
        all.findIndex((entry) => entry.name === member.name && entry.job === member.job) === index,
    )
    .slice(0, 8);
  const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${details.id}`;
  const imdbUrl = details.imdbId ? `https://www.imdb.com/title/${details.imdbId}` : null;

  const openTrailer = (key?: string) => {
    const next = key || featuredTrailer?.key;
    if (next) setTrailerKey(next);
  };

  const activeSeasonNum = activeEpisode?.season ?? resume?.season ?? 1;
  const activeEpisodeNum = activeEpisode?.episode ?? resume?.episode ?? 1;

  const playLabel = resume
    ? mediaType === 'tv'
      ? `Resume ${episodeCode(resume.season, resume.episode)}`
      : 'Resume movie'
    : mediaType === 'tv'
      ? 'Play S1:E1'
      : 'Play';

  const mainPlay = () => {
    if (mediaType === 'movie') {
      navigate(`/watch/movie/${details.id}?title=${encodeURIComponent(details.title)}`);
    } else {
      navigate(
        `/watch/tv/${details.id}?season=${activeSeasonNum}&episode=${activeEpisodeNum}&title=${encodeURIComponent(details.title)}`,
      );
    }
  };

  const playEpisode = (seasonNumber: number, episodeNumber: number, name: string) => {
    setActiveEpisode({ season: seasonNumber, episode: episodeNumber });
    navigate(
      `/watch/tv/${details.id}?season=${seasonNumber}&episode=${episodeNumber}&title=${encodeURIComponent(name)}`,
    );
  };

  const fileSlug =
    details.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || `haseebflix-${mediaType}-${details.id}`;

  const saveDownload = async (label: string, action: () => Promise<{ ok: boolean; canceled?: boolean; error?: string }>) => {
    setDownloading(label);
    try {
      const result = await action();
      if (result.canceled) return;
      if (!result.ok) {
        toast(result.error || 'Download failed', 'error');
        return;
      }
      setDownloadOpen(false);
      toast(`Saved ${label.toLowerCase()} to disk`, 'success');
    } finally {
      setDownloading(null);
    }
  };

  const savePoster = () => {
    const url = posterUrl(details.posterPath, 'original');
    if (!url) return;
    void saveDownload('Poster', () =>
      hf.download.url({ url, filename: `${fileSlug}-poster.jpg` }),
    );
  };

  const saveBackdrop = () => {
    const url = backdropUrl(details.backdropPath, 'original');
    if (!url) return;
    void saveDownload('Backdrop', () =>
      hf.download.url({ url, filename: `${fileSlug}-backdrop.jpg` }),
    );
  };

  const saveMetadata = () => {
    const content = JSON.stringify(
      {
        app: 'Flickora',
        exportedAt: new Date().toISOString(),
        mediaType,
        audio: audio.data?.ok ? audio.data : null,
        media: details,
      },
      null,
      2,
    );
    void saveDownload('Metadata', () =>
      hf.download.text({ filename: `${fileSlug}-details.json`, content }),
    );
  };

  const tabs: { value: Tab; label: string }[] = [
    ...(mediaType === 'tv' ? [{ value: 'episodes' as Tab, label: 'Episodes' }] : []),
    { value: 'more', label: 'More Like This' },
    { value: 'details', label: 'Details & More' },
  ];

  return (
    <div className="details-page">
      <section className="details-hero">
        <div
          className="details-backdrop"
          style={{
            backgroundImage: details.backdropPath
              ? `url(${backdropUrl(details.backdropPath, 'w1280')})`
              : undefined,
          }}
        />
        <div className="details-scrim" />

        <div className="details-shell">
          <div className="details-poster-wrap">
            {details.posterPath ? (
              <img
                className="details-poster"
                src={posterUrl(details.posterPath, 'w500') || ''}
                alt={`${details.title} poster`}
              />
            ) : (
              <div className="details-poster poster-fallback">
                <span>{details.title.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            {details.voteAverage > 0 && (
              <div className="details-score">
                <Star size={14} fill="currentColor" />
                <strong>{formatScore(details.voteAverage)}</strong>
              </div>
            )}
          </div>

          <div className="details-main">
            <div className="details-eyebrow">
              <span className="type-pill">
                {mediaType === 'movie' ? <Film size={12} /> : <Tv size={12} />}
                {mediaType === 'movie' ? 'Movie' : 'TV Series'}
              </span>
              {details.status && <span className="status-pill">{details.status}</span>}
              {audioInfo?.dual && (
                <span className="status-pill accent">
                  <Languages size={11} /> Dual audio
                </span>
              )}
              {details.adult && <span className="status-pill danger">18+</span>}
            </div>

            <h1 className="details-title">{details.title}</h1>
            {details.tagline && <p className="details-tagline">“{details.tagline}”</p>}

            <div className="details-meta">
              {match > 0 && <span className="match">{match}% Match</span>}
              {year && (
                <span>
                  <Calendar size={13} /> {year}
                </span>
              )}
              {runtime && (
                <span>
                  <Clock3 size={13} /> {runtime}
                </span>
              )}
              {mediaType === 'tv' && details.numberOfSeasons > 0 && (
                <span>
                  <ListVideo size={13} /> {details.numberOfSeasons} season
                  {details.numberOfSeasons === 1 ? '' : 's'}
                </span>
              )}
              {details.voteCount > 0 && <span>{formatCount(details.voteCount)} votes</span>}
              {networks && <span>{networks}</span>}
            </div>

            <div className="details-genres">
              {details.genres.map((genre) => (
                <span key={genre.id} className="genre-pill">
                  {genre.name}
                </span>
              ))}
            </div>

            <p className="details-overview">
              {details.overview || 'No overview is available for this title yet.'}
            </p>

            <div className="details-actions">
              <button type="button" className="button details-play-btn" onClick={mainPlay}>
                <Play size={18} fill="currentColor" /> {playLabel}
              </button>
              <div className="details-secondary-row">
                <button
                  type="button"
                  className={`button details-sec-btn${wished ? ' wished' : ''}`}
                  onClick={() => toggleWishlist(details)}
                >
                  {wished ? <Check size={16} /> : <Bookmark size={16} />}
                  {wished ? 'In My List' : 'My List'}
                </button>
                {featuredTrailer && (
                  <button type="button" className="button details-sec-btn" onClick={() => openTrailer()}>
                    <Clapperboard size={16} /> Trailer
                  </button>
                )}
                <button type="button" className="button details-sec-btn" onClick={() => setDownloadOpen(true)}>
                  <Download size={16} /> Download
                </button>
                {details.homepage && (
                  <a className="button details-sec-btn icon-only" href={details.homepage} target="_blank" rel="noreferrer" aria-label="Official website">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="details-tabs" role="tablist" aria-label="Title sections">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            className={`details-tab${tab === item.value ? ' active' : ''}`}
            onClick={() => setTab(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="details-body">
        {tab === 'episodes' && mediaType === 'tv' && (
          <section className="details-section" ref={episodesRef}>
            <div className="section-head">
              <h2>Episodes</h2>
              <span className="section-note">
                {details.numberOfEpisodes} episode{details.numberOfEpisodes === 1 ? '' : 's'}
              </span>
            </div>

            <div className="season-chips hide-scrollbar" role="tablist" aria-label="Seasons">
              {details.seasons.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={season === item.seasonNumber}
                  className={`season-chip${season === item.seasonNumber ? ' active' : ''}`}
                  onClick={() => setSeason(item.seasonNumber)}
                >
                  <strong>Season {item.seasonNumber}</strong>
                  <span>{item.episodeCount} eps</span>
                </button>
              ))}
            </div>

            {seasonData.loading ? (
              <InlineLoader label="Loading episodes" />
            ) : seasonData.error ? (
              <ErrorState message={seasonData.error} onRetry={seasonData.reload} />
            ) : seasonData.data ? (
              <>
                {seasonData.data.overview && (
                  <p className="season-overview">{seasonData.data.overview}</p>
                )}
                <div className="episode-list">
                  {seasonData.data.episodes.map((episode) => {
                    const saved = progress.find(
                      (entry) =>
                        entry.mediaType === 'tv' &&
                        entry.id === id &&
                        entry.season === episode.seasonNumber &&
                        entry.episode === episode.episodeNumber,
                    );
                    const isCurrent =
                      resume?.season === episode.seasonNumber &&
                      resume?.episode === episode.episodeNumber;
                    return (
                      <article
                        key={episode.id}
                        className={`episode-row${isCurrent ? ' current' : ''}`}
                      >
                        <button
                          type="button"
                          className="episode-still"
                          onClick={() =>
                            playEpisode(episode.seasonNumber, episode.episodeNumber, episode.name)
                          }
                          aria-label={`Play ${episode.name}`}
                        >
                          {episode.stillPath ? (
                            <img src={stillUrl(episode.stillPath, 'w300') || ''} alt="" loading="lazy" />
                          ) : (
                            <span className="still-fallback">
                              <Clapperboard size={20} />
                            </span>
                          )}
                          <span className="episode-play">
                            <Play size={16} fill="currentColor" />
                          </span>
                          {saved?.percent ? (
                            <span className="episode-progress">
                              <span style={{ width: `${Math.min(100, saved.percent)}%` }} />
                            </span>
                          ) : null}
                        </button>

                        <div className="episode-info">
                          <div className="episode-title-row">
                            <span className="episode-code">
                              {episodeCode(episode.seasonNumber, episode.episodeNumber)}
                            </span>
                            <h3>{episode.name}</h3>
                            {isCurrent && <span className="now-pill">Watching</span>}
                          </div>
                          <div className="episode-meta">
                            {episode.airDate && <span>{episode.airDate}</span>}
                            {episode.runtime ? <span>{formatRuntime(episode.runtime)}</span> : null}
                            {episode.voteAverage > 0 && (
                              <span className="episode-rating">
                                <Star size={11} fill="currentColor" /> {formatScore(episode.voteAverage)}
                              </span>
                            )}
                          </div>
                          <p>{episode.overview || 'No episode description yet.'}</p>
                        </div>

                        <button
                          type="button"
                          className="icon-button bordered episode-row-play"
                          aria-label={`Play ${episode.name}`}
                          onClick={() =>
                            playEpisode(episode.seasonNumber, episode.episodeNumber, episode.name)
                          }
                        >
                          <Play size={16} fill="currentColor" />
                        </button>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="muted">Select a season to see its episodes.</p>
            )}
          </section>
        )}

        {tab === 'more' && (
          <div className="details-section">
            {details.recommendations.length > 0 ? (
              <MediaRow
                title="More Like This"
                items={details.recommendations}
                seeAllTo={`/${mediaType === 'movie' ? 'movies' : 'tv'}`}
              />
            ) : (
              <p className="muted">No recommendations available for this title.</p>
            )}
          </div>
        )}

        {tab === 'details' && (
          <>
            <section className="details-section">
              <div className="section-head">
                <h2>Storyline</h2>
              </div>
              <p className="storyline">
                {details.overview || 'No overview is available for this title yet.'}
              </p>
              <dl className="story-facts">
                <div>
                  <dt>Original title</dt>
                  <dd>{details.originalTitle || details.title}</dd>
                </div>
                <div>
                  <dt>{mediaType === 'movie' ? 'Release date' : 'First aired'}</dt>
                  <dd>{details.releaseDate || details.firstAirDate || '—'}</dd>
                </div>
                {mediaType === 'tv' && details.lastAirDate && (
                  <div>
                    <dt>Last aired</dt>
                    <dd>{details.lastAirDate}</dd>
                  </div>
                )}
                <div>
                  <dt>Status</dt>
                  <dd>{details.status || '—'}</dd>
                </div>
              </dl>
            </section>

            {details.cast.length > 0 && (
              <section className="details-section">
                <div className="section-head">
                  <h2>Cast</h2>
                </div>
                <div className="cast-scroller hide-scrollbar">
                  {details.cast.map((member) => (
                    <div key={`${member.id}-${member.order}`} className="cast-card">
                      <div className="cast-avatar">
                        {member.profilePath ? (
                          <img src={profileUrl(member.profilePath, 'w185') || ''} alt="" loading="lazy" />
                        ) : (
                          <span>{member.name.slice(0, 1)}</span>
                        )}
                      </div>
                      <strong>{member.name}</strong>
                      <span>{member.character || '—'}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="side-card">
              <h3>
                <Info size={15} /> Details
              </h3>
              <dl className="side-list">
                <div>
                  <dt>Type</dt>
                  <dd>{mediaType === 'movie' ? 'Movie' : 'TV Series'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{details.status || '—'}</dd>
                </div>
                {year && (
                  <div>
                    <dt>Year</dt>
                    <dd>{year}</dd>
                  </div>
                )}
                {runtime && (
                  <div>
                    <dt>{mediaType === 'movie' ? 'Runtime' : 'Episode runtime'}</dt>
                    <dd>{runtime}</dd>
                  </div>
                )}
                {mediaType === 'tv' && (
                  <div>
                    <dt>Seasons</dt>
                    <dd>{details.numberOfSeasons}</dd>
                  </div>
                )}
                {networks && (
                  <div>
                    <dt>Network</dt>
                    <dd>{networks}</dd>
                  </div>
                )}
                {details.countries.length > 0 && (
                  <div>
                    <dt>{details.countries.length === 1 ? 'Country' : 'Countries'}</dt>
                    <dd>{details.countries.join(', ')}</dd>
                  </div>
                )}
                {mediaType === 'movie' &&
                  audio.data?.ok &&
                  audio.data.known &&
                  audio.data.languages.length > 0 && (
                    <div>
                      <dt>Audio</dt>
                      <dd>{audio.data.languages.join(', ')}</dd>
                    </div>
                  )}
                {details.voteAverage > 0 && (
                  <div>
                    <dt>Rating</dt>
                    <dd>
                      <Star size={11} fill="currentColor" className="inline-star" />{' '}
                      {formatScore(details.voteAverage)} / 10
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {crew.length > 0 && (
              <section className="side-card">
                <h3>
                  <Clapperboard size={15} /> Crew
                </h3>
                <dl className="side-list">
                  {crew.map((member) => (
                    <div key={`${member.id}-${member.job}`}>
                      <dt>{member.job}</dt>
                      <dd>{member.name}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section className="side-card">
              <h3>
                <ExternalLink size={15} /> Links
              </h3>
              <div className="side-links">
                <a href={tmdbUrl} target="_blank" rel="noreferrer">
                  The Movie Database <ChevronRight size={14} />
                </a>
                {imdbUrl && (
                  <a href={imdbUrl} target="_blank" rel="noreferrer">
                    IMDb <ChevronRight size={14} />
                  </a>
                )}
                {details.homepage && (
                  <a href={details.homepage} target="_blank" rel="noreferrer">
                    Official site <ChevronRight size={14} />
                  </a>
                )}
              </div>
            </section>

            {wished && (
              <p className="side-note">
                <Check size={14} /> Saved to your list
              </p>
            )}
          </>
        )}
      </div>

      {trailerKey && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Trailer">
          <div className="trailer-modal">
            <div className="trailer-head">
              <div>
                <span className="eyebrow">Trailer</span>
                <h3>{details.title}</h3>
              </div>
              <button type="button" className="icon-button" aria-label="Close trailer" onClick={() => setTrailerKey(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="trailer-frame">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                title={`${details.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              />
            </div>
            {videos.length > 1 && (
              <div className="trailer-list hide-scrollbar">
                {videos.slice(0, 6).map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    className={`trailer-chip${video.key === trailerKey ? ' active' : ''}`}
                    onClick={() => setTrailerKey(video.key)}
                  >
                    {video.type} · {video.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {downloadOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Download options">
          <div className="download-modal">
            <div className="trailer-head">
              <div>
                <span className="eyebrow">Save offline</span>
                <h3>{details.title}</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close download options"
                onClick={() => setDownloadOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="download-intro">
              Keep the artwork and metadata for this title on your device.
            </p>

            <div className="download-options">
              <button
                type="button"
                className="download-option"
                onClick={savePoster}
                disabled={!details.posterPath || downloading !== null}
              >
                <span className="download-option-icon">
                  <ImageIcon size={18} />
                </span>
                <span className="download-option-copy">
                  <strong>{downloading === 'Poster' ? 'Saving poster…' : 'Poster'}</strong>
                  <small>JPG · full resolution</small>
                </span>
                <Download size={16} />
              </button>

              <button
                type="button"
                className="download-option"
                onClick={saveBackdrop}
                disabled={!details.backdropPath || downloading !== null}
              >
                <span className="download-option-icon">
                  <Images size={18} />
                </span>
                <span className="download-option-copy">
                  <strong>{downloading === 'Backdrop' ? 'Saving backdrop…' : 'Backdrop'}</strong>
                  <small>JPG · full resolution</small>
                </span>
                <Download size={16} />
              </button>

              <button
                type="button"
                className="download-option"
                onClick={saveMetadata}
                disabled={downloading !== null}
              >
                <span className="download-option-icon">
                  <FileJson size={18} />
                </span>
                <span className="download-option-copy">
                  <strong>{downloading === 'Metadata' ? 'Saving metadata…' : 'Details (JSON)'}</strong>
                  <small>Title, cast, crew, episodes, and artwork paths</small>
                </span>
                <Download size={16} />
              </button>
            </div>

            <p className="download-note">
              <Info size={15} />
              <span>
                Video files cannot be saved. Flickora plays titles through the VidRift embed, which
                streams the video and does not expose a downloadable file.
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
