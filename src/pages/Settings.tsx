import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Eye,
  EyeOff,
  Globe2,
  Info,
  KeyRound,
  PlayCircle,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { hf } from '../lib/bridge';
import { useApp, defaultSettings } from '../state/AppState';
import { useAsync } from '../lib/hooks';
import { LANGUAGES, REGIONS } from '../lib/tmdb';
import { formatBytes } from '../lib/format';
import { InlineLoader } from '../components/States';

const SOURCE_REPO = 'https://github.com/cinevra-app/cinevra';
const PRIVACY_URL = 'https://github.com/cinevra-app/cinevra/blob/main/PRIVACY.md';
const TMDB_URL = 'https://www.themoviedb.org/';
const VIDRIFT_URL = 'https://vidrift.net/';
const CONTACT = 'hello@cinevra.app';

function Toggle({
  checked,
  onChange,
  label,
  help,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  help: string;
}) {
  return (
    <label className="toggle-row">
      <span className="toggle-text">
        <strong>{label}</strong>
        <span>{help}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`toggle${checked ? ' on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </label>
  );
}

export function Settings() {
  const { settings, updateSettings, clearCaches, resetAll, toast } = useApp();
  const appInfo = useAsync(() => hf.appInfo(), []);
  const [cacheStats, setCacheStats] = useState<{ entries: number; bytes: number } | null>(null);
  const [key, setKey] = useState(settings.apiKey);
  const [reveal, setReveal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState<'contact' | 'data' | null>(null);

  useEffect(() => {
    setKey(settings.apiKey);
  }, [settings.apiKey]);

  useEffect(() => {
    void hf.cache.stats().then(setCacheStats);
  }, []);

  const busy = appInfo.loading;

  const refreshCache = () => {
    void hf.cache.stats().then(setCacheStats);
  };

  const saveKey = async (value: string) => {
    setTesting(true);
    try {
      await updateSettings({ apiKey: value.trim() });
      const result = await hf.tmdb<{ images?: unknown }>('configuration');
      if (result.ok) {
        toast(value.trim() ? 'API key saved and verified' : 'Using the bundled API key', 'success');
      } else {
        toast(result.error || 'That API key did not work', 'error');
      }
      void hf.cache.stats().then(setCacheStats);
    } finally {
      setTesting(false);
    }
  };

  const changeLocale = (patch: { language?: string; region?: string }) => {
    void updateSettings(patch).then(() => {
      toast('Refreshing with your new preferences…', 'info');
      window.setTimeout(() => window.location.reload(), 420);
    });
  };

  const clearCache = async () => {
    await clearCaches();
    refreshCache();
  };

  const reset = async () => {
    const confirmed = await hf.confirm({
      title: 'Reset HaseebFlix',
      message: 'Reset settings, wishlist, watch progress, and recent searches?',
      detail: 'This cannot be undone.',
    });
    if (!confirmed) return;
    await resetAll();
    refreshCache();
  };

  const restoreDefaults = async () => {
    const confirmed = await hf.confirm({
      title: 'Restore defaults',
      message: 'Restore all preferences to their default values?',
      detail: 'Your wishlist and watch progress will be kept.',
    });
    if (!confirmed) return;
    await updateSettings({
      ...defaultSettings,
      apiKey: settings.apiKey,
      language: settings.language,
      region: settings.region,
    });
    toast('Preferences restored', 'success');
  };

  const copy = async (value: string, kind: 'contact' | 'data') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      toast('Could not copy to clipboard', 'error');
    }
  };

  return (
    <div className="page settings-page">
      <header className="page-head">
        <div className="page-head-main">
          <span className="eyebrow">
            <Sparkles size={13} /> Preferences
          </span>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Tune metadata, playback, and local data.</p>
        </div>
        <button type="button" className="button glass" onClick={() => void restoreDefaults()}>
          <RotateCcw size={15} /> Restore defaults
        </button>
      </header>

      <div className="settings-grid">
        <section className="settings-card wide">
          <div className="settings-card-head">
            <span className="settings-icon">
              <KeyRound size={17} />
            </span>
            <div>
              <h2>TMDB API key</h2>
              <p>
                Metadata and artwork come from The Movie Database. The bundled key works out of the
                box; add your own if you hit its rate limit.
              </p>
            </div>
            <span className={`pill ${settings.apiKey ? 'accent' : ''}`}>
              {settings.apiKey ? 'Custom key' : 'Bundled key'}
            </span>
          </div>

          <div className="api-row">
            <div className="api-input">
              <input
                type={reveal ? 'text' : 'password'}
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder="Paste a TMDB v3 API key"
                spellCheck={false}
                autoComplete="off"
                aria-label="TMDB API key"
              />
              <button
                type="button"
                className="icon-button"
                aria-label={reveal ? 'Hide API key' : 'Show API key'}
                onClick={() => setReveal((value) => !value)}
              >
                {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              type="button"
              className="button primary"
              disabled={testing || (key.trim() === settings.apiKey && Boolean(settings.apiKey))}
              onClick={() => void saveKey(key)}
            >
              {testing ? <span className="spinner small" /> : <Save size={15} />}
              {testing ? 'Verifying…' : 'Save & test'}
            </button>
            <button
              type="button"
              className="button glass"
              onClick={() => {
                setKey('');
                void saveKey('');
              }}
              disabled={testing || !settings.apiKey}
            >
              Use bundled key
            </button>
          </div>
          <p className="settings-help">
            Get a free key at{' '}
            <button type="button" className="inline-link" onClick={() => void hf.openExternal(TMDB_URL)}>
              themoviedb.org
            </button>
            . Keys are stored locally on this device only.
          </p>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-icon">
              <Globe2 size={17} />
            </span>
            <div>
              <h2>Language &amp; region</h2>
              <p>Titles, descriptions, and release dates follow these settings.</p>
            </div>
          </div>

          <label className="field">
            <span>Metadata language</span>
            <select
              value={settings.language}
              onChange={(event) => changeLocale({ language: event.target.value })}
            >
              {LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Region</span>
            <select
              value={settings.region}
              onChange={(event) => changeLocale({ region: event.target.value })}
            >
              {REGIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-icon">
              <PlayCircle size={17} />
            </span>
            <div>
              <h2>Playback</h2>
              <p>Control how the embedded player behaves.</p>
            </div>
          </div>

          <Toggle
            label="Autoplay next episode"
            help="Start the next episode automatically when one finishes."
            checked={settings.autoplayNext}
            onChange={(value) => void updateSettings({ autoplayNext: value })}
          />
          <Toggle
            label="Player branding"
            help="Show the HaseebFlix name and red accent inside the player."
            checked={settings.playerBranding}
            onChange={(value) => void updateSettings({ playerBranding: value })}
          />
          <div className="settings-note">
            <ShieldCheck size={14} /> Pop-ups and external windows are always blocked inside the app.
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-icon">
              <Sparkles size={17} />
            </span>
            <div>
              <h2>Appearance</h2>
              <p>Small touches for a calmer interface.</p>
            </div>
          </div>
          <Toggle
            label="Reduce motion"
            help="Turn off the hero slideshow, smooth scrolling, and most transitions."
            checked={settings.reduceMotion}
            onChange={(value) => void updateSettings({ reduceMotion: value })}
          />
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-icon">
              <Database size={17} />
            </span>
            <div>
              <h2>Data &amp; storage</h2>
              <p>Cached metadata lets the app open instantly and work offline.</p>
            </div>
          </div>

          <div className="data-stats">
            <div>
              <strong>{cacheStats ? cacheStats.entries.toLocaleString() : '—'}</strong>
              <span>cached responses</span>
            </div>
            <div>
              <strong>{cacheStats ? formatBytes(cacheStats.bytes) : '—'}</strong>
              <span>on disk</span>
            </div>
            <div>
              <strong>{settings.apiKey ? 'Custom' : 'Bundled'}</strong>
              <span>API key</span>
            </div>
          </div>

          <div className="settings-actions">
            <button type="button" className="button glass" onClick={() => void clearCache()}>
              <Trash2 size={15} /> Clear metadata cache
            </button>
            <button type="button" className="button ghost-danger" onClick={() => void reset()}>
              <RotateCcw size={15} /> Reset all app data
            </button>
          </div>
          <p className="settings-help">
            Reset removes your wishlist, watch progress, recent searches, and preferences from this
            computer.
          </p>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-icon">
              <Info size={17} />
            </span>
            <div>
              <h2>About this build</h2>
              <p>A modern desktop movie and TV browser with country filters.</p>
            </div>
          </div>

          {busy ? (
            <InlineLoader label="Reading app info" />
          ) : (
            <>
              <dl className="info-list">
                <div>
                  <dt>Version</dt>
                  <dd>{appInfo.data?.version || '1.0.0'}</dd>
                </div>
                <div>
                  <dt>Electron</dt>
                  <dd>{appInfo.data?.electron || '—'}</dd>
                </div>
                <div>
                  <dt>Chromium</dt>
                  <dd>{appInfo.data?.chrome || '—'}</dd>
                </div>
                <div>
                  <dt>Platform</dt>
                  <dd>{appInfo.data?.platform || '—'}</dd>
                </div>
              </dl>
              {appInfo.data?.userData && (
                <div className="path-row">
                  <code title={appInfo.data.userData}>{appInfo.data.userData}</code>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Copy data folder path"
                    onClick={() => void copy(appInfo.data?.userData || '', 'data')}
                  >
                    {copied === 'data' ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
              )}
            </>
          )}

          <div className="link-list">
            <button type="button" className="link-row" onClick={() => void hf.openExternal(SOURCE_REPO)}>
              HaseebFlix on GitHub
            </button>
            <button type="button" className="link-row" onClick={() => void hf.openExternal(PRIVACY_URL)}>
              Privacy policy
            </button>
            <button type="button" className="link-row" onClick={() => void hf.openExternal(TMDB_URL)}>
              The Movie Database
            </button>
            <button type="button" className="link-row" onClick={() => void hf.openExternal(VIDRIFT_URL)}>
              VidRift player
            </button>
          </div>

          <div className="contact-row">
            <span>{CONTACT}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Copy contact email"
              onClick={() => void copy(CONTACT, 'contact')}
            >
              {copied === 'contact' ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </section>
      </div>

      <footer className="page-footer">
        <span>Metadata by TMDB</span>
        <span className="dot-sep">•</span>
        <span>Playback embedded from VidRift</span>
        <span className="dot-sep">•</span>
        <span>Not affiliated with any streaming service</span>
      </footer>
    </div>
  );
}
