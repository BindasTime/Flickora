# AdMob setup for Flickora

Flickora already ships with the ad code wired up:

| Placement | Where | Native (Android) | Browser |
|---|---|---|---|
| Banner | Docked above the bottom nav on every screen (`Layout.tsx`) | AdMob adaptive banner | — |
| Pre-roll | Before playback, max once per 3 min (`Player.tsx`) | AdMob interstitial | In-app overlay |
| Sponsored card | Home, Browse, Search, Wishlist, Details | — | House card |

Consent (GDPR/CCPA) is handled by Google's UMP SDK, and readers can switch ads
off in **Settings → Ads & support**.

What is missing is *your* AdMob account and its three IDs. This guide covers
both, in order.

---

## 1. Create the AdMob account

You need this yourself — it is tied to your identity, address and bank details,
and Google verifies it. Have ready:

- a Google account you intend to keep (do **not** use a throwaway),
- your legal name and postal address,
- country and timezone (the **currency is permanent** — pick the one you get paid in),
- tax information (W-8BEN for non-US residents, W-9 for US),
- a phone for SMS verification.

Steps:

1. Open <https://admob.google.com> and sign in with that Google account.
2. Accept the AdMob terms (they include the Google Ads Program policies).
3. Enter country/territory and timezone, then **Create AdMob account**.
4. Add your payment details: name, address, phone. This is where Google sends
   earnings — a mismatch with your bank can block payouts.
5. Complete tax info when prompted (**Payments → Settings → Tax info**).
6. Turn on 2-Step Verification on the Google account. AdMob accounts without it
   are prime targets for hijacking, and a hijacked account can be terminated.

> Payouts are sent monthly once your balance passes **$100** (or the local
> equivalent). Below that, the balance rolls over.

### Country availability

AdMob is not available in every country (for example, it is unavailable in
Crimea, Cuba, Iran, North Korea, Sudan and Syria, and there are restrictions
elsewhere). If signup is blocked, the practical alternatives are Google Ad
Manager with another network, or a mediation partner such as AppLovin or Unity
LevelPlay.

---

## 2. Add the app

In AdMob: **Apps → Add app**.

1. **Platform:** Android.
2. **Is the app listed on a supported store?**
   - *Yes* → pick Google Play and paste the Play Store URL. AdMob will verify it.
   - *No* → choose "No" and enter the app name **Flickora**. This works for
     sideloaded builds (Orion Store, direct APK), but some features and the
     store-verification badge stay unavailable until it is on a supported store.
3. Copy the **App ID** — it looks like `ca-app-pub-1234567890123456~1234567890`
   (a `~`, not a `/`).

---

## 3. Create the two ad units

In the app's dashboard: **Ad units → Add ad unit**.

| Ad unit | Format | Suggested name |
|---|---|---|
| 1 | **Banner** | `Flickora — Home banner` |
| 2 | **Interstitial** | `Flickora — Playback pre-roll` |

Leave the advanced settings at their defaults (mediation off, eCPM floor empty).
Copy each **ad unit ID**, which looks like
`ca-app-pub-1234567890123456/1234567890` (a `/`, not a `~`).

---

## 4. Put the IDs in the app

One command does all three files:

```bash
npm run admob:setup
```

It prompts for the App ID, banner unit and interstitial unit, then:

- writes `VITE_ADMOB_APP_ID`, `VITE_ADMOB_BANNER_ANDROID`,
  `VITE_ADMOB_INTERSTITIAL_ANDROID` into `.env` (gitignored),
- patches `android/app/src/main/AndroidManifest.xml` (`APPLICATION_ID`),
- writes `public/app-ads.txt` with your publisher ID.

Non-interactive, for CI or scripts:

```bash
npm run admob:setup -- \
  --app-id=ca-app-pub-1234567890123456~1234567890 \
  --banner=ca-app-pub-1234567890123456/1111111111 \
  --interstitial=ca-app-pub-1234567890123456/2222222222
```

Verify:

```bash
npm run admob:check
```

Every line should say `live`, and the policy pre-flight block should show no
`!` marks. Two more variables in `.env` are set by hand, not by the script:

| Variable | Default | Meaning |
|---|---|---|
| `VITE_ADMOB_MAX_AD_RATING` | `Teen` | Ceiling for ad creatives; must equal the AdMob console setting |
| `VITE_ADMOB_FORCE_TEST_ADS` | `true` while approval is pending | `true` keeps every request a test ad even with live IDs; set `false` only after approval and test-device registration |

Then rebuild:

```bash
npm run build:apk:release
```

> The app ID in `.env` and the one in `AndroidManifest.xml` **must be identical**.
> A mismatch makes the SDK crash on launch with
> `Missing application ID` / `Invalid application ID`.

---

## 5. app-ads.txt (required for verification)

AdMob verifies app ownership through `app-ads.txt`, which must be served from the
**root of the developer website listed on your store page**
(`https://yourdomain.com/app-ads.txt`, not a subfolder).

The setup script generates the file. To publish it:

1. In the Play Store console (or Orion Store listing), set the developer website
   to a domain you control, e.g. `https://flickora.example`.
2. Upload `public/app-ads.txt` there so it resolves at
   `https://flickora.example/app-ads.txt`.
3. In AdMob open the app → **App settings → app-ads.txt → Verify app**.
   Verification can take up to 24 hours.

If you deploy the Vite build to that domain, `public/app-ads.txt` is copied into
`dist/` automatically.

---

## 6. Consent and privacy (EEA, UK, Switzerland)

The app calls `requestConsentInfo()` and shows Google's form when consent is
required. For that form to have content you must configure a message:

1. AdMob → **Privacy & messaging → GDPR** → create a message for the app.
2. Choose the ad technology providers you use and publish it.
3. Users can reopen it any time from **Settings → Ad privacy choices**
   (wired to `showPrivacyOptionsForm()`).

Also required by Google Play: a privacy policy URL on the store listing that
mentions advertising, the AdMob/AdSense partner list, and how to opt out. The
Play **Data safety** form must declare the Advertising ID — the app already
declares the `com.google.android.gms.permission.AD_ID` permission.

---

## 7. Test properly, then go live

- **Test mode** is automatic: any ID that is still Google's demo ID is requested
  with `isTesting: true`, so it always returns a test ad and never invalid
  traffic. `npm run admob:check` tells you which IDs are still demo.
- **Test-device guard.** Once live IDs are in `.env`, set
  `VITE_ADMOB_FORCE_TEST_ADS=true` in the build you install on your own phone.
  Every request then stays a test ad even though the IDs are live, so your taps
  can never be counted as invalid traffic. Turn it off for the build you
  distribute.
- Never tap your own live ads, and never ask friends to. Google's invalid
  traffic detection suspends accounts for it.
- After switching to live IDs, the first impressions can take a few hours to
  appear in the AdMob dashboard. A fresh app with no history may serve very few
  ads at first — that is normal.
- Revenue is reported net of Google's share (the publisher keeps 55% of banner
  and 55% of interstitial revenue on AdMob's network).

---

## 8. Policy pre-flight — the part that gets accounts banned

AdMob terminations are almost never about code. They come from four things:
content rights, invalid traffic, a missing/unreachable privacy policy, and a
declared audience or rating that does not match reality. Run
`npm run admob:check` — it prints a pre-flight block for the items the repo can
verify. The rest is on your console settings and your store listing.

### 8.1 Content rights — the one that will actually bite

AdMob requires that you own or are licensed to distribute the content shown next
to your ads. Flickora is a client for third-party streams and embeds the VidRift
player, so live ads on top of unauthorised content is a fast route to
termination — and repeated violations can close the Google account, not just
AdMob.

Before enabling live IDs, one of these must be true:

- you have distribution rights for the catalogue the app plays, or
- the app only surfaces licensed/public-domain content, or
- you keep the build in test mode and monetise through the house sponsor card
  instead (`AD_CONFIG.house` in `src/config/ads.ts`).

No code change can make unlicensed streaming acceptable to AdMob. This is the
single decision that protects the account.

### 8.2 Invalid traffic

- The test-device guard (`VITE_ADMOB_FORCE_TEST_ADS=true`) exists so you can
  test a live build without generating invalid clicks.
- Never tap your own ads, and never buy installs/clicks.
- Do not put ads behind a "click to continue" or any control that looks like a
  button — accidental clicks are treated as invalid traffic.

### 8.3 Privacy policy and Data safety

- `PRIVACY.md` in this repo is written to satisfy Google Play's advertising
  disclosure. Host it at a public URL and put that URL on the store listing
  (Settings → About in the app already link to it).
- In Play Console → **Data safety**, declare: *Device or other IDs →
  Advertising ID*, purpose *Advertising*, and that data is shared with Google.
- If you use a consent message, the policy must name Google as an ad partner and
  explain how to withdraw consent — `PRIVACY.md` does.

### 8.4 Audience and content rating

- `VITE_ADMOB_MAX_AD_RATING` defaults to `Teen`, and the SDK is initialised with
  `tagForChildDirectedTreatment = false`, `tagForUnderAgeOfConsent = false`.
- In AdMob → **App settings**, set *Ad content rating* to the **same** value.
  A mismatch between the SDK ceiling and the console setting is a policy
  violation, not just a config quirk.
- If the app ever becomes directed at children, stop here: the Families policy
  forbids personalised ads and requires a different SDK configuration.

### 8.5 Placement rules this code already follows

- One banner at a time, docked above the nav, never overlapping content or
  controls (`bannerMarginDp`).
- Interstitials only before playback, at most one every 3 minutes
  (`interstitialGapMs`), never on app launch or on navigation.
- The browser "Sponsored" card is self-promotion, not AdMob inventory, and is
  labelled as sponsored so it cannot be mistaken for an ad unit.
- Users can turn ads off and can withdraw consent; both are honoured before any
  request is made.

---

## 9. Tuning

Everything lives in `src/config/ads.ts`:

| Setting | Effect |
|---|---|
| `enabled` | Master switch (`VITE_ADMOB_DISABLED=true` disables everything) |
| `interstitialGapMs` | Minimum gap between pre-rolls (default 3 min) |
| `bannerMarginDp` | Banner offset above the floating nav (default 84 dp) |
| `house` | The browser-only sponsored card copy and link |

Guidance that generally holds:

- A banner on every screen plus one skippable pre-roll every few minutes is
  about as much as a streaming UI can carry without hurting retention.
- Interstitials on app open or on every episode destroy session length; the
  existing rate limit exists for that reason.
- Add a **rewarded** unit before raising interstitial frequency if you want more
  revenue — rewarded opt-ins convert far better than forced full-screens.

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| App crashes at launch with `Invalid application ID` | Manifest App ID missing or malformed. Re-run `npm run admob:setup`. |
| Banner never appears | No fill for the ad unit yet (normal in the first hours), device offline, or ads disabled in Settings. Check `adb logcat | grep -i admob`. |
| `Ad failed to load: 3` | `ERROR_CODE_NO_FILL` — no ad inventory for that request. Usually transient; verify the unit ID is correct and the app is not in a restricted category. |
| `Ad failed to load: 0` | `ERROR_CODE_INTERNAL_ERROR` — usually a bad ad unit ID or an SDK/manifest mismatch. |
| Ads show as "Test Ad" | Expected while a demo ID is in use. Run `npm run admob:check`. |
| Ads work in debug, not in release | R8/Minify stripped something, or `.env` was not loaded during `vite build`. Rebuild with `npm run build:apk:release` and check `dist/assets/*.js` contains your App ID. |
| Nothing in the AdMob dashboard | Reporting lags hours; check **Apps → Flickora → Ad units** for request counts. |
