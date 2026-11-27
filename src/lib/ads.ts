import { Capacitor } from '@capacitor/core';
import { AD_CONFIG, AD_POLICY, isTestAdUnit } from '../config/ads';

type AdMobModule = typeof import('@capacitor-community/admob');

const INTERSTITIAL_KEY = 'flickora:ads:lastPlayback';

let sdk: AdMobModule | null = null;
let initPromise: Promise<boolean> | null = null;
let ready = false;
let bannerVisible = false;
let bannerAttempts = 0;
/** Set when consent could not be verified; every request then asks for NPA. */
let nonPersonalizedOnly = false;

/** True inside the Android/iOS shell, where the AdMob SDK is available. */
export function adsRunNatively(): boolean {
  return Capacitor.isNativePlatform();
}

function unit(kind: 'banner' | 'interstitial'): string {
  return Capacitor.getPlatform() === 'ios' ? AD_CONFIG[kind].ios : AD_CONFIG[kind].android;
}

/**
 * A request is a test request when the unit is one of Google's demo IDs, or when
 * this build is flagged as a test device. Never request a live ad on a device
 * you are going to tap on yourself.
 */
function testingFor(adId: string): boolean {
  return AD_POLICY.forceTestAds || isTestAdUnit(adId);
}

async function loadSdk(): Promise<AdMobModule | null> {
  if (!AD_CONFIG.enabled || !adsRunNatively()) return null;
  if (sdk) return sdk;
  try {
    sdk = await import('@capacitor-community/admob');
    return sdk;
  } catch (error) {
    console.warn('AdMob plugin is not installed in this build.', error);
    return null;
  }
}

type ConsentOutcome = 'granted' | 'denied' | 'unknown';

/**
 * Reads the UMP consent state and shows the form when it is required.
 * UMP needs a network round-trip; if that fails we cannot prove consent, so the
 * session continues with non-personalized ads instead of losing every ad.
 */
async function requestConsent(module: AdMobModule): Promise<ConsentOutcome> {
  try {
    let consent = await module.AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === module.AdmobConsentStatus.REQUIRED) {
      consent = await module.AdMob.showConsentForm();
    }
    return consent.canRequestAds ? 'granted' : 'denied';
  } catch (error) {
    console.warn('Consent check failed; falling back to non-personalized ads.', error);
    return 'unknown';
  }
}

/**
 * Requests UMP consent (required in the EEA/UK) and initializes the SDK once.
 * Resolves to the module only when ads may actually be requested.
 */
async function ensureReady(): Promise<AdMobModule | null> {
  const module = await loadSdk();
  if (!module) return null;
  if (ready) return module;

  if (!initPromise) {
    initPromise = (async () => {
      const consent = await requestConsent(module);
      if (consent === 'denied') return false;
      nonPersonalizedOnly = consent === 'unknown';
      try {
        await module.AdMob.initialize({
          initializeForTesting: AD_CONFIG.testMode || AD_POLICY.forceTestAds,
          // Declared audience and creative ceiling. These mirror the AdMob
          // console settings; a mismatch is a policy violation.
          tagForChildDirectedTreatment: AD_POLICY.tagForChildDirectedTreatment,
          tagForUnderAgeOfConsent: AD_POLICY.tagForUnderAgeOfConsent,
          maxAdContentRating:
            module.MaxAdContentRating[AD_POLICY.maxAdContentRating],
        });
        return true;
      } catch (error) {
        console.warn('AdMob could not start; continuing without ads.', error);
        return false;
      }
    })();
  }

  const ok = await initPromise;
  if (!ok) {
    initPromise = null;
    return null;
  }
  ready = true;
  return module;
}

/** Docks an adaptive banner above the app's floating navigation bar. */
export async function showBannerAd(): Promise<void> {
  const module = await ensureReady();
  if (!module || bannerVisible) return;
  try {
    await module.AdMob.showBanner({
      adId: unit('banner'),
      adSize: module.BannerAdSize.ADAPTIVE_BANNER,
      position: module.BannerAdPosition.BOTTOM_CENTER,
      margin: AD_CONFIG.bannerMarginDp,
      isTesting: testingFor(unit('banner')),
      npa: nonPersonalizedOnly,
    });
    bannerVisible = true;
    bannerAttempts = 0;
  } catch (error) {
    console.warn('Banner ad failed to load.', error);
    // A cold start or a network blip should not mean "no banner this session".
    if (bannerAttempts < 3) {
      bannerAttempts += 1;
      window.setTimeout(() => void showBannerAd(), 15_000 * bannerAttempts);
    }
  }
}

export async function hideBannerAd(): Promise<void> {
  if (!bannerVisible) return;
  const module = sdk;
  bannerVisible = false;
  try {
    await module?.AdMob.removeBanner();
  } catch (error) {
    console.warn('Could not remove the banner ad.', error);
  }
}

/**
 * A pre-roll is allowed when ads are on and the last one was long enough ago,
 * so opening several titles in a row never turns into an ad storm.
 */
export function playbackAdAllowed(adsEnabled: boolean): boolean {
  if (!AD_CONFIG.enabled || !adsEnabled) return false;
  try {
    const last = Number(window.localStorage.getItem(INTERSTITIAL_KEY) || 0);
    return Date.now() - last >= AD_CONFIG.interstitialGapMs;
  } catch {
    return true;
  }
}

export function notePlaybackAd(): void {
  try {
    window.localStorage.setItem(INTERSTITIAL_KEY, String(Date.now()));
  } catch {
    // Storage may be blocked; the cap simply does not apply.
  }
}

/** Shows a native interstitial. Resolves false when nothing was displayed. */
export async function showInterstitialAd(): Promise<boolean> {
  const module = await ensureReady();
  if (!module) return false;
  try {
    await module.AdMob.prepareInterstitial({
      adId: unit('interstitial'),
      isTesting: testingFor(unit('interstitial')),
      npa: nonPersonalizedOnly,
    });
    await module.AdMob.showInterstitial();
    return true;
  } catch (error) {
    console.warn('Interstitial ad was not shown.', error);
    return false;
  }
}

/**
 * Opens Google's GDPR/CCPA privacy options form so a user can change or withdraw
 * ad consent at any time. No-op on web or when no message is configured.
 */
export async function showAdPrivacyOptions(): Promise<boolean> {
  const module = await ensureReady();
  if (!module) return false;
  try {
    await module.AdMob.showPrivacyOptionsForm();
    return true;
  } catch (error) {
    console.warn('Ad privacy options are not available.', error);
    return false;
  }
}
