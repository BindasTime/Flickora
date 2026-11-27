<div align="center">

<img src="https://raw.githubusercontent.com/BindasTime/Flickora-Mobile/main/Screenshots/icon.png" alt="Flickora Logo" width="90" height="90" />

# Flickora Mobile

**A beautiful, fast Android streaming client for discovering movies and TV series.**  
Browse trending titles, explore by genre and country, save your watchlist, and pick up right where you left off.  
Built with React, TypeScript, and Capacitor — powered by TMDB metadata and the VidRift player.  
No account. No tracking. Everything stays on your device.



[![Release](https://img.shields.io/github/v/release/BindasTime/Flickora-Mobile?color=e05c3b&label=Latest%20Release&style=flat-square)](https://github.com/BindasTime/Flickora-Mobile/releases/latest)
[![Android](https://img.shields.io/badge/Platform-Android-brightgreen?style=flat-square&logo=android)](https://github.com/BindasTime/Flickora-Mobile/releases/latest)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>



[![Get it on Orion Store](https://raw.githubusercontent.com/RookieEnough/Orion-Store/refs/heads/main/assets/orion-badge.png)](https://rookieenough.github.io/Orion-Data/app/?id=flickora)
---

## 📱 Screenshots

<div align="center">
<table>
<tr>
<td align="center"><img src="Screenshots/home.jpg" width="180" alt="Home" /><br /><sub><b>Home</b></sub></td>
<td align="center"><img src="Screenshots/browse-movies.jpg" width="180" alt="Browse Movies" /><br /><sub><b>Browse Movies</b></sub></td>
<td align="center"><img src="Screenshots/tv-shows.jpg" width="180" alt="TV Shows" /><br /><sub><b>TV Shows</b></sub></td>
<td align="center"><img src="Screenshots/my-list.jpg" width="180" alt="My List" /><br /><sub><b>My List</b></sub></td>
</tr>
</table>
</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎬 **Editorial Home** | Rotating hero banner, trending titles, and curated rows for movies and series |
| 🔍 **Instant Search** | Search across both libraries with 400ms debounce and media-type filter |
| 🌍 **Country Discovery** | Filter movies and series by origin country, alongside genre filters |
| 🔊 **Dual Audio** | Discover movies with non-original audio tracks (Hindi, etc.) |
| ❤️ **My List** | Save any title locally — sort, filter, grid/list view toggle |
| ▶️ **Continue Watching** | The player tracks real progress so you can resume any episode |
| 📺 **Season Browser** | Browse seasons, read episode synopses, and track your progress |
| 🏆 **Top 10 Today** | Trending movies chart updated daily from TMDB |
| 📡 **Offline-first Cache** | Metadata cached on disk and served stale when network drops |
| 🔒 **Private by Design** | No account, no telemetry — your list and progress never leave the device |
| 🌑 **Immersive Mode** | Full-screen experience with Android immersive mode support |

---

## 🚀 Quick Install

Download the latest APK directly from [GitHub Releases](https://github.com/BindasTime/Flickora-Mobile/releases/latest):

1. Download `Flickora-v2.0.1.apk`
2. On your Android device go to **Settings → Install unknown apps** and allow your browser
3. Open the downloaded file and tap **Install**

> **Requires Android 7.0 (API 24) or higher**

---

## 🛠️ Build from Source

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| Java JDK | 21 (AGP 8 requires JDK 17+; this repo uses 21) |
| Android SDK | API 36 (compileSdk / targetSdk) |
| Android Studio | Hedgehog or later (optional, for SDK tools) |

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/BindasTime/Flickora-Mobile.git
cd Flickora-Mobile

# 2. Install dependencies
npm install

# 3. Build the web bundle and sync to Android
npm run build
npx cap sync android
```

### Build the APK

```bash
# Debug build (sideload-ready)
npm run build:apk

# Signed release APK + AAB (needs android/keystore.properties — see docs/RELEASE.md)
npm run build:release
```

Signed artifacts land in `release/Flickora-v2.0.1.apk` and
`release/Flickora-v2.0.1.aab`.

### Development Server

```bash
npm run dev
```

Then use **Live Reload** with Capacitor by pointing your device to your local IP via `capacitor.config.ts`.

---

## 🏗️ Tech Stack

```
Flickora Mobile
├── Frontend         React 19 + TypeScript 5.7
├── Build Tool       Vite 6
├── Android Bridge   Capacitor 8
├── Routing          React Router 7
├── Icons            Lucide React
├── Data             TMDB REST API v3
└── Playback         VidRift embed player
```

---

## 📂 Project Structure

```
├── src/
│   ├── components/      # Reusable UI (Hero, MediaCard, MediaRow, BottomNav …)
│   ├── pages/           # Route-level screens (Home, Browse, Search, Player …)
│   ├── lib/             # TMDB client, Capacitor bridge, hooks, types
│   ├── state/           # Global AppState (wishlist, progress, toasts)
│   └── styles/          # Global CSS + mobile-specific overrides
├── android/             # Capacitor Android project
├── Screenshots/         # App screenshots
└── release/             # Built APK artifacts
```

---

## 🔑 API & Playback

Flickora uses the [TMDB API](https://www.themoviedb.org/documentation/api) for all catalogue
metadata, posters, and backdrops. Playback is provided by the
[VidRift](https://vidrift.net/) embed player loaded inside a sandboxed WebView.

> This app does not host, store, or distribute video. It is a personal-use client only.

---

## 💰 Monetization (ads)

Flickora ships with an AdMob banner, a rate-limited pre-roll interstitial and a
house sponsored card for browser builds. The code is done; you only supply the
IDs from your own AdMob account:

1. Create an app in [AdMob](https://admob.google.com) (Android → *Flickora*) and
   two ad units — one **Banner**, one **Interstitial**.
2. Run the setup helper once:

   ```bash
   npm run admob:setup
   ```

   It writes the IDs into `.env`, patches
   `android/app/src/main/AndroidManifest.xml` and generates
   `public/app-ads.txt`.
3. Confirm everything is live, then rebuild:

   ```bash
   npm run admob:check
   npm run build:release
   ```

Until real IDs are set the app requests Google's demo ads, which are safe to
test with and never generate revenue. Pre-rolls are capped to one every
3 minutes (`interstitialGapMs`), readers can switch ads off in
**Settings → Ads & support**, and GDPR/CCPA consent is handled by Google's UMP
SDK (re-openable from **Settings → Ad privacy choices**).

Full walkthrough — account creation, app-ads.txt verification, consent
messages, policy and troubleshooting: [`docs/ADMOB.md`](docs/ADMOB.md).

> AdMob policies require that you own or are licensed to distribute the content
> next to your ads. Monetising unauthorised streams will get the account
> suspended, so only run this with content you have the rights to.

---

## ⚙️ Configuration

The TMDB API key is embedded in the client bundle at build time via `src/lib/tmdb.ts`.  
If you fork this project, replace the key with your own from [themoviedb.org](https://www.themoviedb.org/settings/api).

---

## 📄 License

MIT © [BindasTime](https://github.com/BindasTime)

---

<div align="center">
  <sub>Metadata &amp; artwork by <a href="https://www.themoviedb.org/">TMDB</a> · Playback by <a href="https://vidrift.net/">VidRift</a> · Not affiliated with either.</sub>
</div>
