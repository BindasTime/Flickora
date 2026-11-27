# Release checklist — Flickora 2.0.3

## Version

- `package.json` / `package-lock.json`: `2.0.3`
- Android `versionCode`: `6`
- Android `versionName`: `2.0.3`
- Android package / applicationId: `com.flickora.app`
- Signed outputs:
  - `release/Flickora-v2.0.3.apk`
  - `release/Flickora-v2.0.3.aab`

## Signing

The release keystore and its properties are intentionally **not committed**.

- Keystore: `android/app/flickora-release.jks`
- Properties: `android/keystore.properties` (gitignored)

`android/app/build.gradle` only applies the signing config when
`android/keystore.properties` exists, so contributors can still build debug
builds without the private key.

To rotate or recreate the key:

```bash
PASS="$(openssl rand -hex 24)"
keytool -genkeypair -v \
  -keystore android/app/flickora-release.jks \
  -alias flickora \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=Flickora, OU=Mobile, O=Flickora, L=Lahore, ST=Punjab, C=PK"
cat > android/keystore.properties <<EOF
storeFile=app/flickora-release.jks
storePassword=$PASS
keyAlias=flickora
keyPassword=$PASS
EOF
chmod 600 android/keystore.properties android/app/flickora-release.jks
```

Keep a private backup of both files. Losing them means users cannot update
in-place; Android will treat the next build as a different app.

## Build

```bash
npm run build:release
npm run admob:check
```

The production web bundle currently keeps `VITE_ADMOB_FORCE_TEST_ADS=true`.
That is deliberate while AdMob approval is pending: live IDs are in place, but
every request is still a test ad, so no invalid-traffic risk exists. After the
app is approved, set it to `false`, rebuild, and smoke-test again.

## Pre-flight

- `npm run admob:check` — live IDs, app-ads.txt, AD_ID permission, privacy policy
- `npx tsc --noEmit` — already part of `npm run build`
- Install the signed APK and verify:
  - splash/logo, AI movie finder, 5 themes, glass navbar, spotlight swipe
  - landscape player → portrait restore
  - no crash/ANR in logcat

## GitHub release

Use the account that owns `BindasTime/Flickora` (the `Flickora-Mobile` URL
redirects here). Attach:

- `release/Flickora-v2.0.3.apk`
- `release/Flickora-v2.0.3.aab` (optional, for stores)
