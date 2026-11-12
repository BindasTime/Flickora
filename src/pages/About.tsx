import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Clapperboard,
  Database,
  Download,
  Film,
  Github,
  Globe2,
  Heart,
  Keyboard,
  Languages,
  Layers,
  Mail,
  MonitorPlay,
  Search,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { hf } from '../lib/bridge';
import { useApp } from '../state/AppState';
import { BrandMark, Wordmark } from '../components/Brand';

const SOURCE_REPO = 'https://github.com/cinevra-app/cinevra';
const PRIVACY_URL = 'https://github.com/cinevra-app/cinevra/blob/main/PRIVACY.md';
const TMDB_URL = 'https://www.themoviedb.org/';
const VIDRIFT_URL = 'https://vidrift.net/';
const CONTACT = 'hello@cinevra.app';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Editorial home',
    text: 'A rotating hero, trending titles, and curated rows for movies and series.',
  },
  {
    icon: Search,
    title: 'Instant search',
    text: 'Search across both libraries with a 400 ms debounce and filter by type.',
  },
  {
    icon: Globe2,
    title: 'Country discovery',
    text: 'Filter movies and series by origin country, alone or alongside a genre.',
  },
  {
    icon: Languages,
    title: 'Dual audio',
    text: 'Find movies with a non-original audio track, read from the VidRift embed and cached.',
  },
  {
    icon: Heart,
    title: 'Wishlist',
    text: 'Save any title locally. Sort, filter, switch between grid and list view.',
  },
  {
    icon: MonitorPlay,
    title: 'Continue watching',
    text: 'The player reports real progress, so you can jump back into any episode.',
  },
  {
    icon: Layers,
    title: 'Season browser',
    text: 'Browse seasons, read episode synopses, and see how far you got.',
  },
  {
    icon: Download,
    title: 'Save offline',
    text: 'Download posters, backdrops, and a full metadata JSON for any title.',
  },
  {
    icon: WifiOff,
    title: 'Offline-first cache',
    text: 'Metadata is cached on disk and served stale when the network drops.',
  },
  {
    icon: Keyboard,
    title: 'Keyboard first',
    text: 'Ctrl+K to search, F for fullscreen, N for the next episode, Esc to go back.',
  },
  {
    icon: ShieldCheck,
    title: 'Local & private',
    text: 'No account, no telemetry. Your list and progress never leave this computer.',
  },
];

const DESKTOP_FACTS = [
  ['App', 'Flickora Mobile 1.2.0'],
  ['Package', 'com.haseebflix.mobile'],
  ['Platform', 'Android · Capacitor · React · TypeScript'],
  ['Metadata', 'TMDB REST API v3'],
  ['Playback', 'VidRift embed player'],
  ['Filters', 'Category, genre, origin country, dual audio'],
  ['Downloads', 'Poster, backdrop, metadata JSON'],
  ['Data folder', 'Flickora App Storage'],
];

export function About() {
  const { wishlist, progress } = useApp();

  return (
    <div className="page about-page">
      <header className="about-hero">
        <div className="about-glow" />
        <BrandMark size={68} />
        <div>
          <span className="eyebrow">
            <Clapperboard size={13} /> Desktop edition
          </span>
          <h1>
            <Wordmark />
          </h1>
          <p>
            A modern Linux desktop app for discovering movies and series. Browse by country and
            genre, keep a local wishlist, save artwork, and watch in a fast, native-feeling player.
          </p>
          <div className="about-actions">
            <Link className="button primary" to="/">
              Start browsing
            </Link>
            <button type="button" className="button glass" onClick={() => void hf.openExternal(SOURCE_REPO)}>
              <Github size={16} /> Project on GitHub
            </button>
            <button type="button" className="button glass" onClick={() => void hf.openExternal(`mailto:${CONTACT}`)}>
              <Mail size={16} /> Contact
            </button>
          </div>
          <div className="about-stats">
            <span>
              <strong>{wishlist.length}</strong> saved titles
            </span>
            <span>
              <strong>{progress.length}</strong> watch entries
            </span>
            <span>
              <strong>v1.2.0</strong> mobile
            </span>
          </div>
        </div>
      </header>

      <section className="about-section">
        <div className="section-head">
          <h2>What&apos;s inside</h2>
        </div>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="feature-card">
              <span className="feature-icon">
                <Icon size={18} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section">
        <div className="section-head">
          <h2>How it works</h2>
        </div>
        <div className="how-grid">
          <article className="how-card">
            <span className="how-index">01</span>
            <Film size={20} />
            <h3>Metadata</h3>
            <p>
              Catalogue data is pulled from TMDB through a cached Electron main-process proxy. The
              renderer never sees the API key request directly.
            </p>
          </article>
          <article className="how-card">
            <span className="how-index">02</span>
            <MonitorPlay size={20} />
            <h3>Playback</h3>
            <p>
              Movies and episodes open the VidRift embed in a sandboxed frame, with title, season,
              and episode passed as route state.
            </p>
          </article>
          <article className="how-card">
            <span className="how-index">03</span>
            <Database size={20} />
            <h3>Local state</h3>
            <p>
              Settings, wishlist, progress, and recent searches are saved locally on this device.
              Nothing is sent to an external server.
            </p>
          </article>
        </div>
      </section>

      <div className="about-columns">
        <section className="about-section">
          <div className="section-head">
            <h2>Mobile build</h2>
          </div>
          <dl className="fact-list">
            {DESKTOP_FACTS.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="about-note">
            Flickora is an open personal mobile streaming client. It reads the public TMDB catalogue,
            keeps your library on this device, and embeds the VidRift player for playback. It does not
            host or distribute video.
          </p>
        </section>

        <section className="about-section">
          <div className="section-head">
            <h2>Sources &amp; credits</h2>
          </div>
          <div className="credit-list">
            <button type="button" className="credit-row" onClick={() => void hf.openExternal(TMDB_URL)}>
              <span>
                <strong>The Movie Database</strong>
                <small>Metadata, posters, and artwork</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button type="button" className="credit-row" onClick={() => void hf.openExternal(VIDRIFT_URL)}>
              <span>
                <strong>VidRift</strong>
                <small>Embedded video player</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button type="button" className="credit-row" onClick={() => void hf.openExternal(SOURCE_REPO)}>
              <span>
                <strong>Source code on GitHub</strong>
                <small>Source code and release notes</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button type="button" className="credit-row" onClick={() => void hf.openExternal(PRIVACY_URL)}>
              <span>
                <strong>Privacy policy</strong>
                <small>How Flickora handles your data</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button type="button" className="credit-row" onClick={() => void hf.openExternal(`mailto:${CONTACT}`)}>
              <span>
                <strong>Contact</strong>
                <small>{CONTACT}</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="disclaimer">
            <ShieldCheck size={16} />
            <p>
              Flickora is an unofficial, personal-use client. It does not host, store, or distribute
              video. All metadata belongs to TMDB and all playback is provided by VidRift. If you
              enjoy something you find here, watch it on an official service.
            </p>
          </div>
        </section>
      </div>

      <footer className="page-footer">
        <span>Built with Electron, React, and TypeScript</span>
        <span className="dot-sep">•</span>
        <span>Not affiliated with TMDB or VidRift</span>
      </footer>
    </div>
  );
}
