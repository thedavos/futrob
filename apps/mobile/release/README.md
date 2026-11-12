# Prepare the mobile store release

This directory contains repository configuration and editorial store copy for MOB-08.
It does not create Expo projects, builds, credentials, store records or releases.
Run account commands yourself after reviewing the prerequisites below.

## Link the project and prepare credentials

1. Confirm ownership of `com.futrob.app` on Apple and Google and of `futrob.app`.
2. From `apps/mobile`, authenticate to EAS and run `eas init` to link the owner's project.
   Commit the resulting public `extra.eas.projectId` and `owner` configuration.
3. Create the App Store Connect and Play Console app records yourself. Set the existing
   iOS record's numeric `ascAppId` in `eas.json` before submission so the CLI selects that record.
   The checked-in empty iOS submit options currently require interactive setup.
4. Configure iOS distribution signing and the Google Play upload key through EAS.
   Assign the Play service account to this app in EAS credentials. Keep keys outside Git.
5. Set preview service URLs in the EAS `preview` environment. Production uses
   `https://futrob.app` for the product BFF and auth proxy. Confirm the deployed Bearer
   endpoints work there. Never point mobile at the internal API host or ship server secrets.
6. Configure the existing Sentry public DSN and source map credentials in EAS if enabled.
   Keep `SENTRY_AUTH_TOKEN` secret. Review encryption declarations for the actual binary.

`eas.json` uses remote build numbers and increments production builds. The marketing
version remains in `app.json`. The preview profile produces an Android APK and an iOS
simulator build, without a development client. Production produces store artifacts.
Run EAS commands from `apps/mobile` so they use this app's configuration in the monorepo.
See [Expo monorepo builds](https://docs.expo.dev/build-reference/build-with-monorepos/),
[version management](https://docs.expo.dev/build-reference/app-versions/) and
[Submit configuration](https://docs.expo.dev/submit/eas-json/).

## Finish the website association

1. Replace `APPLE_TEAM_ID` in `links/apple-app-site-association.template.json` with the
   signing app's Apple application identifier prefix. Confirm it matches the signed entitlement.
2. Replace `PLAY_APP_SIGNING_SHA256_FINGERPRINT` in `links/assetlinks.template.json`
   with the SHA-256 fingerprint from Play App Signing, rather than only the upload key.
   Include a separate certificate fingerprint if testing a directly installed signed APK.
3. Copy the completed files to the website's public assets as
   `apps/web/public/.well-known/apple-app-site-association` and
   `apps/web/public/.well-known/assetlinks.json`. Never publish the template markers.
4. Deploy the website yourself. Confirm both URLs on `https://futrob.app/.well-known/`
   return HTTP 200, JSON content type and the completed JSON without redirects or login.
   Configure the content type for the extensionless Apple file in the hosting layer.
5. Enable the Associated Domains capability for the iOS app identifier and sign a new build.
   Install signed builds on iOS and Android to verify domain association.

The native configuration and Apple paths claim only `/invitations/accept/*` and
`/roster-invitations/accept/*`. Expo Router already implements these paths and stores
pending invitation tokens across auth. The existing `futrob://` scheme remains available.
Landing, public portal and other web URLs stay in the browser.

Test both HTTPS invitation paths from a cold start, background and signed-out state.
Confirm that auth resumes acceptance, errors can retry, and tokens stay out of logs.
Test the existing custom scheme too. Domain verification, signing and live invitation
acceptance cannot be proved by a web preview. The association files remain templates
because the signing identifiers are owner inputs.

See [iOS Universal Links](https://docs.expo.dev/linking/ios-universal-links/) and
[Android App Links](https://docs.expo.dev/linking/android-app-links/).

## Complete the store listings

`store-listing.json` is editorial input for manual entry, not an EAS Metadata schema or
an automatically uploaded listing. It supplies ES and EN names, descriptions, category
and URLs for both stores. Copy only claims supported by the release candidate.
The website is a provisional support destination; confirm a working support contact
before submitting. Confirm that the privacy URL is public and approved. This task does
not change any legal document.

Use `assets/icon.png` for the 1024 px iOS icon and `assets/store-icon.png` for the 512 px
Play listing. Android adaptive and monochrome icons reuse the canonical mark's alpha
mask. `npm run generate:assets -w @futrob/mobile` regenerates all images from the shared
logo and tokens, with no new brand artwork.

Capture real iPhone, iPad and Android release-candidate screenshots for the enabled
device families and create the Play feature graphic. Complete review contact, support
contact, app-access instructions with a disposable review account, age/content ratings,
privacy and data-safety answers using the actual services and data. Supply the store's
external account-deletion URL; the current app has in-app deletion, but this task does
not add a public deletion-request page. Do not submit until these owner inputs and the
remaining required mobile flows have been verified. No purchase CTA is added.

## Build, test and submit yourself

These commands are owner steps. None were run for MOB-08.

```sh
cd apps/mobile
eas build --profile preview --platform all
eas build --profile production --platform all
# Select the reviewed production artifacts explicitly.
eas submit --profile production --platform ios --id <ios-build-id>
eas submit --profile production --platform android --id <android-build-id>
```

Complete the first Android upload manually in Play Console before later EAS submissions,
as described in [Expo's Android submission guide](https://docs.expo.dev/submit/android/).
The configured Android submission targets the internal track as a draft. iOS uploads
are reviewed in App Store Connect and TestFlight before any store release. Uploads do
not replace the store listing or the owner's final release decision. No automatic
submission workflow is configured.

Verify account settings, remote session revocation, deletion and cancellation on both
platforms, along with the required role flows and link matrix. Use VoiceOver and TalkBack,
ES and EN, native keyboard, safe areas and 44 dp controls. `verify-futrob` currently maps
web only. Neither mocked tests nor browser screenshots satisfy native `AC-MOB-*`.
