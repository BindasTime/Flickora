import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Info, Play, Star } from 'lucide-react';
import type { MediaSummary } from '../lib/types';
import { posterUrl } from '../lib/tmdb';
import { formatScore, yearOf } from '../lib/format';
import { useApp } from '../state/AppState';

interface MediaCardProps {
  media: MediaSummary;
  rank?: number;
  className?: string;
  showMeta?: boolean;
}

function ratingClass(score: number) {
  if (score >= 8) return 'great';
  if (score >= 6.5) return 'good';
  if (score > 0) return 'ok';
  return 'none';
}

export function MediaCard({ media, rank, className = '', showMeta = true }: MediaCardProps) {
  const navigate = useNavigate();
  const { toggleWishlist, isWishlisted } = useApp();
  const [broken, setBroken] = useState(false);
  const wished = isWishlisted(media.mediaType, media.id);
  const poster = posterUrl(media.posterPath, 'w500');
  const year = yearOf(media.releaseDate);
  const meta = [year, media.mediaType === 'tv' ? 'Series' : null].filter(Boolean).join(' · ');

  const play = () => {
    if (media.mediaType === 'movie') navigate(`/watch/movie/${media.id}?title=${encodeURIComponent(media.title)}`);
    else navigate(`/title/tv/${media.id}?play=1`);
  };

  return (
    <article className={`media-card ${className}`}>
      <Link
        to={`/title/${media.mediaType}/${media.id}`}
        className="media-card-poster"
        aria-label={`${media.title}${year ? ` (${year})` : ''}`}
      >
        {poster && !broken ? (
          <img
            src={poster}
            alt=""
            loading="lazy"
            draggable={false}
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="poster-fallback">
            <span>{media.title.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        <div className="poster-sheen" />

        {rank !== undefined && <span className="rank-badge">{rank}</span>}

        {media.voteAverage > 0 && (
          <span className={`rating-chip ${ratingClass(media.voteAverage)}`}>
            <Star size={10} fill="currentColor" /> {formatScore(media.voteAverage)}
          </span>
        )}

        <div className="poster-actions">
          <button
            type="button"
            className="icon-button solid"
            aria-label={`Play ${media.title}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              play();
            }}
          >
            <Play size={16} fill="currentColor" />
          </button>
          <button
            type="button"
            className={`icon-button${wished ? ' active' : ''}`}
            aria-label={wished ? 'Remove from list' : 'Add to list'}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleWishlist(media);
            }}
          >
            <Bookmark size={15} fill={wished ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Details for ${media.title}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              navigate(`/title/${media.mediaType}/${media.id}`);
            }}
          >
            <Info size={15} />
          </button>
        </div>

        {showMeta && (
          <div className="poster-caption">
            <span className="poster-title">{media.title}</span>
            <span className="poster-meta">{meta}</span>
          </div>
        )}
      </Link>
    </article>
  );
}
