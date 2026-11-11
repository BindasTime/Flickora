export function CardSkeleton() {
  return (
    <div className="card-skeleton">
      <div className="shimmer poster-shape" />
      <div className="shimmer line long" />
      <div className="shimmer line short" />
    </div>
  );
}

export function RowSkeleton({ title }: { title?: string }) {
  return (
    <section className="row">
      {title && (
        <div className="row-head">
          <div>
            <h2>{title}</h2>
          </div>
        </div>
      )}
      <div className="row-scroller">
        {Array.from({ length: 7 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

export function GridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <div className="media-grid">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
