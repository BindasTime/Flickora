import { useEffect, useMemo, useRef, useState } from 'react';
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
    <div className="hero-card-container">
      <section
        className="hero hero-m3-card"
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
            <span className="hero-brand-tag">
              <Play size={10} fill="#E50914" strokeWidth={0} /> HaseebFlix Original
            </span>
          </div>
          <h1 className="hero-title">{media.title}</h1>
          <div className="hero-meta">
            <span className="hero-chip">{media.mediaType === 'movie' ? 'Movie' : 'Series'}</span>
            {year && <span className="hero-chip">{year}</span>}
            {media.voteAverage > 0 && (
              <span className="hero-chip rating">
                <Star size={11} fill="currentColor" /> {formatScore(media.voteAverage)}
              </span>
            )}
          </div>
          <p className="hero-overview">{media.overview || 'A mysterious story of discovery, secrets and excitement.'}</p>
          <div className="hero-actions">
            <button type="button" className="button primary hero-watch-btn" onClick={play}>
              <Play size={16} fill="currentColor" /> Watch Now
            </button>
            <button
              type="button"
              className={`button glass hero-list-btn${wished ? ' active' : ''}`}
              onClick={() => toggleWishlist(media)}
            >
              <Bookmark size={16} fill={wished ? 'currentColor' : 'none'} />
              {wished ? 'My List' : 'My List'}
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
    </div>
  );
}
