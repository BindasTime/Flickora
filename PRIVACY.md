# Flickora Privacy Policy

**Last updated: 27 November 2026**

Flickora is a mobile client for browsing movie and TV metadata and playing
content through third-party embeds. It has no user accounts and no Flickora
servers: there is nothing to sign up for, and the developer cannot see your
watchlist, history, or searches.

This policy explains what the app stores on your device, what leaves it, and how
you control advertising.

---

## 1. Data stored on your device

Flickora keeps the following in local storage inside the app's private sandbox:

- your watchlist and playback progress,
- your preferences (language, region, reduced motion, ads on/off),
- cached catalogue metadata and artwork so the app opens quickly and works
  offline.

This data stays on your device. It is not uploaded anywhere, and it is deleted
when you clear the app's data or uninstall the app. **Settings → Data & storage**
lets you clear caches or reset everything at any time.

## 2. Data that leaves your device

The app talks to three kinds of third parties. Each receives your IP address and
standard request information (app version, platform, language) as part of any
network request.

| Service | Purpose | What it can see |
|---|---|---|
| **TMDB** (`api.themoviedb.org`) | Movie and TV metadata, posters, search | Your IP address, the titles you search for and view |
| **Google AdMob** | Advertising (when ads are enabled) | Advertising ID, IP address, device and app information, ad requests, impressions and interactions, approximate location derived from IP |
| **VidRift** (`vidrift.net`) | Embedded video playback | Your IP address, the title you play, and anything its player stores in its own WebView storage |

Flickora does not run analytics, crash reporting, or telemetry of its own, and
does not sell personal data.

## 3. Advertising

Ads are what keep the app free. They are served by Google AdMob.

- **Consent.** Where required (EEA, UK, Switzerland), the app shows Google's
  consent message before requesting any ad. You can change or withdraw that
  choice at any time from **Settings → Ads & support → Ad privacy choices**.
- **Turning ads off.** **Settings → Ads & support → Show ads** disables every ad
  request on that device. This is a local preference; no data is sent to switch
  it off.
- **Ad personalisation.** If you do not consent, Google serves non-personalised
  ads, which use contextual signals rather than your advertising ID.
- **Your advertising ID.** You can reset or delete it in
  **Android Settings → Privacy → Ads**. Deleting it means Google can no longer
  use it to personalise ads.

Google's own practices are described in the
[Google Privacy Policy](https://policies.google.com/privacy) and
[How Google uses information from sites or apps that use our services](https://policies.google.com/technologies/partner-sites).
The list of ad technology providers that may process data through AdMob is
published at
<https://support.google.com/admob/answer/9012903>.

## 4. Permissions the app requests

- **Internet / network state** — to load metadata, artwork and video, and to
  request ads.
- **Advertising ID** (`com.google.android.gms.permission.AD_ID`) — required by
  the Google Mobile Ads SDK on Android 13+.

Flickora does not request access to your contacts, camera, microphone, files,
precise location, or SMS.

## 5. Children

Flickora is not directed at children under 13. The app declares
`tagForChildDirectedTreatment = false` to the ads SDK, and the ad content rating
is capped at *Teen*. If you believe a child has used the app and you want the
local data removed, clearing the app's data removes all of it.

## 6. Your rights

Because Flickora holds no data about you on any server, most requests are
satisfied locally:

- **Access / portability** — your watchlist and progress are on your device;
  clearing them is the only copy that exists.
- **Erasure** — **Settings → Data & storage → Reset app data**, or uninstall.
- **Object to advertising** — turn ads off in Settings, or withdraw consent via
  *Ad privacy choices*.
- **Complaints** — you may contact your local data protection authority.

For data held by Google as an ad provider, use the Google privacy controls linked
in section 3.

## 7. Security

App data is stored in the app's private storage, which other apps cannot read on
a non-rooted device. Network traffic uses HTTPS. No method of transmission or
storage is completely secure, and the app is provided as-is under the MIT
licence.

## 8. Changes

If this policy changes, the "Last updated" date above changes with it. Material
changes will be noted in the app's release notes.

## 9. Contact

Questions or data requests:
<https://github.com/BindasTime/Flickora-Mobile/issues>

---

*Flickora is not affiliated with TMDB, Google, or VidRift. Metadata and artwork
belong to TMDB and their respective rights holders.*
