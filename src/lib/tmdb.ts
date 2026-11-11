import { hf } from './bridge';
import type {
  CastMember,
  CrewMember,
  Episode,
  Genre,
  ListKind,
  MediaDetails,
  MediaSummary,
  MediaType,
  PagedResult,
  SeasonDetails,
  SeasonSummary,
} from './types';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

export function imageUrl(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}${size}${path}`;
}

export function posterUrl(path: string | null | undefined, size = 'w500') {
  return imageUrl(path, size);
}

export function backdropUrl(path: string | null | undefined, size = 'w1280') {
  return imageUrl(path, size);
}

export function profileUrl(path: string | null | undefined, size = 'w185') {
  return imageUrl(path, size);
}

export function stillUrl(path: string | null | undefined, size = 'w300') {
  return imageUrl(path, size);
}

function notifyOffline(stale: boolean) {
  window.dispatchEvent(new CustomEvent('hf:offline', { detail: stale }));
}

let clientCache = new Map<string, { at: number; data: unknown }>();
const CLIENT_TTL = 60_000;

async function get<T>(path: string, query: Record<string, string | number | boolean> = {}): Promise<T> {
  const key = `${path}?${JSON.stringify(query)}`;
  const hit = clientCache.get(key);
  if (hit && Date.now() - hit.at < CLIENT_TTL) return hit.data as T;

  const res = await hf.tmdb<T>(path, query);
  notifyOffline(Boolean(res.stale));
  if (!res.ok || res.data === undefined) throw new Error(res.error || 'Request failed');
  clientCache.set(key, { at: Date.now(), data: res.data });
  return res.data;
}

export function clearClientCache() {
  clientCache = new Map();
}

interface RawSummary {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
  genre_ids?: number[];
  adult?: boolean;
  original_language?: string;
  media_type?: string;
}

interface RawPaged {
  page: number;
  total_pages: number;
  total_results: number;
  results: RawSummary[];
}

interface RawDetails extends RawSummary {
  tagline?: string;
  status?: string;
  homepage?: string | null;
  production_countries?: { iso_3166_1: string; name: string }[];
  origin_country?: string[];
  genres?: Genre[];
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  last_air_date?: string | null;
  in_production?: boolean;
  networks?: { id: number; name: string; logo_path: string | null }[];
  seasons?: {
    id: number;
    season_number: number;
    name: string;
    overview: string;
    poster_path: string | null;
    air_date: string | null;
    episode_count: number;
    vote_average: number;
  }[];
  credits?: {
    cast?: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
      order: number;
    }[];
    crew?: {
      id: number;
      name: string;
      job: string;
      department: string;
      profile_path: string | null;
    }[];
  };
  videos?: {
    results?: {
      id: string;
      key: string;
      name: string;
      site: string;
      type: string;
      official: boolean;
    }[];
  };
  recommendations?: { results?: RawSummary[] };
  external_ids?: { imdb_id?: string | null };
  imdb_id?: string | null;
}

export function normalizeSummary(raw: RawSummary, fallbackType?: MediaType): MediaSummary {
  const mediaType: MediaType =
    raw.media_type === 'tv' || raw.media_type === 'movie'
      ? (raw.media_type as MediaType)
      : fallbackType || (raw.title ? 'movie' : 'tv');
  return {
    id: raw.id,
    mediaType,
    title: raw.title || raw.name || 'Untitled',
    originalTitle: raw.original_title || raw.original_name || raw.title || raw.name || '',
    overview: raw.overview || '',
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    voteAverage: raw.vote_average ?? 0,
    voteCount: raw.vote_count ?? 0,
    releaseDate: raw.release_date || raw.first_air_date || null,
    popularity: raw.popularity ?? 0,
    genreIds: raw.genre_ids ?? [],
    adult: Boolean(raw.adult),
    originalLanguage: raw.original_language || '',
  };
}

function normalizePaged(raw: RawPaged, type: MediaType): PagedResult<MediaSummary> {
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    items: (raw.results || []).map((item) => normalizeSummary(item, type)),
  };
}

const listPath: Record<ListKind, (type: MediaType) => string> = {
  trending: (type) => `trending/${type}/day`,
  popular: (type) => `${type}/popular`,
  top_rated: (type) => `${type}/top_rated`,
  now_playing: (type) => (type === 'movie' ? 'movie/now_playing' : 'tv/on_the_air'),
  upcoming: () => 'movie/upcoming',
  latest: () => 'discover/movie',
  dual_audio: () => 'discover/movie',
  south_hindi: () => 'discover/movie',
  discover: (type) => `discover/${type}`,
};

function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export interface DiscoverOptions {
  page?: number;
  genreId?: number;
  country?: string;
  originalLanguage?: string;
  /**
   * Called the moment a title's audio check passes, so an audio scan can fill
   * the grid while the rest of the batch is still being verified.
   */
  onItem?: (media: MediaSummary) => void;
}

/**
 * Country-aware discover query.
 *
 * TMDB's dedicated list endpoints (trending/popular/upcoming/on-the-air) cannot
 * be filtered by origin country, and `movie/upcoming` mixes in titles that have
 * already been released. When a country or genre filter is active — and for the
 * upcoming shelf in every case — use `discover/{type}` with explicit dates so
 * the result set is exactly what the UI claims it is.
 */
export async function discoverTitles(
  type: MediaType,
  kind: ListKind,
  options: DiscoverOptions = {},
): Promise<PagedResult<MediaSummary>> {
  const { page = 1, genreId, country, originalLanguage } = options;
  const query: Record<string, string | number | boolean> = {
    page,
    sort_by: kind === 'top_rated' ? 'vote_average.desc' : 'popularity.desc',
  };

  const minVotes = kind === 'upcoming' ? 0 : kind === 'top_rated' ? (type === 'movie' ? 300 : 150) : 25;
  if (minVotes > 0) query['vote_count.gte'] = minVotes;
  if (country) query.with_origin_country = country;
  if (genreId) query.with_genres = genreId;
  if (originalLanguage) query.with_original_language = originalLanguage;

  if (type === 'movie') {
    if (kind === 'upcoming') {
      // Only titles whose primary release date is still in the future.
      query['primary_release_date.gte'] = isoDate(1);
    } else if (kind === 'now_playing') {
      query['primary_release_date.gte'] = isoDate(-45);
      query['primary_release_date.lte'] = isoDate(0);
    }
  } else if (kind === 'now_playing') {
    query['first_air_date.lte'] = isoDate(0);
    // Only currently returning shows belong under "On the air".
    query.with_status = 0;
  }

  const raw = await get<RawPaged>(`discover/${type}`, query);
  const paged = normalizePaged(raw, type);
  if (kind !== 'upcoming') return paged;

  // Belt-and-suspenders: even if TMDB returns a title with a past date because
  // of a regional release, never show it under Coming soon.
  const today = isoDate(0);
  const items = paged.items.filter((item) => Boolean(item.releaseDate) && item.releaseDate! > today);
  return {
    ...paged,
    items,
    totalResults: Math.max(0, paged.totalResults - (paged.items.length - items.length)),
  };
}

export async function fetchList(
  type: MediaType,
  kind: ListKind,
  page = 1,
): Promise<PagedResult<MediaSummary>> {
  if (kind === 'dual_audio') {
    if (type !== 'movie') throw new Error('Dual audio is only available for movies');
    return fetchDualAudioMovies({ page });
  }
  if (kind === 'upcoming') return discoverTitles(type, kind, { page });
  if (kind === 'latest') return fetchLatestMovies({ page });
  if (kind === 'south_hindi') return fetchSouthHindiMovies({ page });
  const raw = await get<RawPaged>(listPath[kind](type), { page });
  return normalizePaged(raw, type);
}

/**
 * Movies released so far in the current calendar month, newest first. The home
 * shelf refreshes itself every 30 minutes, so the range is recomputed on every
 * call and the list rolls over automatically when a new month starts.
 */
export async function fetchLatestMovies(
  options: DiscoverOptions = {},
): Promise<PagedResult<MediaSummary>> {
  const { page = 1, genreId, country } = options;
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = isoDate(0);
  const query: Record<string, string | number | boolean> = {
    page,
    sort_by: 'primary_release_date.desc',
    'primary_release_date.gte': monthStart,
    'primary_release_date.lte': today,
    'vote_count.gte': 5,
  };
  if (country) query.with_origin_country = country;
  if (genreId) query.with_genres = genreId;
  const raw = await get<RawPaged>('discover/movie', query);
  const paged = normalizePaged(raw, 'movie');
  // Regional release plans can report dates ahead of today, and some entries
  // have no artwork at all — neither belongs on a "latest releases" shelf.
  return {
    ...paged,
    items: paged.items.filter(
      (item) =>
        Boolean(item.posterPath) && Boolean(item.releaseDate) && item.releaseDate! <= today,
    ),
  };
}

export async function searchMedia(
  type: MediaType | 'multi',
  query: string,
  page = 1,
): Promise<PagedResult<MediaSummary>> {
  const raw = await get<RawPaged>(`search/${type}`, { query, page });
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    items: (raw.results || [])
      .filter((item) => item.media_type !== 'person')
      .map((item) => normalizeSummary(item, type === 'multi' ? undefined : type)),
  };
}

function normalizeDetails(raw: RawDetails, type: MediaType): MediaDetails {
  const base = normalizeSummary(raw, type);
  const genres = raw.genres || [];
  const namedCountries = (raw.production_countries || [])
    .map((country) => country.name)
    .filter(Boolean);
  const countries = namedCountries.length ? namedCountries : raw.origin_country || [];
  return {
    ...base,
    tagline: raw.tagline || '',
    status: raw.status || '',
    homepage: raw.homepage || null,
    countries: [...new Set(countries)],
    genres,
    runtime: raw.runtime ?? null,
    episodeRunTime: raw.episode_run_time || [],
    numberOfSeasons: raw.number_of_seasons ?? 0,
    numberOfEpisodes: raw.number_of_episodes ?? 0,
    firstAirDate: raw.first_air_date || raw.release_date || null,
    lastAirDate: raw.last_air_date || null,
    inProduction: Boolean(raw.in_production),
    networks: (raw.networks || []).map((n) => ({ id: n.id, name: n.name, logoPath: n.logo_path })),
    seasons: (raw.seasons || [])
      .filter((s) => s.season_number > 0)
      .map<SeasonSummary>((s) => ({
        id: s.id,
        seasonNumber: s.season_number,
        name: s.name,
        overview: s.overview,
        posterPath: s.poster_path,
        airDate: s.air_date,
        episodeCount: s.episode_count,
        voteAverage: s.vote_average,
      })),
    cast: (raw.credits?.cast || []).slice(0, 24).map<CastMember>((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
      order: c.order,
    })),
    crew: (raw.credits?.crew || []).map<CrewMember>((c) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
      profilePath: c.profile_path,
    })),
    videos: (raw.videos?.results || []).filter((v) => v.site === 'YouTube'),
    recommendations: (raw.recommendations?.results || [])
      .slice(0, 18)
      .map((item) => normalizeSummary(item, type)),
    imdbId: raw.external_ids?.imdb_id || raw.imdb_id || null,
  };
}

export async function fetchDetails(type: MediaType, id: number): Promise<MediaDetails> {
  const raw = await get<RawDetails>(`${type}/${id}`, {
    append_to_response: 'credits,videos,external_ids,recommendations',
  });
  return normalizeDetails(raw, type);
}

interface RawSeason {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episodes?: {
    id: number;
    episode_number: number;
    season_number: number;
    name: string;
    overview: string;
    still_path: string | null;
    air_date: string | null;
    runtime: number | null;
    vote_average: number;
    vote_count: number;
  }[];
}

export async function fetchSeason(tvId: number, seasonNumber: number): Promise<SeasonDetails> {
  const raw = await get<RawSeason>(`tv/${tvId}/season/${seasonNumber}`);
  return {
    id: raw.id,
    seasonNumber: raw.season_number,
    name: raw.name,
    overview: raw.overview,
    posterPath: raw.poster_path,
    airDate: raw.air_date,
    episodes: (raw.episodes || []).map<Episode>((e) => ({
      id: e.id,
      episodeNumber: e.episode_number,
      seasonNumber: e.season_number,
      name: e.name,
      overview: e.overview,
      stillPath: e.still_path,
      airDate: e.air_date,
      runtime: e.runtime,
      voteAverage: e.vote_average,
      voteCount: e.vote_count,
    })),
  };
}

export function buildEmbedUrl(
  type: MediaType,
  id: number,
  options: { season?: number; episode?: number; title?: string; branding?: boolean },
): string {
  const url = new URL(
    type === 'movie' ? `/embed/movie/${id}` : `/embed/tv/${id}/${options.season ?? 1}/${options.episode ?? 1}`,
    'https://embed.vidrift.net',
  );
  if (options.title) url.searchParams.set('title', options.title);
  if (options.branding !== false) {
    url.searchParams.set('brand', 'Cinevra');
    url.searchParams.set('brandColor', 'e11d2f');
    url.searchParams.set('showTitle', '1');
    url.searchParams.set('exit', '1');
  }
  return url.toString();
}

export const LANGUAGES: { value: string; label: string }[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { value: 'ur-PK', label: 'اردو (Urdu)' },
  { value: 'ar-SA', label: 'العربية (Arabic)' },
  { value: 'bn-BD', label: 'বাংলা (Bengali)' },
  { value: 'es-ES', label: 'Español (Spanish)' },
  { value: 'fr-FR', label: 'Français (French)' },
  { value: 'de-DE', label: 'Deutsch (German)' },
  { value: 'pt-BR', label: 'Português (Brazil)' },
  { value: 'ru-RU', label: 'Русский (Russian)' },
  { value: 'tr-TR', label: 'Türkçe (Turkish)' },
  { value: 'id-ID', label: 'Bahasa Indonesia' },
  { value: 'ja-JP', label: '日本語 (Japanese)' },
  { value: 'ko-KR', label: '한국어 (Korean)' },
  { value: 'zh-CN', label: '简体中文 (Chinese)' },
];

export const REGIONS: { value: string; label: string }[] = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'IN', label: 'India' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'BR', label: 'Brazil' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
];

export const GENRES: Record<MediaType, { id: number; name: string }[]> = {
  movie: [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Sci-Fi' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' },
  ],
  tv: [
    { id: 10759, name: 'Action & Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 9648, name: 'Mystery' },
    { id: 10764, name: 'Reality' },
    { id: 10765, name: 'Sci-Fi & Fantasy' },
    { id: 10766, name: 'Soap' },
    { id: 10768, name: 'War & Politics' },
    { id: 37, name: 'Western' },
  ],
};

/**
 * Map the English audio labels VidRift uses in its Orion stream names onto ISO
 * 639-1 codes, so we can tell a real dub apart from a duplicate listing of the
 * title's original language. Unknown labels are treated as distinct.
 */
const AUDIO_LANGUAGE_CODES: Record<string, string> = {
  hindi: 'hi',
  english: 'en',
  tamil: 'ta',
  telugu: 'te',
  malayalam: 'ml',
  kannada: 'kn',
  marathi: 'mr',
  gujarati: 'gu',
  punjabi: 'pa',
  bengali: 'bn',
  bangla: 'bn',
  urdu: 'ur',
  nepali: 'ne',
  sinhala: 'si',
  french: 'fr',
  spanish: 'es',
  'latin american spanish': 'es',
  'castilian spanish': 'es',
  'european spanish': 'es',
  portuguese: 'pt',
  'brazilian portuguese': 'pt',
  'european portuguese': 'pt',
  german: 'de',
  italian: 'it',
  russian: 'ru',
  ukrainian: 'uk',
  polish: 'pl',
  czech: 'cs',
  slovak: 'sk',
  hungarian: 'hu',
  romanian: 'ro',
  bulgarian: 'bg',
  serbian: 'sr',
  croatian: 'hr',
  slovenian: 'sl',
  greek: 'el',
  turkish: 'tr',
  arabic: 'ar',
  hebrew: 'he',
  persian: 'fa',
  farsi: 'fa',
  dari: 'fa',
  pashto: 'ps',
  swahili: 'sw',
  amharic: 'am',
  somali: 'so',
  afrikaans: 'af',
  dutch: 'nl',
  flemish: 'nl',
  swedish: 'sv',
  norwegian: 'no',
  danish: 'da',
  finnish: 'fi',
  icelandic: 'is',
  estonian: 'et',
  latvian: 'lv',
  lithuanian: 'lt',
  indonesian: 'id',
  malay: 'ms',
  thai: 'th',
  vietnamese: 'vi',
  filipino: 'tl',
  tagalog: 'tl',
  japanese: 'ja',
  korean: 'ko',
  chinese: 'zh',
  mandarin: 'zh',
  cantonese: 'zh',
  taiwanese: 'zh',
  'traditional chinese': 'zh',
  'simplified chinese': 'zh',
  mongolian: 'mn',
  khmer: 'km',
  lao: 'lo',
  burmese: 'my',
  georgian: 'ka',
  armenian: 'hy',
  azerbaijani: 'az',
  kazakh: 'kk',
  uzbek: 'uz',
};

function normalizeAudioLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

/**
 * A title is dual audio when VidRift publishes at least one audio track that is
 * not the title's original language. "Original" itself is the original track,
 * and labels such as "English" on an English-language film are duplicates —
 * neither counts as a dub.
 */
/**
 * True when VidRift publishes a Hindi audio track for the title. The original
 * language guard keeps a Hindi film's own track from counting as a dub; South
 * Indian titles are never Hindi-original, but the check keeps this honest.
 */
export function hasHindiAudio(
  languages: string[],
  originalLanguage: string | null | undefined,
): boolean {
  if ((originalLanguage || '').toLowerCase() === 'hi') return false;
  return languages.some((language) => {
    const normalized = normalizeAudioLabel(language);
    if (!normalized || normalized === 'original') return false;
    return AUDIO_LANGUAGE_CODES[normalized] === 'hi' || /^hindi\b/.test(normalized);
  });
}

export function dualAudioInfo(
  languages: string[],
  originalLanguage: string | null | undefined,
): { dual: boolean; dubbed: string[] } {
  const original = (originalLanguage || '').toLowerCase();
  const dubbed: string[] = [];
  for (const language of languages) {
    const normalized = normalizeAudioLabel(language);
    if (!normalized || normalized === 'original') continue;
    const code = AUDIO_LANGUAGE_CODES[normalized];
    if (original && code === original) continue;
    if (dubbed.some((entry) => entry.toLowerCase() === language.toLowerCase())) continue;
    dubbed.push(language);
  }
  return { dual: dubbed.length > 0, dubbed };
}

const DUAL_AUDIO_CANDIDATE_PAGES = 1;
const AUDIO_SCAN_CONCURRENCY = 4;
const TMDB_MAX_PAGE = 500;
/** South Indian film industries covered by the South shelf. */
const SOUTH_LANGUAGES = ['ta', 'te', 'ml', 'kn'] as const;
// Six per industry keeps one batch inside VidRift's lookup window: at ~4
// requests/second a batch finishes in seconds and the next one still has quota.
const SOUTH_CANDIDATES_PER_LANGUAGE = 6;

/**
 * Checks candidates against VidRift's published audio tracks with a small,
 * throttled pool. Titles whose embed page has no warm Orion stream list are
 * skipped, not guessed at, and a shared 429 ends the scan so the UI can show
 * what was verified instead of stalling for minutes.
 *
 * The Electron main process caches every answer, so later pages and re-opens
 * are fast.
 */
async function verifyAudioCandidates(
  candidates: MediaSummary[],
  accept: (media: MediaSummary, languages: string[]) => boolean,
  onVerified?: (media: MediaSummary) => void,
): Promise<MediaSummary[]> {
  const verified: { index: number; media: MediaSummary }[] = [];
  let cursor = 0;
  let answered = 0;
  let failed = 0;
  let throttled = 0;
  let stop = false;
  let lastError = '';
  const worker = async () => {
    while (!stop) {
      const index = cursor;
      cursor += 1;
      if (index >= candidates.length) return;
      const media = candidates[index];
      try {
        const audio = await hf.audio.lookup({ type: 'movie', id: media.id });
        if (audio.throttled) {
          failed += 1;
          throttled += 1;
          lastError = '429';
          // VidRift has shut the window. Finish the requests already in flight
          // and show what was verified instead of stalling the page for minutes.
          if (throttled >= 2) stop = true;
          continue;
        }
        if (!audio.ok) {
          failed += 1;
          lastError = audio.error || lastError;
          continue;
        }
        answered += 1;
        if (audio.known && accept(media, audio.languages)) {
          verified.push({ index, media });
          onVerified?.(media);
        }
      } catch (err) {
        failed += 1;
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(AUDIO_SCAN_CONCURRENCY, candidates.length) }, () => worker()),
  );
  if (candidates.length > 0 && answered === 0 && failed > 0) {
    const message = /429|rate limit/i.test(lastError)
      ? 'VidRift is limiting audio lookups right now. Wait a moment and try again.'
      : /only available/i.test(lastError)
        ? lastError
        : `Could not read audio tracks from VidRift${lastError ? `: ${lastError}` : ''}`;
    throw new Error(message);
  }
  verified.sort((a, b) => a.index - b.index);
  return verified.map((entry) => entry.media);
}

/**
 * A page of movies whose VidRift embed exposes a non-original audio track.
 *
 * Each UI page scans one TMDB discover page (about 20 popular candidates),
 * then verifies their audio with the shared scan pool.
 */
export async function fetchDualAudioMovies(
  options: DiscoverOptions = {},
): Promise<PagedResult<MediaSummary>> {
  const { page = 1, genreId, country, onItem } = options;
  const firstCandidatePage = (page - 1) * DUAL_AUDIO_CANDIDATE_PAGES + 1;
  const candidatePages = Array.from(
    { length: DUAL_AUDIO_CANDIDATE_PAGES },
    (_, index) => firstCandidatePage + index,
  ).filter((value) => value >= 1 && value <= TMDB_MAX_PAGE);

  if (!candidatePages.length) {
    return { page, totalPages: page, totalResults: 0, items: [] };
  }

  const candidateResults = await Promise.all(
    candidatePages.map((candidatePage) =>
      discoverTitles('movie', 'popular', {
        page: candidatePage,
        genreId,
        country,
      }),
    ),
  );

  const candidates: MediaSummary[] = [];
  const seen = new Set<number>();
  for (const result of candidateResults) {
    for (const item of result.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      candidates.push(item);
    }
  }

  const items = await verifyAudioCandidates(
    candidates,
    (media, languages) => dualAudioInfo(languages, media.originalLanguage).dual,
    onItem,
  );

  const candidateTotalPages = Math.max(0, ...candidateResults.map((result) => result.totalPages));
  return {
    page,
    totalPages: Math.min(TMDB_MAX_PAGE, Math.ceil(candidateTotalPages / DUAL_AUDIO_CANDIDATE_PAGES)),
    totalResults: 0,
    items,
  };
}

/**
 * A page of South Indian movies (Tamil, Telugu, Malayalam, Kannada) whose
 * VidRift embed publishes a Hindi audio track.
 *
 * Each UI page pulls the most popular titles from every industry, interleaves
 * them so the grid is not grouped by language, then verifies their audio.
 * Verified pages are cached by the Electron main process.
 */
export async function fetchSouthHindiMovies(
  options: DiscoverOptions = {},
): Promise<PagedResult<MediaSummary>> {
  const { page = 1, genreId, country, onItem } = options;
  if (page < 1 || page > TMDB_MAX_PAGE) {
    return { page, totalPages: page, totalResults: 0, items: [] };
  }

  const candidateResults = await Promise.all(
    SOUTH_LANGUAGES.map((originalLanguage) =>
      discoverTitles('movie', 'popular', { page, genreId, country, originalLanguage }),
    ),
  );

  const candidates: MediaSummary[] = [];
  const seen = new Set<number>();
  for (let index = 0; index < SOUTH_CANDIDATES_PER_LANGUAGE; index += 1) {
    for (const result of candidateResults) {
      const item = result.items[index];
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      candidates.push(item);
    }
  }

  const items = await verifyAudioCandidates(
    candidates,
    (media, languages) => hasHindiAudio(languages, media.originalLanguage),
    onItem,
  );

  const totalPages = Math.max(0, ...candidateResults.map((result) => result.totalPages));
  return {
    page,
    totalPages: Math.min(TMDB_MAX_PAGE, totalPages),
    totalResults: 0,
    items,
  };
}

export async function discoverByGenre(
  type: MediaType,
  genreId: number,
  page = 1,
): Promise<PagedResult<MediaSummary>> {
  return discoverTitles(type, 'discover', { page, genreId });
}

export interface CountryOption {
  code: string;
  name: string;
}

/** Full ISO 3166-1 list, already sorted, served by TMDB and cached on disk. */
export async function fetchCountries(): Promise<CountryOption[]> {
  const raw = await get<{ iso_3166_1: string; english_name: string }[]>('configuration/countries');
  return raw
    .filter((country) => country.iso_3166_1 && country.english_name)
    .map((country) => ({ code: country.iso_3166_1, name: country.english_name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
