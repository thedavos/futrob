# MOB-08 verification

## Offline checks

- `EXPO_OFFLINE=1 EXPO_NO_DOTENV=1 expo config --type public --json` passed, exit 0.
- `EXPO_OFFLINE=1 EXPO_NO_DOTENV=1 expo config --type introspect --json` passed, exit 0.
- `npm run generate:assets -w @futrob/mobile` passed, exit 0.
- `npm run typecheck -w @futrob/mobile` passed, exit 0.
- `npm test -w @futrob/mobile` passed, exit 0, 155 tests across 22 files.
- Changed-file format and lint passed, exit 0.

[Offline observations](offline-results.txt) retain the native entitlement and manifest
checks, icon dimensions and alpha checks, existing route checks and listing field lengths.
The iOS icon's RGB bytes match main. Its alpha channel was removed. The Play icon is a
512 px export of the same canonical composition. There is no changed in-app screen.

The local raw logs/config are `/tmp/mob-08-expo-config.json`,
`/tmp/mob-08-expo-introspect.json`, `/tmp/mob-08-typecheck.log`, `/tmp/mob-08-tests.log`,
`/tmp/mob-08-format.log`, and `/tmp/mob-08-lint.log`.

## Unverified owner steps

No EAS Build, Submit, login, account lookup, signing, store creation or deployment ran.
No iOS simulator or Android emulator was available, so native launcher and store
screenshots were not captured. Device screenshots and the Play feature graphic remain
owner inputs. No live universal-link claim or store-readiness claim is made.

The association files are intentionally templates outside website public assets.
They need the owner's Apple application identifier prefix and Android signing certificate
fingerprints before hosting. EAS project linkage, existing store IDs, credentials, support
contact, review account, store declarations and external deletion URL also remain open.
The [owner guide](../../../apps/mobile/release/README.md) gives the manual steps.

## Scope review

- Clients. Native build/link configuration and generated assets only. No web UI, SDK, domain or persistence change.
- Contract. Existing `/api/v1`, auth and SDK contracts remain. No OpenAPI or API route change. The external deletion-request page is a store preparation gap, not a new backend feature in this task.
- Access. Existing route gates, server authorization and EffectiveAccess decisions remain. No role, permission or bypass changes.
- Entry points. The two existing invitation routes gain native HTTPS declarations. Their auth and resume behavior remains implemented by existing route code. Landing and public portal URLs are excluded. CLI and notifications do not change.
- Reverse states. Existing acceptance, retry, exit, sign-out and deletion cancellation remain. Builds and submissions require explicit owner commands; no automatic upload or release is configured.
- States. No in-app state changes. Existing loading, empty, denied and error states are unchanged. No filters apply.
- Docs. Mobile README links the release guide, association templates and ES/EN store copy. No architectural decision or verification skill changed. `verify-futrob` still leaves native mobile unmapped.
