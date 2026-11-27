/**
 * Flickora advertising configuration.
 *
 * Real IDs live in `.env` (never committed). Run `npm run admob:setup` once you
 * have them — it writes `.env`, patches the Android manifest and creates
 * `public/app-ads.txt` in one go. `npm run admob:check` shows the current state.
 *
 *   VITE_ADMOB_APP_ID=ca-app-pub-0000000000000000~0000000000
 *   VITE_ADMOB_BANNER_ANDROID=ca-app-pub-0000000000000000/0000000000
 *   VITE_ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-0000000000000000/0000000000
 *
 * Anything missing or malformed falls back to Google's demo IDs, so the app
 * always builds and runs — it just earns nothing until real IDs are set.
 *
 * Full walkthrough: docs/ADMOB.md
 */

const env = import.meta.env;

/** Google's official sample IDs. They always serve test ads and never pay. */
export const ADMOB_TEST_IDS = {
  app: 'ca-app-pub-3940256099942544~3347511713',
  bannerAndroid: 'ca-app-pub-3940256099942544/6300978111',
  bannerIos: 'ca-app-pub-3940256099942544/2934735716',
  interstitialAndroid: 'ca-app-pub-3940256099942544/1033173712',
  interstitialIos: 'ca-app-pub-3940256099942544/4411468910',
} as const;

const APP_ID_PATTERN = /^ca-app-pub-\d{16}~\d{10}$/;
const AD_UNIT_PATTERN = /^ca-app-pub-\d{16}\/\d{10}$/;

function readAppId(value: string | undefined, fallback: string): string {
  const id = (value ?? '').trim();
  return APP_ID_PATTERN.test(id) ? id : fallback;
}

function readAdUnit(value: string | undefined, fallback: string): string {
  const id = (value ?? '').trim();
  return AD_UNIT_PATTERN.test(id) ? id : fallback;
}

/** AdMob App ID — must match the APPLICATION_ID in the Android manifest. */
export const ADMOB_APP_ID = readAppId(env.VITE_ADMOB_APP_ID, ADMOB_TEST_IDS.app);

const bannerAndroid = readAdUnit(env.VITE_ADMOB_BANNER_ANDROID, ADMOB_TEST_IDS.bannerAndroid);
const bannerIos = readAdUnit(env.VITE_ADMOB_BANNER_IOS, ADMOB_TEST_IDS.bannerIos);
const interstitialAndroid = readAdUnit(
  env.VITE_ADMOB_INTERSTITIAL_ANDROID,
  ADMOB_TEST_IDS.interstitialAndroid,
);
const interstitialIos = readAdUnit(
  env.VITE_ADMOB_INTERSTITIAL_IOS,
  ADMOB_TEST_IDS.interstitialIos,
);

/** True while an ID is still one of Google's demo units. */
export function isTestAdUnit(adId: string): boolean {
  return (Object.values(ADMOB_TEST_IDS) as string[]).includes(adId);
}

/** True when nothing billable is configured yet. */
export const ADMOB_IN_TEST_MODE = isTestAdUnit(bannerAndroid) && isTestAdUnit(interstitialAndroid);

const RATINGS = ['General', 'ParentalGuidance', 'Teen', 'MatureAudience'] as const;
export type MaxAdContentRatingName = (typeof RATINGS)[number];

function readRating(value: string | undefined, fallback: MaxAdContentRatingName): MaxAdContentRatingName {
  const rating = (value ?? '').trim();
  return (RATINGS as readonly string[]).includes(rating) ? (rating as MaxAdContentRatingName) : fallback;
}

/**
 * Audience and ad-creative limits. These are policy settings, not preferences:
 * they must match what you declared in the AdMob console, or the account is at
 * risk regardless of how good the code is.
 *
 *   VITE_ADMOB_MAX_AD_RATING   General | ParentalGuidance | Teen | MatureAudience
 *   VITE_ADMOB_FORCE_TEST_ADS  true → always serve test ads, even with live IDs
 */
export const AD_POLICY = {
  /**
   * Ceiling for ad creatives. Keep it at or below the rating of the app's own
   * content — Flickora ships a general film/TV catalogue, so `Teen` is the safe
   * default. Raise it only if the store listing and AdMob app settings agree.
   */
  maxAdContentRating: readRating(env.VITE_ADMOB_MAX_AD_RATING, 'Teen'),

  /** COPPA: Flickora is not directed at children under 13. Declare it explicitly. */
  tagForChildDirectedTreatment: false,

  /** GDPR: no age signal to pass on. */
  tagForUnderAgeOfConsent: false,

  /**
   * Forces every request to a test ad while keeping live IDs in place. Turn this
   * on for your own device before tapping anything: clicking your own live ads
   * is invalid traffic and the fastest way to lose the account.
   */
  forceTestAds: env.VITE_ADMOB_FORCE_TEST_ADS === 'true',
} as const;

export const AD_CONFIG = {
  /** Master switch. The user's "Show ads" preference can still turn ads off. */
  enabled: env.VITE_ADMOB_DISABLED !== 'true',

  /** Informational: true until real Android ad units are configured. */
  testMode: ADMOB_IN_TEST_MODE,

  banner: {
    android: bannerAndroid,
    ios: bannerIos,
  },

  interstitial: {
    android: interstitialAndroid,
    ios: interstitialIos,
  },

  /** Minimum time between two pre-roll interstitials (default: 3 minutes). */
  interstitialGapMs: 3 * 60 * 1000,

  /** Height of the floating bottom dock plus breathing room, in dp. */
  bannerMarginDp: 84,

  /**
   * Self-promo ad shown in browsers and in the web build, where AdMob cannot
   * run. Swap these values for an affiliate or sponsor offer to monetise it.
   */
  house: {
    label: 'Sponsored',
    title: 'Flickora stays free because of ads',
    body: 'No account, no tracking, no subscription. Support the project to keep new features coming.',
    cta: 'Support Flickora',
    url: 'https://github.com/BindasTime/Flickora-Mobile',
  },
} as const;
