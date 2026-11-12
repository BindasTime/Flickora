import type { AppState } from './types';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface TmdbResponse<T> {
  ok: boolean;
  data?: T;
  stale?: boolean;
  cachedAt?: number;
  error?: string;
}

export interface AppInfo {
  version: string;
  electron: string;
  chrome: string;
  platform: string;
  userData: string;
}

export interface DownloadResult {
  ok: boolean;
  path?: string;
  canceled?: boolean;
  error?: string;
}

export interface AudioLookupResult {
  ok: boolean;
  known: boolean;
  languages: string[];
  cached?: boolean;
  throttled?: boolean;
  error?: string;
}

interface ImmersiveModePlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
  setPlaybackMode(options: { enabled: boolean }): Promise<void>;
}

const immersiveModePlugin = registerPlugin<ImmersiveModePlugin>('ImmersiveMode');

interface HfBridge {
  tmdb: <T>(path: string, query?: Record<string, string | number | boolean>) => Promise<TmdbResponse<T>>;
  state: {
    get: () => Promise<AppState>;
    update: (patch: Partial<AppState>) => Promise<AppState>;
    reset: () => Promise<AppState>;
  };
  cache: {
    clear: () => Promise<boolean>;
    stats: () => Promise<{ entries: number; bytes: number }>;
  };
  openExternal: (url: string) => Promise<boolean>;
  audio: {
    /** False in a browser tab: VidRift lookups run in the Electron main process. */
    available?: boolean;
    lookup: (options: {
      type: 'movie' | 'tv';
      id: number;
      priority?: boolean;
    }) => Promise<AudioLookupResult>;
  };
  download: {
    url: (options: { url: string; filename: string }) => Promise<DownloadResult>;
    text: (options: { filename: string; content: string }) => Promise<DownloadResult>;
  };
  appInfo: () => Promise<AppInfo>;
  confirm: (options: { title?: string; message?: string; detail?: string }) => Promise<boolean>;
  window: {
    minimize: () => Promise<void>;
    toggleMaximize: () => Promise<boolean>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    setFullScreen: (value: boolean) => Promise<boolean>;
    onState: (callback: (payload: { maximized: boolean }) => void) => () => void;
  };
}

declare global {
  interface Window {
    hf?: HfBridge;
  }
}

export const hasBridge = typeof window !== 'undefined' && Boolean(window.hf);

/** Hides Android system bars for landscape playback when running in Capacitor. */
export async function setImmersiveMode(enabled: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await immersiveModePlugin.setEnabled({ enabled });
  } catch (error) {
    console.warn('Unable to update immersive mode', error);
  }
}

/** Locks the native app to portrait except while the movie player is open. */
export async function setPlaybackOrientation(enabled: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await immersiveModePlugin.setPlaybackMode({ enabled });
  } catch (error) {
    console.warn('Unable to update playback orientation', error);
  }
}

/** Browser/Capacitor fallback so the UI also runs in mobile and web. */
const STORAGE_KEY = 'haseebflix_state';

const initialFallbackState: AppState = {
  settings: {
    apiKey: '',
    language: 'en-US',
    region: 'US',
    reduceMotion: false,
    blockPopups: true,
    autoplayNext: true,
    playerBranding: true,
  },
  wishlist: [],
  progress: [],
  recentSearches: [],
};

function loadFallbackState(): AppState {
  if (typeof window === 'undefined') return initialFallbackState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...initialFallbackState,
        ...parsed,
        settings: { ...initialFallbackState.settings, ...(parsed.settings || {}) },
        wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
        progress: Array.isArray(parsed.progress) ? parsed.progress : [],
        recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [],
      };
    }
  } catch {}
  return initialFallbackState;
}

function saveFallbackState(state: AppState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const memoryStore: { state: AppState } = {
  state: loadFallbackState(),
};

const FALLBACK_KEY = 'b2efc704c0c576e538da227ef123a501';

const fallbackBridge: HfBridge = {
  async tmdb<T>(path: string, query: Record<string, string | number | boolean> = {}) {
    try {
      const current = loadFallbackState();
      const url = new URL(path.replace(/^\//, ''), 'https://api.themoviedb.org/3/');
      const params: Record<string, string | number | boolean> = {
        language: current.settings.language || 'en-US',
        include_adult: false,
        ...query,
      };
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
      url.searchParams.set('api_key', current.settings.apiKey || FALLBACK_KEY);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`TMDB ${res.status}`);
      return { ok: true, data: (await res.json()) as T };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
  state: {
    async get() {
      const loaded = loadFallbackState();
      memoryStore.state = loaded;
      return loaded;
    },
    async update(patch) {
      const current = loadFallbackState();
      const next: AppState = {
        ...current,
        ...patch,
        settings: { ...current.settings, ...(patch.settings || {}) },
      };
      memoryStore.state = next;
      saveFallbackState(next);
      return next;
    },
    async reset() {
      memoryStore.state = initialFallbackState;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      return initialFallbackState;
    },
  },
  cache: {
    async clear() {
      return true;
    },
    async stats() {
      return { entries: 0, bytes: 0 };
    },
  },
  async openExternal(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  },
  audio: {
    available: false,
    async lookup() {
      return {
        ok: false,
        known: false,
        languages: [],
        error: 'Audio-track lookup is only available in the desktop app',
      };
    },
  },
  download: {
    async url({ url, filename }) {
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.rel = 'noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
    async text({ filename, content }) {
      try {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },
  async appInfo() {
    return {
      version: '1.0.0',
      electron: 'browser preview',
      chrome: navigator.userAgent,
      platform: 'web',
      userData: '',
    };
  },
  async confirm({ message }) {
    return window.confirm(message || 'Are you sure?');
  },
  window: {
    async minimize() {},
    async toggleMaximize() {
      return false;
    },
    async close() {},
    async isMaximized() {
      return false;
    },
    async setFullScreen(value) {
      if (value) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
      return value;
    },
    onState() {
      return () => {};
    },
  },
};

export const hf: HfBridge = typeof window !== 'undefined' && window.hf ? window.hf : fallbackBridge;
