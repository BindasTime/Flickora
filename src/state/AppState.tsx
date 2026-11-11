import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { hf } from '../lib/bridge';
import { clearClientCache } from '../lib/tmdb';
import type {
  AppState,
  MediaDetails,
  MediaSummary,
  MediaType,
  ProgressItem,
  Settings,
  WishlistItem,
} from '../lib/types';
import { yearOf } from '../lib/format';

type ToastKind = 'success' | 'info' | 'error';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface AppContextValue {
  ready: boolean;
  settings: Settings;
  wishlist: WishlistItem[];
  progress: ProgressItem[];
  recentSearches: string[];
  offline: boolean;
  toasts: Toast[];
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  toggleWishlist: (media: MediaSummary | MediaDetails) => void;
  isWishlisted: (mediaType: MediaType, id: number) => boolean;
  removeWishlist: (mediaType: MediaType, id: number) => void;
  clearWishlist: () => void;
  recordProgress: (item: Omit<ProgressItem, 'updatedAt'>) => void;
  removeProgress: (mediaType: MediaType, id: number, season?: number, episode?: number) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  resetAll: () => Promise<void>;
  clearCaches: () => Promise<void>;
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
}

export const defaultSettings: Settings = {
  apiKey: '',
  language: 'en-US',
  region: 'US',
  reduceMotion: false,
  blockPopups: true,
  autoplayNext: true,
  playerBranding: true,
};

export const emptyState: AppState = {
  settings: defaultSettings,
  wishlist: [],
  progress: [],
  recentSearches: [],
};

const AppContext = createContext<AppContextValue | null>(null);

function wishlistFromMedia(media: MediaSummary | MediaDetails): WishlistItem {
  return {
    mediaType: media.mediaType,
    id: media.id,
    title: media.title,
    posterPath: media.posterPath,
    voteAverage: media.voteAverage,
    year: yearOf(media.releaseDate),
    addedAt: Date.now(),
  };
}

function normalizeLoaded(loaded: AppState | null | undefined): AppState {
  return {
    ...emptyState,
    ...loaded,
    settings: { ...defaultSettings, ...(loaded?.settings || {}) },
    wishlist: loaded?.wishlist || [],
    progress: loaded?.progress || [],
    recentSearches: loaded?.recentSearches || [],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void hf.state.get().then((loaded) => {
      if (cancelled) return;
      const merged = normalizeLoaded(loaded);
      setState(merged);
      setReady(true);
      document.documentElement.dataset.reduceMotion = String(merged.settings.reduceMotion);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const listener = (event: Event) => {
      setOffline(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener('hf:offline', listener);
    return () => window.removeEventListener('hf:offline', listener);
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++toastId.current;
    setToasts((current) => [...current.slice(-2), { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3400);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const current = stateRef.current;
    const settings = { ...current.settings, ...patch };
    commit({ ...current, settings });
    document.documentElement.dataset.reduceMotion = String(settings.reduceMotion);
    if ('language' in patch || 'region' in patch || 'apiKey' in patch) {
      clearClientCache();
    }
    await hf.state.update({ settings });
  }, [commit]);

  const toggleWishlist = useCallback(
    (media: MediaSummary | MediaDetails) => {
      const current = stateRef.current;
      const exists = current.wishlist.some(
        (item) => item.id === media.id && item.mediaType === media.mediaType,
      );
      const wishlist = exists
        ? current.wishlist.filter(
            (item) => !(item.id === media.id && item.mediaType === media.mediaType),
          )
        : [wishlistFromMedia(media), ...current.wishlist];
      commit({ ...current, wishlist });
      void hf.state.update({ wishlist });
      toast(exists ? 'Removed from wishlist' : 'Added to wishlist', exists ? 'info' : 'success');
    },
    [commit, toast],
  );

  const isWishlisted = useCallback(
    (mediaType: MediaType, id: number) =>
      state.wishlist.some((item) => item.mediaType === mediaType && item.id === id),
    [state.wishlist],
  );

  const removeWishlist = useCallback(
    (mediaType: MediaType, id: number) => {
      const current = stateRef.current;
      const wishlist = current.wishlist.filter(
        (item) => !(item.mediaType === mediaType && item.id === id),
      );
      commit({ ...current, wishlist });
      void hf.state.update({ wishlist });
    },
    [commit],
  );

  const clearWishlist = useCallback(() => {
    const current = stateRef.current;
    commit({ ...current, wishlist: [] });
    void hf.state.update({ wishlist: [] });
  }, [commit]);

  const recordProgress = useCallback(
    (item: Omit<ProgressItem, 'updatedAt'>) => {
      const current = stateRef.current;
      const filtered = current.progress.filter(
        (entry) =>
          !(
            entry.mediaType === item.mediaType &&
            entry.id === item.id &&
            entry.season === item.season &&
            entry.episode === item.episode
          ),
      );
      const progress = [{ ...item, updatedAt: Date.now() }, ...filtered].slice(0, 40);
      commit({ ...current, progress });
      void hf.state.update({ progress });
    },
    [commit],
  );

  const removeProgress = useCallback(
    (mediaType: MediaType, id: number, season?: number, episode?: number) => {
      const current = stateRef.current;
      const progress = current.progress.filter(
        (entry) =>
          !(
            entry.mediaType === mediaType &&
            entry.id === id &&
            entry.season === season &&
            entry.episode === episode
          ),
      );
      commit({ ...current, progress });
      void hf.state.update({ progress });
    },
    [commit],
  );

  const addRecentSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) return;
      const current = stateRef.current;
      if (current.recentSearches[0]?.toLowerCase() === trimmed.toLowerCase()) return;
      const recentSearches = [
        trimmed,
        ...current.recentSearches.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, 8);
      commit({ ...current, recentSearches });
      void hf.state.update({ recentSearches });
    },
    [commit],
  );

  const clearRecentSearches = useCallback(() => {
    const current = stateRef.current;
    commit({ ...current, recentSearches: [] });
    void hf.state.update({ recentSearches: [] });
  }, [commit]);

  const resetAll = useCallback(async () => {
    const fresh = normalizeLoaded(await hf.state.reset());
    commit(fresh);
    clearClientCache();
    document.documentElement.dataset.reduceMotion = String(fresh.settings.reduceMotion);
    toast('App data reset', 'success');
  }, [commit, toast]);

  const clearCaches = useCallback(async () => {
    await hf.cache.clear();
    clearClientCache();
    toast('Cache cleared', 'success');
  }, [toast]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      settings: state.settings,
      wishlist: state.wishlist,
      progress: state.progress,
      recentSearches: state.recentSearches,
      offline,
      toasts,
      updateSettings,
      toggleWishlist,
      isWishlisted,
      removeWishlist,
      clearWishlist,
      recordProgress,
      removeProgress,
      addRecentSearch,
      clearRecentSearches,
      resetAll,
      clearCaches,
      toast,
      dismissToast,
    }),
    [
      ready,
      state.settings,
      state.wishlist,
      state.progress,
      state.recentSearches,
      offline,
      toasts,
      updateSettings,
      toggleWishlist,
      isWishlisted,
      removeWishlist,
      clearWishlist,
      recordProgress,
      removeProgress,
      addRecentSearch,
      clearRecentSearches,
      resetAll,
      clearCaches,
      toast,
      dismissToast,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
