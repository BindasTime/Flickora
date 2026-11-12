import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Play, Star } from 'lucide-react';
import type { MediaSummary } from '../lib/types';
import { backdropUrl } from '../lib/tmdb';
import { formatScore, yearOf } from '../lib/format';
import { useApp } from '../state/AppState';

export function Hero({ items, loading }: { items: MediaSummary[]; loading?: boolean }) {
  const navigate = useNavigate();
  const { settings, toggleWishlist, isWishlisted } = useApp();
  const slides = useMemo(() => items.filter((item) => item.backdropPath).slice(0, 5), [items]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (settings.reduceMotion || slides.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [settings.reduceMotion, slides.length]);

  if (loading) {
    return (
      <section className="hero hero-loading">
        <div className="hero-skeleton shimmer" />
      </section>
    );
  }

  if (!slides.length) return null;
  const media = slides[Math.min(index, slides.length - 1)];
  const year = yearOf(media.releaseDate);
  const wished = isWishlisted(media.mediaType, media.id);
  const match = media.voteAverage > 0 ? Math.round(media.voteAverage * 10) : 0;

  const play = () => {
    if (media.mediaType === 'movie') {
      navigate(`/watch/movie/${media.id}?title=${encodeURIComponent(media.title)}`);
    } else {
      navigate(`/watch/tv/${media.id}?season=1&episode=1&title=${encodeURIComponent(media.title)}`);
    }
  };

  return (
    <div className="hero-card-container">
      <section className="hero">
        <div className="hero-backdrops" aria-hidden="true">
          {slides.map((slide, slideIndex) => (
            <div
              key={slide.id}
              className={`hero-backdrop${slideIndex === index ? ' visible' : ''}`}
              style={{
                backgroundImage: `url(${backdropUrl(slide.backdropPath, 'w1280')})`,
              }}
            />
          ))}
        </div>
        <div className="hero-vignette" />

        <div className="hero-content" key={media.id}>
          <div className="hero-eyebrow">
            <span className="hero-brand-tag">
              <Play size={10} fill="currentColor" strokeWidth={0} /> Flickora Spotlight
            </span>
          </div>
          <h1 className="hero-title">{media.title}</h1>
          <div className="hero-meta">
            {match > 0 && <span className="match">{match}% Match</span>}
            {year && <span>{year}</span>}
            <span className="hero-chip">{media.mediaType === 'movie' ? 'Movie' : 'Series'}</span>
            {media.voteAverage > 0 && (
              <span className="hero-chip rating">
                <Star size={11} fill="currentColor" /> {formatScore(media.voteAverage)}
              </span>
            )}
          </div>
          <p className="hero-overview">
            {media.overview || 'A mysterious story of discovery, secrets and excitement.'}
          </p>
          <div className="hero-actions">
            <button type="button" className="button hero-watch-btn" onClick={play}>
              <Play size={18} fill="currentColor" /> Play
            </button>
            <button
              type="button"
              className={`button hero-list-btn${wished ? ' active' : ''}`}
              onClick={() => toggleWishlist(media)}
            >
              <Bookmark size={17} fill={wished ? 'currentColor' : 'none'} />
              {wished ? 'In My List' : 'My List'}
            </button>
          </div>
        </div>

        <div className="hero-dots" role="tablist" aria-label="Featured titles">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={slideIndex === index}
              aria-label={slide.title}
              className={slideIndex === index ? 'active' : ''}
              onClick={() => setIndex(slideIndex)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
