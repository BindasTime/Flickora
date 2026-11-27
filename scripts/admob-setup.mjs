#!/usr/bin/env node
/**
 * AdMob setup helper.
 *
 * Takes the three IDs from your AdMob account and puts each one where it
 * belongs, so there is no hand-editing of XML or env files:
 *
 *   .env                                      VITE_ADMOB_* (read by the app)
 *   android/app/src/main/AndroidManifest.xml  APPLICATION_ID meta-data
 *   public/app-ads.txt                        publisher verification file
 *
 * Usage:
 *   npm run admob:setup                       # interactive
 *   npm run admob:setup -- --check            # show current status only
 *   npm run admob:setup -- \
 *     --app-id=ca-app-pub-1234567890123456~1234567890 \
 *     --banner=ca-app-pub-1234567890123456/1111111111 \
 *     --interstitial=ca-app-pub-1234567890123456/2222222222
 *
 * Where to find the IDs: https://admob.google.com → Apps → Flickora →
 * App settings (App ID) and Ad units (one banner, one interstitial).
 * Full walkthrough: docs/ADMOB.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENV_FILE = path.join(ROOT, '.env');
const MANIFEST_FILE = path.join(ROOT, 'android/app/src/main/AndroidManifest.xml');
const APP_ADS_FILE = path.join(ROOT, 'public/app-ads.txt');
const PRIVACY_FILE = path.join(ROOT, 'PRIVACY.md');

const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_UNITS = new Set([
  'ca-app-pub-3940256099942544/6300978111',
  'ca-app-pub-3940256099942544/1033173712',
  'ca-app-pub-3940256099942544/2934735716',
  'ca-app-pub-3940256099942544/4411468910',
]);

const APP_ID_RE = /^ca-app-pub-\d{16}~\d{10}$/;
const AD_UNIT_RE = /^ca-app-pub-\d{16}\/\d{10}$/;

const ENV_KEYS = {
  appId: 'VITE_ADMOB_APP_ID',
  banner: 'VITE_ADMOB_BANNER_ANDROID',
  interstitial: 'VITE_ADMOB_INTERSTITIAL_ANDROID',
};

const bold = (text) => `\u001b[1m${text}\u001b[0m`;
const green = (text) => `\u001b[32m${text}\u001b[0m`;
const yellow = (text) => `\u001b[33m${text}\u001b[0m`;
const dim = (text) => `\u001b[2m${text}\u001b[0m`;

function usage() {
  console.log(`AdMob setup for Flickora

  npm run admob:setup                 interactive setup
  npm run admob:setup -- --check      print current configuration
  npm run admob:setup -- --app-id=<App ID> --banner=<unit> --interstitial=<unit>

Get the IDs from https://admob.google.com → Apps → Flickora.`);
}

function parseArgs(argv) {
  const args = { check: false, help: false };
  for (const raw of argv) {
    if (raw === '--') continue;
    if (raw === '--check') args.check = true;
    else if (raw === '--help' || raw === '-h') args.help = true;
    else {
      const match = raw.match(/^--([a-z-]+)=(.*)$/);
      if (!match) throw new Error(`Unknown argument: ${raw}`);
      args[match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = match[2].trim();
    }
  }
  return args;
}

function readEnvFile() {
  if (!existsSync(ENV_FILE)) return {};
  const values = {};
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

/** Updates keys in place, keeps unrelated lines and comments, appends the rest. */
function upsertEnv(values) {
  const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
  const lines = existing ? existing.split(/\r?\n/) : [];
  const pending = new Map(Object.entries(values));
  const out = lines.map((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (!match || !pending.has(match[1])) return line;
    const value = pending.get(match[1]);
    pending.delete(match[1]);
    return `${match[1]}=${value}`;
  });
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  if (pending.size) {
    if (out.length) out.push('');
    out.push('# AdMob — public client-side IDs, safe to ship in the app bundle.');
    for (const [key, value] of pending) out.push(`${key}=${value}`);
  }
  writeFileSync(ENV_FILE, `${out.join('\n')}\n`);
}

function patchManifest(appId) {
  if (!existsSync(MANIFEST_FILE)) {
    throw new Error(`Android manifest not found at ${MANIFEST_FILE}`);
  }
  const xml = readFileSync(MANIFEST_FILE, 'utf8');
  const pattern =
    /(android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[\s\S]*?android:value=")[^"]*(")/;
  if (!pattern.test(xml)) {
    throw new Error(
      'Could not find the AdMob APPLICATION_ID meta-data in AndroidManifest.xml.',
    );
  }
  writeFileSync(MANIFEST_FILE, xml.replace(pattern, `$1${appId}$2`));
}

function writeAppAdsTxt(appId) {
  const publisher = appId.split('~')[0].replace('ca-app-pub-', '');
  mkdirSync(path.dirname(APP_ADS_FILE), { recursive: true });
  const line = `google.com, pub-${publisher}, DIRECT, f08c47fec0942fa0\n`;
  writeFileSync(APP_ADS_FILE, line);
  return line.trim();
}

function status(label, value) {
  if (!value) return `${label.padEnd(24)} ${yellow('missing')}`;
  if (value === TEST_APP_ID || TEST_UNITS.has(value)) {
    return `${label.padEnd(24)} ${yellow('test ID')}  ${dim(value)}`;
  }
  return `${label.padEnd(24)} ${green('live')}     ${dim(value)}`;
}

function check() {
  const env = readEnvFile();
  const xml = existsSync(MANIFEST_FILE) ? readFileSync(MANIFEST_FILE, 'utf8') : '';
  const manifestId = xml.match(/ads\.APPLICATION_ID"[\s\S]*?android:value="([^"]*)"/)?.[1] ?? '';
  const appAds = existsSync(APP_ADS_FILE) ? readFileSync(APP_ADS_FILE, 'utf8').trim() : '';

  console.log(bold('\nAdMob configuration\n'));
  console.log(`  ${status('App ID (manifest)', manifestId)}`);
  console.log(`  ${status('App ID (.env)', env[ENV_KEYS.appId])}`);
  console.log(`  ${status('Banner (.env)', env[ENV_KEYS.banner])}`);
  console.log(`  ${status('Interstitial (.env)', env[ENV_KEYS.interstitial])}`);
  console.log(
    `  ${'app-ads.txt'.padEnd(24)} ${appAds ? green('present') : yellow('missing')}  ${dim(path.relative(ROOT, APP_ADS_FILE))}`,
  );
  if (appAds) console.log(dim(`  ${appAds}`));

  console.log(bold('\nPolicy pre-flight\n'));
  const policy = [
    ['Privacy policy file', existsSync(PRIVACY_FILE), path.relative(ROOT, PRIVACY_FILE)],
    [
      'AD_ID permission',
      /com\.google\.android\.gms\.permission\.AD_ID/.test(xml),
      'AndroidManifest.xml',
    ],
    ['app-ads.txt', Boolean(appAds), 'publisher verification'],
    [
      'Ad content rating',
      true,
      env.VITE_ADMOB_MAX_AD_RATING || 'Teen (default)',
    ],
    [
      'Test-device guard',
      env.VITE_ADMOB_FORCE_TEST_ADS === 'true',
      env.VITE_ADMOB_FORCE_TEST_ADS === 'true'
        ? 'on — every request is a test ad'
        : 'off — set VITE_ADMOB_FORCE_TEST_ADS=true on your own device',
    ],
  ];
  for (const [label, ok, detail] of policy) {
    const mark = ok ? green('✓') : yellow('!');
    console.log(`  ${mark} ${label.padEnd(22)} ${dim(detail)}`);
  }

  const allLive =
    manifestId &&
    manifestId === env[ENV_KEYS.appId] &&
    manifestId !== TEST_APP_ID &&
    env[ENV_KEYS.banner] &&
    !TEST_UNITS.has(env[ENV_KEYS.banner]) &&
    env[ENV_KEYS.interstitial] &&
    !TEST_UNITS.has(env[ENV_KEYS.interstitial]);

  console.log('');
  if (allLive) {
    console.log(green('Live IDs in place.') + ' Do not tap your own ads — use the test-device guard while testing.');
    if (env.VITE_ADMOB_FORCE_TEST_ADS !== 'true') {
      console.log(yellow('Reminder:') + ' the test-device guard is off, so this build serves billable ads.');
    }
  } else {
    console.log(yellow('Still using demo ads.') + ' Run: npm run admob:setup');
  }
  console.log('');
  return allLive;
}

async function ask(rl, question, validate, fallback) {
  for (;;) {
    const hint = fallback ? dim(` [${fallback}]`) : '';
    const answer = (await rl.question(`  ${question}${hint}\n  > `)).trim();
    const value = answer || fallback || '';
    if (!value) {
      console.log(yellow('  A value is required.'));
      continue;
    }
    if (!validate(value)) {
      console.log(yellow('  That does not look like an AdMob ID. Expected ca-app-pub-…'));
      continue;
    }
    return value;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return 0;
  }
  if (args.check) {
    return check() ? 0 : 1;
  }

  const env = readEnvFile();
  let appId = args.appId ?? '';
  let banner = args.banner ?? '';
  let interstitial = args.interstitial ?? '';

  const missing = [
    [appId, APP_ID_RE],
    [banner, AD_UNIT_RE],
    [interstitial, AD_UNIT_RE],
  ].some(([value, re]) => value && !re.test(value));
  if (missing) {
    console.error(yellow('One of the IDs is malformed. Expected ca-app-pub-<16 digits>~<10 digits> for the App ID and /<10 digits> for ad units.'));
    return 1;
  }

  if (!appId || !banner || !interstitial) {
    if (!stdin.isTTY) {
      console.error(yellow('Missing IDs and no terminal to prompt in. Pass --app-id, --banner and --interstitial.'));
      return 1;
    }
    console.log(bold('\nFlickora · AdMob setup\n'));
    console.log(dim('AdMob → Apps → Flickora → App settings (App ID) and Ad units.\n'));
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      appId ||= await ask(rl, 'AdMob App ID', (v) => APP_ID_RE.test(v), env[ENV_KEYS.appId]);
      banner ||= await ask(rl, 'Banner ad unit ID', (v) => AD_UNIT_RE.test(v), env[ENV_KEYS.banner]);
      interstitial ||= await ask(
        rl,
        'Interstitial ad unit ID',
        (v) => AD_UNIT_RE.test(v),
        env[ENV_KEYS.interstitial],
      );
    } finally {
      rl.close();
    }
  }

  const publishers = new Set(
    [appId, banner, interstitial].map((id) => id.split(/[~/]/)[0]),
  );
  if (publishers.size !== 1) {
    console.error(
      yellow('The App ID and both ad units must belong to the same AdMob publisher (ca-app-pub-…).'),
    );
    return 1;
  }

  upsertEnv({
    [ENV_KEYS.appId]: appId,
    [ENV_KEYS.banner]: banner,
    [ENV_KEYS.interstitial]: interstitial,
  });
  patchManifest(appId);
  const appAdsLine = writeAppAdsTxt(appId);

  console.log(green('\nSaved.'));
  console.log(`  .env                       ${dim(ENV_KEYS.appId + ', ' + ENV_KEYS.banner + ', ' + ENV_KEYS.interstitial)}`);
  console.log(`  AndroidManifest.xml        ${dim(appId)}`);
  console.log(`  public/app-ads.txt         ${dim(appAdsLine)}`);
  console.log(`
Next:
  1. ${bold('npm run admob:check')} — confirm every ID is live.
  2. ${bold('npm run build:apk:release')} — rebuild the signed APK.
  3. Test on a real device: ads should appear after a short delay.
  4. Host ${bold('public/app-ads.txt')} at the root of the website on your
     Play Store listing, then hit "Verify app" in AdMob.

Details: docs/ADMOB.md
`);
  return 0;
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((error) => {
    console.error(yellow(error.message));
    process.exit(1);
  });
