# MOB-07 verification

AUTH-03 already provides account preferences, email and password forms, device sessions,
and account deletion with blockers and a cancellation period. MOB-07 closes three gaps.

## Regression proof

Tests were added before the fixes. The initial targeted run failed for root Back navigation,
revoked account credentials, and cached deletion status after cancellation. The fixed run
passed all 16 account tests. The workspace run passed 22 files and 165 tests.

| Command                                                           | Result                  |
| ----------------------------------------------------------------- | ----------------------- |
| `npm run typecheck -w @futrob/mobile`                             | Pass, exit 0            |
| `npm test -w @futrob/mobile`                                      | Pass, exit 0, 165 tests |
| `vp fmt --check <changed files>`                                  | Pass, exit 0            |
| `vp lint <changed code files>`                                    | Pass, exit 0            |
| `oxlint -c tools/oxlint/tests.oxlintrc.json <changed test files>` | Pass, exit 0            |

Raw local logs are `/tmp/mob-07-red.log`, `/tmp/mob-07-account-green.log`,
`/tmp/mob-07-typecheck.log`, `/tmp/mob-07-tests.log`, `/tmp/mob-07-format.log`,
`/tmp/mob-07-lint.log`, and `/tmp/mob-07-test-lint.log`.

## Browser captures

Captured at 390 × 844 using Playwright Chromium and the real account route components
rendered through React Native Web. Auth, API, SecureStore and navigation use isolated
fixtures. Safe area insets are zero in this preview. Manrope loads from the installed font
assets. The temporary preview and capture script are in `/tmp/futrob-mob-review/`.

| Action                                           | Before                                      | After                                   |
| ------------------------------------------------ | ------------------------------------------- | --------------------------------------- |
| Cold-open `/account`, press Back                 | [Account loops](back-before.png)            | [Personal destination](back-after.png)  |
| Cancel deletion, reopen Account → Delete account | [Stale scheduled status](cancel-before.png) | [Active account form](cancel-after.png) |

The adjacent `.aria.txt` files retain the action result snapshots. The preview also rendered
Account, Security, Sessions and Delete account. No iOS simulator, Android emulator,
VoiceOver, TalkBack, native keyboard or native safe-area verification was available.
These browser captures and mocked tests do not prove live integration or `AC-MOB-*`.
The existing `verify-futrob` feature map explicitly leaves native mobile unmapped.

## Scope review

- Clients. Mobile presentation and auth adapter change. Web and SDK keep their existing contracts and behavior.
- Contract. No `/api/v1`, OpenAPI, route or backend changes. No missing endpoint blocks these fixes.
- Access. Own-account operations apply to all authenticated roles. Server ownership, deletion blockers and the existing gate remain authoritative. Tests cover 401, denied 403, wrong-password 400 and delayed old-session responses.
- Entry points. Existing Cuenta buttons and direct account routes remain. Root Back resolves the existing destination gate; nested Back returns to Account. No notification, CLI or deep-link contract changes.
- Reverse states. Cancel deletion updates the cached status before returning to the app. History navigation remains available.
- States. Existing loading, empty sessions, errors, retry, responsibility blockers and scheduled states remain. No filters apply.
- Docs. Mobile README now documents account behavior and verification limits. No architectural or skill contract changed.
