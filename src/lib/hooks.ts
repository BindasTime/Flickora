import { useCallback, useEffect, useRef, useState } from 'react';

export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useAsync<T>(
  factory: () => Promise<T>,
  deps: unknown[],
  refreshMs = 0,
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    factoryRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  // Periodic background refresh: keep the current data on screen and swap in
  // the new response when it lands, so a scheduled update never flashes a
  // skeleton or blanks the section.
  useEffect(() => {
    if (!refreshMs) return;
    const timer = window.setInterval(() => setRefreshTick((value) => value + 1), refreshMs);
    return () => window.clearInterval(timer);
  }, [refreshMs]);

  useEffect(() => {
    if (!refreshTick) return;
    let cancelled = false;
    factoryRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch(() => {
        // Keep the last good data; the next tick tries again.
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { data, loading, error, reload };
}

export interface InfiniteState<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalResults: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

export function useInfinite<T>(
  fetchPage: (
    page: number,
    onItem?: (item: T) => void,
  ) => Promise<{ items: T[]; page: number; totalPages: number; totalResults: number }>,
  deps: unknown[],
  enabled = true,
): InfiniteState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const requestRef = useRef(0);
  const keyOf = (item: T) =>
    `${(item as { mediaType?: string }).mediaType}-${(item as { id?: number }).id}`;
  // Slow loaders (audio scans) report results as they confirm, so the grid can
  // fill in progressively instead of waiting for the whole batch.
  const appendItem = (item: T) =>
    setItems((current) =>
      current.some((entry) => keyOf(entry) === keyOf(item)) ? current : [...current, item],
    );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setItems([]);
      setPage(0);
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    setItems([]);
    setPage(0);
    setTotalPages(1);
    setTotalResults(0);
    const stream = (item: T) => {
      if (requestRef.current === requestId) appendItem(item);
    };
    fetchRef
      .current(1, stream)
      .then((result) => {
        if (requestRef.current !== requestId) return;
        setItems(result.items);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalResults(result.totalResults);
      })
      .catch((err: unknown) => {
        if (requestRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    if (page >= totalPages) return;
    const nextPage = page + 1;
    const requestId = requestRef.current;
    // Pressing "Try loading more again" after a failed page must clear that
    // error and re-request the same page; leaving it set made retries a no-op.
    setError(null);
    setLoadingMore(true);
    const stream = (item: T) => {
      if (requestRef.current === requestId) appendItem(item);
    };
    fetchRef
      .current(nextPage, stream)
      .then((result) => {
        if (requestRef.current !== requestId) return;
        setItems((current) => {
          const seen = new Set(current.map((item: any) => `${item.mediaType}-${item.id}`));
          const fresh = result.items.filter((item: any) => !seen.has(`${item.mediaType}-${item.id}`));
          return [...current, ...fresh];
        });
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalResults(result.totalResults);
      })
      .catch((err: unknown) => {
        if (requestRef.current === requestId) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoadingMore(false);
      });
  }, [loading, loadingMore, page, totalPages]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return {
    items,
    page,
    totalPages,
    totalResults,
    loading,
    loadingMore,
    error,
    hasMore: page < totalPages,
    loadMore,
    reload,
  };
}

export function useInfiniteScroll(callback: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callbackRef.current();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}
