import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { MediaSummary } from '../lib/types';
import { MediaCard } from './MediaCard';
import { CardSkeleton } from './Skeletons';

interface MediaRowProps {
  title: string;
  items: MediaSummary[];
  loading?: boolean;
  seeAllTo?: string;
  ranked?: boolean;
  subtitle?: string;
  rankStart?: number;
}

export function MediaRow({ title, items, loading, seeAllTo, ranked, subtitle, rankStart = 1 }: MediaRowProps) {
  const scroller = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: number) => {
    const node = scroller.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(420, node.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <section className="row">
      <div className="row-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="row-head-actions">
          {seeAllTo && (
            <Link className="see-all" to={seeAllTo}>
              See all <ChevronRight size={14} />
            </Link>
          )}
          <div className="row-arrows">
            <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label="Scroll right" onClick={() => scroll(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="row-scroller" ref={scroller}>
        {loading
          ? Array.from({ length: 7 }).map((_, index) => <CardSkeleton key={index} />)
          : items.map((item, index) => (
              <MediaCard
                key={`${item.mediaType}-${item.id}`}
                media={item}
                rank={ranked ? rankStart + index : undefined}
                className={ranked ? 'ranked' : ''}
              />
            ))}
        {!loading && items.length === 0 && (
          <div className="row-empty">Nothing here yet — check back soon.</div>
        )}
      </div>
    </section>
  );
}
