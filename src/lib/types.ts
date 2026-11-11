export type MediaType = 'movie' | 'tv';

export type ListKind =
  | 'trending'
  | 'popular'
  | 'top_rated'
  | 'now_playing'
  | 'upcoming'
  | 'latest'
  | 'dual_audio'
  | 'south_hindi'
  | 'discover';

export interface MediaSummary {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount: number;
  releaseDate: string | null;
  popularity: number;
  genreIds: number[];
  adult: boolean;
  originalLanguage: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath: string | null;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface SeasonSummary {
  id: number;
  seasonNumber: number;
  name: string;
  overview: string;
  posterPath: string | null;
  airDate: string | null;
  episodeCount: number;
  voteAverage: number;
}

export interface Episode {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview: string;
  stillPath: string | null;
  airDate: string | null;
  runtime: number | null;
  voteAverage: number;
  voteCount: number;
}

export interface MediaDetails extends MediaSummary {
  tagline: string;
  status: string;
  homepage: string | null;
  countries: string[];
  genres: Genre[];
  runtime: number | null;
  episodeRunTime: number[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
  firstAirDate: string | null;
  lastAirDate: string | null;
  inProduction: boolean;
  networks: { id: number; name: string; logoPath: string | null }[];
  seasons: SeasonSummary[];
  cast: CastMember[];
  crew: CrewMember[];
  videos: Video[];
  recommendations: MediaSummary[];
  imdbId: string | null;
}

export interface SeasonDetails {
  id: number;
  seasonNumber: number;
  name: string;
  overview: string;
  posterPath: string | null;
  airDate: string | null;
  episodes: Episode[];
}

export interface PagedResult<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  items: T[];
}

export interface WishlistItem {
  mediaType: MediaType;
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  year: string | null;
  addedAt: number;
}

export interface ProgressItem {
  mediaType: MediaType;
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  /** Position in seconds, when reported by the player. */
  position?: number;
  /** Total duration in seconds, when reported by the player. */
  duration?: number;
  /** Watched percentage, 0-100. */
  percent?: number;
  updatedAt: number;
}

export interface Settings {
  apiKey: string;
  language: string;
  region: string;
  reduceMotion: boolean;
  blockPopups: boolean;
  autoplayNext: boolean;
  playerBranding: boolean;
}

export interface AppState {
  settings: Settings;
  wishlist: WishlistItem[];
  progress: ProgressItem[];
  recentSearches: string[];
}
