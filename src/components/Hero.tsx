import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Info, Play, Star } from 'lucide-react';
import type { MediaSummary } from '../lib/types';
import { backdropUrl } from '../lib/tmdb';
import { formatScore, yearOf } from '../lib/format';
import { useApp } from '../state/AppState';

export function Hero({ items, loading }: { items: MediaSummary[]; loading?: boolean }) {
  const navigate = useNavigate();
  const { settings, toggleWishlist, isWishlisted } = useApp();
  const slides = useMemo(() => items.filter((item) => item.backdropPath).slice(0, 5), [items]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (paused || settings.reduceMotion || slides.length < 2) return;
    timer.current = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 9000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [paused, settings.reduceMotion, slides.length]);

  if (loading) {
    return (
      <section className="hero hero-loading">
        <div className="hero-skeleton" />
      </section>
    );
  }

  if (!slides.length) return null;
  const media = slides[Math.min(index, slides.length - 1)];
  const year = yearOf(media.releaseDate);
  const wished = isWishlisted(media.mediaType, media.id);
  const play = () => {
    if (media.mediaType === 'movie') {
      navigate(`/watch/movie/${media.id}?title=${encodeURIComponent(media.title)}`);
    } else {
      navigate(`/title/tv/${media.id}?play=1`);
    }
  };

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
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
          <span className="pulse-dot" />
          Trending {media.mediaType === 'movie' ? 'movie' : 'series'} · Today
        </div>
        <h1 className="hero-title">{media.title}</h1>
        <div className="hero-meta">
          {media.voteAverage > 0 && (
            <span className="hero-score">
              <Star size={14} fill="currentColor" /> {formatScore(media.voteAverage)}
              <em>/10</em>
            </span>
          )}
          {year && <span>{year}</span>}
          <span>{media.mediaType === 'movie' ? 'Movie' : 'TV Series'}</span>
          {media.voteCount > 0 && <span>{media.voteCount.toLocaleString()} votes</span>}
        </div>
        <p className="hero-overview">{media.overview || 'No overview available yet.'}</p>
        <div className="hero-actions">
          <button type="button" className="button primary" onClick={play}>
            <Play size={17} fill="currentColor" /> Play now
          </button>
          <button
            type="button"
            className="button glass"
            onClick={() => navigate(`/title/${media.mediaType}/${media.id}`)}
          >
            <Info size={17} /> More info
          </button>
          <button
            type="button"
            className={`icon-button hero-wish${wished ? ' active' : ''}`}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            onClick={() => toggleWishlist(media)}
          >
            <Heart size={18} fill={wished ? 'currentColor' : 'none'} />
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
          >
            <span />
          </button>
        ))}
      </div>
    </section>
  );
}
