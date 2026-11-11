import { Link } from 'react-router-dom';
import { Clock3, Play, X } from 'lucide-react';
import type { ProgressItem } from '../lib/types';
import { backdropUrl, posterUrl } from '../lib/tmdb';
import { episodeCode, timeAgo } from '../lib/format';
import { useApp } from '../state/AppState';

export function continueLink(item: ProgressItem): string {
  const title = item.episodeTitle || item.title;
  if (item.mediaType === 'movie') {
    return `/watch/movie/${item.id}?title=${encodeURIComponent(title)}`;
  }
  const season = item.season ?? 1;
  const episode = item.episode ?? 1;
  return `/watch/tv/${item.id}?season=${season}&episode=${episode}&title=${encodeURIComponent(title)}`;
}

export function ContinueCard({ item }: { item: ProgressItem }) {
  const { removeProgress } = useApp();
  const art = backdropUrl(item.backdropPath, 'w780') || posterUrl(item.posterPath, 'w500');
  const percent = Math.max(2, Math.min(100, Math.round(item.percent ?? 0)));
  const label =
    item.mediaType === 'tv'
      ? `${episodeCode(item.season, item.episode)}${item.episodeTitle ? ` · ${item.episodeTitle}` : ''}`
      : 'Movie';

  return (
    <article className="continue-card">
      <Link to={continueLink(item)} className="continue-link" aria-label={`Resume ${item.title}`}>
        <div className="continue-art">
          {art && <img src={art} alt="" loading="lazy" draggable={false} />}
          <div className="continue-shade" />
          <span className="continue-play">
            <Play size={20} fill="currentColor" />
          </span>
          <span className="continue-time">
            <Clock3 size={11} /> {timeAgo(item.updatedAt)}
          </span>
        </div>
        <div className="continue-body">
          <span className="continue-title">{item.title}</span>
          <span className="continue-meta">{label}</span>
          <div className="continue-progress" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
          <span className="continue-percent">{percent}% watched</span>
        </div>
      </Link>
      <button
        type="button"
        className="continue-remove"
        aria-label={`Remove ${item.title} from continue watching`}
        onClick={() => removeProgress(item.mediaType, item.id, item.season, item.episode)}
      >
        <X size={14} />
      </button>
    </article>
  );
}
