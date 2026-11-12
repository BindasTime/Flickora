import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clapperboard,
  ExternalLink,
  ListVideo,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  X,
} from 'lucide-react';
import { hf } from '../lib/bridge';
import { setImmersiveMode, setPlaybackOrientation } from '../lib/bridge';
import { useApp } from '../state/AppState';
import { useAsync } from '../lib/hooks';
import { buildEmbedUrl, fetchDetails, fetchSeason, stillUrl } from '../lib/tmdb';
import { episodeCode, formatTimecode, formatRuntime, formatScore } from '../lib/format';
import type { Episode, MediaType, SeasonDetails } from '../lib/types';

interface SourceEpisode {
  season: number;
  episode: number;
  title?: string;
}

interface Playback {
  position: number;
  duration: number;
  percent: number;
}

const ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)*vidrift\.(net|in)$/i;
// Below this, a position is treated as "just started" rather than resumable.
const RESUME_MIN_SECONDS = 8;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function eventName(payload: Record<string, unknown>): string {
  const raw = payload.type ?? payload.event ?? payload.name ?? payload.action ?? '';
  return String(raw).toLowerCase().replace(/^vidrift[:.]/, '').replace(/^on/, '');
}

function providerLabel(value: unknown): string | null {
  if (typeof value === 'string') {
    const label = value.trim();
    return label ? label.slice(0, 48) : null;
  }
  const record = asRecord(value);
  if (!record) return null;
  const raw = record.name ?? record.label ?? record.title ?? record.provider ?? record.id;
  return typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 48) : null;
}

export function Player() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const mediaType: MediaType = params.mediaType === 'tv' ? 'tv' : 'movie';
  const id = Number(params.id);
  const { settings, recordProgress, removeProgress, progress, ready, toast } = useApp();

  const initialSeason = Math.max(1, Number(searchParams.get('season') || 1) || 1);
  const initialEpisode = Math.max(1, Number(searchParams.get('episode') || 1) || 1);
  const initialTitle = searchParams.get('title') || '';

  const [source, setSource] = useState<SourceEpisode>({
    season: initialSeason,
    episode: initialEpisode,
    title: initialTitle,
  });
  const [active, setActive] = useState<SourceEpisode>(source);
  const [reloadKey, setReloadKey] = useState(0);
  const [frameLoading, setFrameLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSeason, setDrawerSeason] = useState(initialSeason);
  const [playback, setPlayback] = useState<Playback>({ position: 0, duration: 0, percent: 0 });
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimer = useRef<number | null>(null);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = window.setTimeout(() => {
      setShowControls(false);
    }, 4000);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    };
  }, [resetControlsTimer]);

  const { data: details } = useAsync(() => fetchDetails(mediaType, id), [mediaType, id]);
  const activeSeason = useAsync<SeasonDetails | null>(
    () => (mediaType === 'tv' ? fetchSeason(id, active.season) : Promise.resolve(null)),
    [mediaType, id, active.season],
  );
  const drawerData = useAsync<SeasonDetails | null>(
    () => (mediaType === 'tv' ? fetchSeason(id, drawerSeason) : Promise.resolve(null)),
    [mediaType, id, drawerSeason],
  );

  const detailsRef = useRef(details);
  detailsRef.current = details;
  const activeRef = useRef(active);
  activeRef.current = active;
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const progressListRef = useRef(progress);
  progressListRef.current = progress;
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const lastSaveRef = useRef(0);
  const nextTimerRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const resumeAtRef = useRef(0);
  const resumeDoneRef = useRef(true);
  const resumeInitRef = useRef(false);
  const pendingExitRef = useRef(false);

  const showTitle = details?.title || initialTitle || 'Now playing';
  const sourceTitle = source.title || initialTitle;

  const nextEpisode: Episode | null = useMemo(() => {
    const episodes = activeSeason.data?.episodes || [];
    const index = episodes.findIndex(
      (item) => item.seasonNumber === active.season && item.episodeNumber === active.episode,
    );
    if (index >= 0 && index < episodes.length - 1) return episodes[index + 1];
    return null;
  }, [activeSeason.data, active.season, active.episode]);
  const nextRef = useRef<Episode | null>(nextEpisode);
  nextRef.current = nextEpisode;

  const embedUrl = useMemo(
    () =>
      buildEmbedUrl(mediaType, id, {
        season: source.season,
        episode: source.episode,
        title: source.title || showTitle,
        branding: settings.playerBranding,
      }),
    [mediaType, id, source.season, source.episode, source.title, showTitle, settings.playerBranding],
  );

  // Find the last saved position for this movie/episode. Movies are keyed by
  // id only; TV entries are keyed by season + episode.
  const savedResumePoint = useCallback(
    (season: number, episode: number) => {
      const entry = progressListRef.current.find(
        (item) =>
          item.mediaType === mediaType &&
          item.id === id &&
          (mediaType === 'tv' ? item.season === season && item.episode === episode : true),
      );
      if (!entry || !entry.duration) return 0;
      if ((entry.percent ?? 0) >= 95) return 0;
      const position = entry.position ?? 0;
      if (position < RESUME_MIN_SECONDS) return 0;
      return Math.floor(position);
    },
    [mediaType, id],
  );

  const stopResume = useCallback(() => {
    if (resumeTimerRef.current) {
      window.clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  // VidRift accepts a parent-side resume command: `vidrift:resume` with a
  // `currentTime`. The player keeps that point across provider switches and
  // applies it on `loadedmetadata`, so re-sending for a few seconds is safe
  // and covers the gap before its script is ready.
  const beginResume = useCallback(() => {
    stopResume();
    const target = resumeAtRef.current;
    if (target < RESUME_MIN_SECONDS) {
      resumeDoneRef.current = true;
      return;
    }
    resumeDoneRef.current = false;
    let attempts = 0;
    const send = () => {
      if (resumeDoneRef.current) {
        stopResume();
        return;
      }
      const frame = frameRef.current;
      if (frame?.contentWindow) {
        try {
          frame.contentWindow.postMessage(
            { type: 'vidrift:resume', currentTime: target },
            '*',
          );
        } catch {
          // The frame may still be on about:blank; the next tick retries.
        }
      }
      attempts += 1;
      if (attempts >= 24) {
        stopResume();
        // Give up quietly: let normal progress saving resume.
        resumeDoneRef.current = true;
      }
    };
    send();
    resumeTimerRef.current = window.setInterval(send, 800);
  }, [stopResume]);

  const noteResumeProgress = useCallback(
    (position: number) => {
      if (resumeAtRef.current >= RESUME_MIN_SECONDS && position >= resumeAtRef.current - 5) {
        resumeDoneRef.current = true;
        stopResume();
      }
    },
    [stopResume],
  );

  const saveNow = useCallback(() => {
    const meta = playbackRef.current;
    if (!meta.duration || meta.position < RESUME_MIN_SECONDS || meta.percent >= 95) return;
    // Do not overwrite a saved position with the 0:00 the player reports before
    // the pending resume seek has landed.
    if (!resumeDoneRef.current && meta.position < resumeAtRef.current - 5) return;
    const detail = detailsRef.current;
    const current = activeRef.current;
    recordProgress({
      mediaType,
      id,
      title: detail?.title || showTitle,
      posterPath: detail?.posterPath ?? null,
      backdropPath: detail?.backdropPath ?? null,
      season: mediaType === 'tv' ? current.season : undefined,
      episode: mediaType === 'tv' ? current.episode : undefined,
      episodeTitle: mediaType === 'tv' ? current.title : undefined,
      position: Math.round(meta.position),
      duration: Math.round(meta.duration),
      percent: Math.max(1, Math.min(99, Math.round(meta.percent))),
    });
    lastSaveRef.current = Date.now();
  }, [mediaType, id, showTitle, recordProgress]);

  const selectEpisode = useCallback(
    (season: number, episode: number, title?: string) => {
      saveNow();
      stopResume();
      if (nextTimerRef.current) {
        window.clearTimeout(nextTimerRef.current);
        nextTimerRef.current = null;
      }
      const next = { season, episode, title };
      resumeAtRef.current = savedResumePoint(season, episode);
      resumeDoneRef.current = resumeAtRef.current < RESUME_MIN_SECONDS;
      setSource(next);
      setActive(next);
      setDrawerSeason(season);
      setPlayback({ position: 0, duration: 0, percent: 0 });
      playbackRef.current = { position: 0, duration: 0, percent: 0 };
      setEnded(false);
      setError(null);
      setFrameLoading(true);
      setReloadKey((value) => value + 1);
      setDrawerOpen(false);
      navigate(`/watch/tv/${id}?season=${season}&episode=${episode}${title ? `&title=${encodeURIComponent(title)}` : ''}`, {
        replace: true,
      });
    },
    [id, navigate, saveNow, savedResumePoint, stopResume],
  );
  const selectEpisodeRef = useRef(selectEpisode);
  selectEpisodeRef.current = selectEpisode;

  const finishExit = useCallback(() => {
    if (!pendingExitRef.current) return;
    pendingExitRef.current = false;
    navigate(`/title/${mediaType}/${id}`);
  }, [mediaType, id, navigate]);

  const goBack = useCallback(() => {
    if (pendingExitRef.current) return;
    // Save what we have, then ask the player for its exact playhead so an
    // escape right between its 5-second progress ticks is not rounded away.
    saveNow();
    const frame = frameRef.current;
    if (frame?.contentWindow) {
      pendingExitRef.current = true;
      try {
        frame.contentWindow.postMessage({ type: 'vidrift:get-state' }, '*');
      } catch {
        // The frame is already gone; fall through to the timeout below.
      }
      window.setTimeout(finishExit, 400);
      return;
    }
    navigate(`/title/${mediaType}/${id}`);
  }, [mediaType, id, navigate, saveNow, finishExit]);

  const toggleFullscreen = useCallback(async () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    const nativeFullscreen = await hf.window.setFullScreen(next);
    if (!nativeFullscreen) {
      const frame = frameRef.current;
      try {
        if (next && frame?.requestFullscreen) await frame.requestFullscreen();
        else if (!next && document.fullscreenElement) await document.exitFullscreen();
      } catch (fullscreenError) {
        console.warn('Unable to toggle player fullscreen', fullscreenError);
      }
    }
    await setImmersiveMode(next && window.matchMedia('(orientation: landscape)').matches);
  }, [isFullscreen]);

  useEffect(() => {
    void setPlaybackOrientation(true);
    void setImmersiveMode(true);
    return () => {
      void setImmersiveMode(false);
      void setPlaybackOrientation(false);
    };
  }, []);

  // Persist on close / hide.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    const onUnload = () => saveNow();
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('visibilitychange', onHide);
      saveNow();
    };
  }, [saveNow]);

  // Apply the saved playhead once app state is available. The player is told to
  // resume through a postMessage; `beginResume` retries until the seek lands.
  useEffect(() => {
    if (!ready || resumeInitRef.current) return;
    resumeInitRef.current = true;
    resumeAtRef.current = savedResumePoint(initialSeason, initialEpisode);
    resumeDoneRef.current = resumeAtRef.current < RESUME_MIN_SECONDS;
    if (!resumeDoneRef.current) beginResume();
  }, [ready, initialSeason, initialEpisode, savedResumePoint, beginResume]);

  // Player event bridge.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!ORIGIN_RE.test(event.origin)) return;
      let payload: unknown = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      const record = asRecord(payload);
      if (!record) return;
      const data = asRecord(record.data) || record;
      const name = eventName(record);

      if (name === 'providers') {
        const list = Array.isArray(data.providers) ? data.providers : [];
        const current = typeof data.current === 'string' ? data.current : '';
        const activeEntry = current
          ? list.find((entry) => {
              const record = asRecord(entry);
              return record && (record.value === current || record.id === current);
            })
          : null;
        const label =
          providerLabel(activeEntry) ??
          (list.length ? providerLabel(list[0]) : null);
        if (label) setProvider(label);
        return;
      }
      if (name === 'provider-picked') {
        setProvider(providerLabel(data.provider) ?? providerLabel(data) ?? providerLabel(data.name) ?? null);
        return;
      }

      if (name === 'progress' || name === 'timeupdate') {
        const currentTime =
          num(data.currentTime) ?? num(data.current_time) ?? num(data.position) ?? num(data.time) ?? 0;
        const duration = num(data.duration) ?? num(data.length) ?? 0;
        const percent =
          duration > 0 ? Math.min(100, (currentTime / duration) * 100) : num(data.percent) ?? 0;
        const nextPlayback = { position: currentTime, duration, percent };
        playbackRef.current = nextPlayback;
        setPlayback(nextPlayback);
        noteResumeProgress(currentTime);
        setEnded(false);
        setError(null);
        if (Date.now() - lastSaveRef.current > 8000) saveNow();
        return;
      }

      if (name === 'state') {
        // Reply to `vidrift:get-state`: exact playhead, used when exiting so the
        // saved position is what the viewer actually left, not the last tick.
        const currentTime = num(data.currentTime) ?? num(data.position);
        const duration = num(data.duration) ?? 0;
        if (currentTime != null) {
          const nextPlayback = {
            position: currentTime,
            duration: duration || playbackRef.current.duration,
            percent:
              duration > 0
                ? Math.min(100, (currentTime / duration) * 100)
                : playbackRef.current.percent,
          };
          playbackRef.current = nextPlayback;
          setPlayback(nextPlayback);
          noteResumeProgress(currentTime);
        }
        if (pendingExitRef.current) {
          saveNow();
          finishExit();
        }
        return;
      }

      if (name === 'episode' || name === 'episode-change') {
        const season = num(data.season) ?? num(data.seasonNumber);
        const episode = num(data.episode) ?? num(data.episodeNumber);
        if (season && episode) {
          const title = typeof data.title === 'string' ? data.title : undefined;
          resumeAtRef.current = 0;
          resumeDoneRef.current = true;
          stopResume();
          setActive({ season, episode, title });
          setDrawerSeason(season);
          setPlayback({ position: 0, duration: 0, percent: 0 });
          playbackRef.current = { position: 0, duration: 0, percent: 0 };
        }
        return;
      }

      if (name === 'nextup') {
        const label = providerLabel(data.provider);
        if (label) setProvider(label);
        return;
      }

      if (name === 'nextup-play') {
        const season = num(data.season) ?? num(data.seasonNumber);
        const episode = num(data.episode) ?? num(data.episodeNumber);
        if (season && episode) {
          const title = typeof data.title === 'string' ? data.title : undefined;
          selectEpisodeRef.current(season, episode, title);
        }
        return;
      }

      if (name === 'progress-ended' || name === 'ended' || name === 'complete') {
        const current = activeRef.current;
        removeProgress(
          mediaType,
          id,
          mediaType === 'tv' ? current.season : undefined,
          mediaType === 'tv' ? current.episode : undefined,
        );
        playbackRef.current = { position: 0, duration: 0, percent: 0 };
        setPlayback({ position: 0, duration: 0, percent: 0 });
        const next = nextRef.current;
        if (mediaType === 'tv' && next && settings.autoplayNext) {
          setEnded(false);
          nextTimerRef.current = window.setTimeout(() => {
            selectEpisodeRef.current(next.seasonNumber, next.episodeNumber, next.name);
          }, 1600);
        } else {
          setEnded(true);
        }
        return;
      }

      if (name === 'exit') {
        goBack();
        return;
      }

      if (name === 'fullscreen') {
        const value = Boolean(data.fullscreen ?? data.value ?? data.enabled);
        setIsFullscreen(value);
        void hf.window.setFullScreen(value);
        return;
      }

      if (name === 'wont-play' || name === 'unreleased' || name === 'error') {
        const message =
          (typeof data.message === 'string' && data.message) ||
          (name === 'unreleased'
            ? 'This title has not been released yet.'
            : 'This title could not be played. Try another provider or open it in your browser.');
        setError(message);
        return;
      }

      if (name === 'command-error') {
        const message = typeof data.message === 'string' ? data.message : 'The player rejected that command.';
        toast(message, 'error');
        return;
      }

      if (name === 'external-fallback') {
        toast('The player switched to an external source.', 'info');
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [
    mediaType,
    id,
    settings.autoplayNext,
    removeProgress,
    goBack,
    finishExit,
    noteResumeProgress,
    saveNow,
    stopResume,
    toast,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'Escape') {
        if (drawerOpen) setDrawerOpen(false);
        else if (isFullscreen) {
          setIsFullscreen(false);
          void hf.window.setFullScreen(false);
          void setImmersiveMode(false);
        } else goBack();
      }
      if (event.key.toLowerCase() === 'f') void toggleFullscreen();
      if (event.key.toLowerCase() === 'n' && nextRef.current) {
        const next = nextRef.current;
        selectEpisode(next.seasonNumber, next.episodeNumber, next.name);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, isFullscreen, goBack, toggleFullscreen, selectEpisode]);

  useEffect(() => {
    const onAndroidBack = () => {
      if (drawerOpen) setDrawerOpen(false);
      else if (isFullscreen) {
        setIsFullscreen(false);
        void hf.window.setFullScreen(false);
        void setImmersiveMode(false);
      } else goBack();
    };
    window.addEventListener('hf:android-back', onAndroidBack);
    return () => window.removeEventListener('hf:android-back', onAndroidBack);
  }, [drawerOpen, isFullscreen, goBack]);

  useEffect(
    () => () => {
      if (nextTimerRef.current) window.clearTimeout(nextTimerRef.current);
      stopResume();
      void hf.window.setFullScreen(false);
      void setImmersiveMode(false);
    },
    [stopResume],
  );

  const replay = () => {
    resumeAtRef.current = 0;
    resumeDoneRef.current = true;
    stopResume();
    setEnded(false);
    setError(null);
    setFrameLoading(true);
    setPlayback({ position: 0, duration: 0, percent: 0 });
    playbackRef.current = { position: 0, duration: 0, percent: 0 };
    setReloadKey((value) => value + 1);
  };

  const openExternal = () => {
    void hf.openExternal(embedUrl);
  };

  const seasons = details?.seasons || [];
  const currentProgress =
    mediaType === 'tv'
      ? progress.find(
          (item) =>
            item.mediaType === 'tv' &&
            item.id === id &&
            item.season === active.season &&
            item.episode === active.episode,
        )
      : progress.find((item) => item.mediaType === 'movie' && item.id === id);

  const subtitle =
    mediaType === 'tv'
      ? `${episodeCode(active.season, active.episode)}${active.title ? ` · ${active.title}` : ''}`
      : 'Movie';

  return (
    <div
      className="player-page"
      onClick={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onMouseMove={resetControlsTimer}
    >
      <div
        className="player-bg"
        style={{
          backgroundImage: details?.backdropPath
            ? `url(https://image.tmdb.org/t/p/w1280${details.backdropPath})`
            : undefined,
        }}
      />
      <header className={`player-topbar ${showControls ? 'controls-visible' : 'controls-hidden'}`}>
        <div className="player-title">
          <button type="button" className="icon-button no-drag" aria-label="Back" onClick={goBack}>
            <ArrowLeft size={18} />
          </button>
          <div className="player-title-text">
            <strong>{showTitle}</strong>
            <span>
              {subtitle}
              {provider ? ` · ${provider}` : ''}
              {playback.duration > 0
                ? ` · ${formatTimecode(playback.position)} / ${formatTimecode(playback.duration)}`
                : ''}
            </span>
          </div>
        </div>

        <div className="player-actions no-drag">
          {mediaType === 'tv' && (
            <button
              type="button"
              className="button glass small"
              onClick={() => {
                setDrawerSeason(active.season);
                setDrawerOpen(true);
              }}
            >
              <ListVideo size={15} /> Episodes
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            aria-label="Restart from beginning"
            title="Restart from beginning"
            onClick={replay}
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Open in browser"
            onClick={openExternal}
          >
            <ExternalLink size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      <div className="player-stage">
        {frameLoading && (
          <div className="player-loading">
            <span className="spinner" />
            <span>Loading player…</span>
          </div>
        )}
        <iframe
          key={`${source.season}-${source.episode}-${reloadKey}`}
          ref={frameRef}
          className="player-frame"
          src={embedUrl}
          title={`${showTitle} player`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => {
            setFrameLoading(false);
            beginResume();
          }}
          onError={() => {
            setFrameLoading(false);
            setError('The player failed to load. Check your connection and try again.');
          }}
        />
      </div>

      <div className="player-progress" aria-hidden="true">
        <span style={{ width: `${Math.min(100, playback.percent)}%` }} />
      </div>
      {ended && (
        <div className="player-overlay">
          <div className="player-overlay-card">
            <div className="overlay-icon">
              <Check size={26} />
            </div>
            <h2>You finished {mediaType === 'tv' ? 'this episode' : 'the movie'}</h2>
            <p className="muted">
              {mediaType === 'tv'
                ? nextEpisode
                  ? 'Ready for the next one?'
                  : 'That was the last episode of this season.'
                : 'Hope you enjoyed it. Ready for another?'}
            </p>
            <div className="overlay-actions">
              {mediaType === 'tv' && nextEpisode && (
                <button
                  type="button"
                  className="button primary"
                  onClick={() =>
                    selectEpisode(nextEpisode.seasonNumber, nextEpisode.episodeNumber, nextEpisode.name)
                  }
                >
                  <Play size={16} fill="currentColor" /> Next episode
                </button>
              )}
              <button type="button" className="button glass" onClick={replay}>
                <RefreshCw size={15} /> Watch again
              </button>
              <button type="button" className="button glass" onClick={goBack}>
                Back to details
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="player-overlay">
          <div className="player-overlay-card error-card">
            <div className="overlay-icon error">
              <AlertTriangle size={26} />
            </div>
            <h2>Playback problem</h2>
            <p>{error}</p>
            <div className="overlay-actions">
              <button type="button" className="button primary" onClick={replay}>
                <RefreshCw size={15} /> Try again
              </button>
              <button type="button" className="button glass" onClick={openExternal}>
                <ExternalLink size={15} /> Open in browser
              </button>
              <button type="button" className="button glass" onClick={goBack}>
                Back to details
              </button>
            </div>
            <p className="player-note">
              Playback is provided by VidRift. This app only embeds the player; it does not host or
              stream any video itself.
            </p>
          </div>
        </div>
      )}

      {drawerOpen && (
        <>
          <button
            type="button"
            className="drawer-scrim"
            aria-label="Close episodes"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="episode-drawer" aria-label="Episodes">
            <div className="drawer-head">
              <div>
                <span className="eyebrow">Now playing</span>
                <h2>{showTitle}</h2>
                <p>{episodeCode(active.season, active.episode)}{active.title ? ` · ${active.title}` : ''}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close episodes"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-seasons hide-scrollbar">
              {(seasons.length
                ? seasons
                : [{ id: 0, seasonNumber: active.season, name: `Season ${active.season}`, episodeCount: 0 }]
              ).map((item) => (
                <button
                  key={item.id || item.seasonNumber}
                  type="button"
                  className={`season-chip${drawerSeason === item.seasonNumber ? ' active' : ''}`}
                  onClick={() => setDrawerSeason(item.seasonNumber)}
                >
                  <strong>Season {item.seasonNumber}</strong>
                  <span>{item.episodeCount ? `${item.episodeCount} eps` : ''}</span>
                </button>
              ))}
            </div>

            <div className="drawer-list">
              {drawerData.loading ? (
                <div className="inline-loader">
                  <span className="spinner" />
                  <span>Loading episodes…</span>
                </div>
              ) : drawerData.error ? (
                <div className="drawer-error">
                  <p>{drawerData.error}</p>
                  <button type="button" className="button glass" onClick={drawerData.reload}>
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              ) : drawerData.data?.episodes.length ? (
                drawerData.data.episodes.map((episode) => {
                  const isActive =
                    episode.seasonNumber === active.season && episode.episodeNumber === active.episode;
                  const saved = progress.find(
                    (entry) =>
                      entry.mediaType === 'tv' &&
                      entry.id === id &&
                      entry.season === episode.seasonNumber &&
                      entry.episode === episode.episodeNumber,
                  );
                  return (
                    <button
                      key={episode.id}
                      type="button"
                      className={`drawer-episode${isActive ? ' active' : ''}`}
                      onClick={() =>
                        selectEpisode(episode.seasonNumber, episode.episodeNumber, episode.name)
                      }
                    >
                      <span className="drawer-still">
                        {episode.stillPath ? (
                          <img src={stillUrl(episode.stillPath, 'w300') || ''} alt="" loading="lazy" />
                        ) : (
                          <span className="still-fallback">
                            <Clapperboard size={16} />
                          </span>
                        )}
                        <span className="drawer-play">
                          <Play size={13} fill="currentColor" />
                        </span>
                        {saved?.percent ? (
                          <span className="episode-progress">
                            <span style={{ width: `${Math.min(100, saved.percent)}%` }} />
                          </span>
                        ) : null}
                      </span>
                      <span className="drawer-episode-info">
                        <span className="drawer-episode-code">
                          {episodeCode(episode.seasonNumber, episode.episodeNumber)}
                        </span>
                        <strong>{episode.name}</strong>
                        <span className="drawer-meta">
                          {episode.runtime ? formatRuntime(episode.runtime) : ''}
                          {episode.voteAverage > 0 ? ` · ${formatScore(episode.voteAverage)} ★` : ''}
                        </span>
                      </span>
                      {isActive && <span className="now-dot" />}
                    </button>
                  );
                })
              ) : (
                <p className="muted drawer-empty">No episodes found for this season.</p>
              )}
            </div>

            {currentProgress?.percent ? (
              <p className="drawer-foot">
                Last position {formatTimecode(currentProgress.position)} ·{' '}
                {Math.round(currentProgress.percent)}% watched
              </p>
            ) : (
              <p className="drawer-foot">Progress is saved automatically while you watch.</p>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
