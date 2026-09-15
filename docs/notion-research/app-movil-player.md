# App móvil Player. Research

Epic Notion "App móvil Player" (board Fundamentos). Research only. No product code in this change.

**Baseline (measured).** `apps/mobile` is Expo SDK 57 with Expo Router. Auth stores a Better Auth bearer token in `expo-secure-store`. `getFutrobClient()` wraps `@futrob/sdk`. Screens today are login, signup, a static onboarding welcome, and a placeholder home. There is no tab shell, no Personal or Organization switcher, no onboarding steps, no player home data, no matches, no statistics, no inbox, no universal links, no i18n, and no remote logout. `apps/mobile` is not in the root Vitest `projects` list, so `npm test` and `npm run test:coverage` do not run mobile tests.

**Hexagonal constraint.** Mobile must not import `@futrob/<bc>`, adapters, or persistence. It consumes versioned `/api/v1` through `@futrob/sdk` (FTR-MOB-003, AC-MOB-003). Domain finish, invitation eligibility, roster capacity, and club resolution stay in `packages/*` and `apps/api`.

**Web parity target.** Web already ships the three onboarding paths, atomic finish, EA club association without sending crest bytes, workspace switcher, `EffectiveAccess` gating, player home, matches, statistics, and roster inbox. Mobile should reuse those SDK methods and copy presentation policy, not reimplement use cases.

**Test conventions.** Import from `vite-plus/test`. Colocate next to the subject. SDK HTTP tests use `mockFetch` from `@futrob/sdk/testing`. API finish and typed errors are already covered in `apps/api/src/http/routes/onboarding.test.ts`. Mobile Vitest today includes only `apps/mobile/src/**/*.{test,spec}.ts`. Adding `.tsx` or `app/` tests needs a vite config change. Native E2E (Maestro or equivalent) does not exist. AC-MOB-* requires iOS and Android builds, not Expo web.

Suggested layers in the test list:

- unit. Pure functions, session store against a fake SecureStore, error maps, nav filters, draft locators.
- integration. SDK or mobile adapter against `mockFetch`. Auth worker `get-session` and `sign-out` with a fake fetch.
- e2e. Native smoke that CI can fail. Until a simulator job exists, keep a node smoke that proves the SDK sequence. Do not treat Expo web as AC-MOB proof.

---

## [Auth] Secure storage + refresh de sesión móvil

### Context

`saveSession` writes `futrob.session.token` and `futrob.session.user` through `expo-secure-store`. Login and signup persist that payload. `getFutrobClient` reads the token for `Authorization: Bearer`. The auth worker enables Better Auth `bearer()`. Product API accepts that bearer.

There is no interceptor that, on 401, calls `GET /api/auth/get-session` or any refresh endpoint and retries. Home treats 401 by `clearSession` and routing to login. Logout only deletes local keys. It does not call `POST /api/auth/sign-out`. `@futrob/logger` is a mobile dependency and is unused. No Sentry in mobile. Auth copy is hardcoded Spanish. Auth screens log nothing today, so token leakage in logs is an absence, not a proven redaction policy.

### Key files and symbols

- `apps/mobile/src/modules/identity/session-store.ts`. `saveSession`, `getSession`, `clearSession`, keys `futrob.session.token` and `futrob.session.user`.
- `apps/mobile/src/modules/identity/auth-api.ts`. `signInEmail`, `signUpEmail`, `AuthError`. Direct `fetch` to `${AUTH_BASE_URL}/sign-in/email` and `/sign-up/email`.
- `apps/mobile/src/modules/api/futrob-client.ts`. `getFutrobClient`, `getAccessToken`.
- `apps/mobile/src/config/env.ts`. `AUTH_BASE_URL`, default API origin `http://localhost:3000`.
- `apps/auth/src/adapters/auth/better-auth.ts`. `plugins: [bearer()]`.
- `apps/auth/README.md`. `GET /api/auth/get-session` with cookie or Bearer.
- `packages/sdk/src/http.ts`. `HttpClient.buildHeaders`. 401 is not retried (`isRetryableStatus` is 408, 429, 5xx only).
- `apps/web/src/shared/presentation/shell/shell-account-menu.tsx`. Web logout via `authClient.signOut()`.
- `docs/adr/0014-shared-ui-tokens-and-mobile-ui.md`. Bearer plus SecureStore contract.
- `product/acceptance-criteria.md`. AC-MOB-001.

### Gaps vs acceptance criteria

- Tokens live in SecureStore. Measured. No session-store tests.
- Silent refresh on 401. Missing. `HttpClient` throws `FutrobApiError` with `status === 401`. Home clears the session.
- Logout does not invalidate the remote session. Local keys only.
- No allowlist that proves tokens never enter logs or telemetry. Logger unused. No `beforeSend` scrubber.
- Login goes to `/(home)` without `identity.getOnboardingStatus` or `organizations.resolvePostAuthDestination` (AC-MOB-001).
- Signup goes to `/(onboarding)/welcome`, which is a static organizer pitch, then home.
- `apps/mobile` is not in root Vitest projects.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/identity/session-store.test.ts` | Given `saveSession({ token: "sess_1", user })`, when `getSession` runs, then the returned token is `"sess_1"` and user id matches. |
| unit | `apps/mobile/src/modules/identity/session-store.test.ts` | Given a stored session, when `clearSession` runs, then `getSession` returns `null`. |
| unit | `apps/mobile/src/modules/identity/session-redaction.test.ts` | Given a pathname `/invitations/accept/secret-token`, when redaction runs, then the string does not contain `secret-token`. |
| integration | `apps/mobile/src/modules/api/futrob-client.refresh.test.ts` | Given a first `/players/me` 401 and a later `get-session` that returns a new token, when the client retries, then the second API call uses `Authorization: Bearer <new>` and the caller sees the 200 body. |
| integration | `apps/mobile/src/modules/identity/auth-api.logout.test.ts` | Given a stored token, when logout runs, then `POST /api/auth/sign-out` is called with that Bearer and SecureStore is empty. |
| integration | `apps/mobile/src/modules/identity/auth-api.logout.test.ts` | Given a logger spy, when sign-in succeeds, then no log argument contains the token string. |

### Notas

SecureStore ya guarda el bearer. Falta refresh silencioso ante 401, `sign-out` remoto y pruebas de que el token no sale en logs.

---

## [DeepLink] Links de onboarding/acceso y resume post-auth

### Context

`app.json` sets `scheme: "futrob"` and bundle ids `com.futrob.app`. `expo-linking` is a dependency (Expo Router). There are no `ios.associatedDomains`, no Android `intentFilters`, no apple-app-site-association notes, and no Expo Router `+native-intent` or linking config.

Web already has share URLs and post-auth resume:

- Access invitation. `buildInvitationShareUrl` → `/invitations/accept/:token`. `redactInvitationTokenFromPath` strips the token before telemetry.
- Roster invitation. `buildRosterInvitationShareUrl` in the SDK → `/roster-invitations/accept/:token`.
- `navigateAfterAuth` prefers `redirectTo` when `resolveSafeRedirect` allows invitation paths, else signup → `/onboarding`, else `resolvePostAuthDestination`.
- Manual paste exists on web (`invitation-step.tsx`, `accept-invitation-form.tsx`, `accept-roster-invitation-form.tsx`).

Mobile has no linking handler, no pending-destination store, no paste screen, and no token redaction helper.

### Key files and symbols

- `apps/mobile/app.json`. `scheme`, `ios.bundleIdentifier`, `android.package`.
- `apps/web/src/modules/organizations/presentation/invitation-share-url.ts`. `invitationAcceptPath`, `buildInvitationShareUrl`, `redactInvitationTokenFromPath`.
- `packages/sdk/src/roster-invitation-share-url.ts`. `buildRosterInvitationShareUrl`.
- `apps/web/src/modules/identity/presentation/navigate-after-auth.ts`. `navigateAfterAuth`.
- `apps/web/src/modules/identity/presentation/safe-redirect.ts`. Allows `/invitations/accept/` and `/roster-invitations/accept/`.
- `apps/web/src/routes/_app/roster-invitations/accept.$token.tsx`.
- `apps/web/src/modules/identity/presentation/onboarding/steps/invitation-step.tsx`. Paste field.

### Gaps vs acceptance criteria

- Universal and app links do not open the app. Custom scheme only, unused.
- Resume post-auth to the deep-link destination is missing.
- Token redaction for telemetry is missing on mobile.
- Paste manual is missing. Web paste must stay intact (do not break web while adding mobile).
- Login ignores `redirectTo`.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/identity/deep-link.test.ts` | Given `futrob://invitations/accept/tok_abc` or `https://app.example/invitations/accept/tok_abc`, when parse runs, then kind is access-invitation and token is `tok_abc`. |
| unit | `apps/mobile/src/modules/identity/deep-link.test.ts` | Given a closed app and that URL, when the user authenticates, then the stored destination is `/invitations/accept/tok_abc` and logs show `:token` not `tok_abc`. |
| unit | `apps/mobile/src/modules/identity/deep-link.test.ts` | Given a user pastes `tok_abc` on the invitation step, when continue runs, then `inspectCompetitionInvitation({ token: "tok_abc" })` is called. |
| integration | `apps/web/src/modules/organizations/presentation/invitation-share-url.test.ts` | Given the existing web helper, when `redactInvitationTokenFromPath` runs, then the web paste route still accepts the raw token (regression). |

### Notas

Hay scheme `futrob` y URLs canónicas en web. Faltan associated domains, cola de destino post-auth y redaction del token en móvil.

---

## [SDK] Adaptadores móviles de onboarding + player

### Context

`getFutrobClient()` is the only mobile adapter. It is a one-function factory. Home calls `client.identity.getOnboardingStatus()` only.

SDK already exposes the needed HTTP:

- Onboarding. `client.identity.getOnboardingStatus`, `saveOnboardingProgress`, `completeOrganizationOnboarding`, `completeInvitationOnboarding`, `inspectCompetitionInvitation`, `completePlayerOnboarding`.
- Player profile and next encounter. Nested under `client.teams.players` (and flat aliases on `client.teams`).
- Statistics. `client.statistics.getMyStatistics`, `getMyMatches`.
- Inbox. `client.teams.rosterInvitations.listMine`.
- Clubs. `client.gameData.clubs.search` and `retrieve`.
- Access. `client.authorization.getEffectiveAccess`.
- Post-auth. `client.organizations.resolvePostAuthDestination`.

`createFutrobClient` does not put `players` or `rosterInvitations` on the top-level client. Callers use `client.teams.players` and `client.teams.rosterInvitations`.

There is no mobile gateway like web `browserOnboardingGateway` / `OnboardingGateway`. Domain rules are not duplicated in mobile today because those screens do not exist.

### Key files and symbols

- `apps/mobile/src/modules/api/futrob-client.ts`. `getFutrobClient`.
- `packages/sdk/src/client.ts`. `createFutrobClient`.
- `packages/sdk/src/resources/identity.ts`. Identity onboarding resource.
- `packages/sdk/src/resources/players.ts`. `createPlayersResource`. Mounted at `client.teams.players`.
- `packages/sdk/src/resources/roster-invitations.ts`. `listMine` → `GET /players/me/roster-invitations`.
- `packages/sdk/src/resources/statistics.ts`. `GET /players/me/statistics`, `/players/me/matches`.
- `packages/sdk/src/resources/game-data.ts`. `clubs.search`.
- `packages/sdk/src/resources/authorization.ts`. `getEffectiveAccess`.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-flow-gateway.ts`. Pattern to copy, not import.

### Gaps vs acceptance criteria

- Thin onboarding and player adapters in `apps/mobile/src/modules/` are missing. Screens would call SDK resources ad hoc.
- Types already align with OpenAPI via `@futrob/api-contracts` in the SDK. Mobile does not re-parse those schemas.
- Risk of duplicating destination routing or finish if screens call three POSTs instead of the identity complete endpoints.
- `FutrobApiError` is exported. No mobile map from `code` to message keys like `finalizationError`.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| integration | `apps/mobile/src/modules/onboarding/onboarding-gateway.test.ts` | Given a mock SDK, when `completePlayer({ gameAccount: null })` runs, then the client calls `POST /identity/onboarding/player` and returns `destination: "personal"`. |
| integration | `apps/mobile/src/modules/onboarding/onboarding-gateway.test.ts` | Given `completeOrganizationOnboarding` 409 `organizations.name_conflict`, when the gateway surfaces the error, then `code` is that string and no org name validator is reimplemented in the adapter. |
| integration | `apps/mobile/src/modules/player/player-gateway.test.ts` | Given `getNextEncounter` JSON `{ encounter: null }`, when the player adapter loads home facts, then `nextEncounter` is `null`. |
| unit | `packages/sdk/src/resources/identity.test.ts` | Existing coverage of the three complete methods. Keep. Do not duplicate domain tests in mobile. |

### Notas

`getFutrobClient()` ya envuelve el SDK. Falta una capa fina de onboarding y player (como el gateway web) sin copiar reglas de dominio.

---

## [UI] Path organizar/unirme (mínimo org) en móvil

### Context

Web organize path steps are intention → organization → competition → game-account → review. Finish POSTs `/identity/onboarding/organization` and navigates to `/orgs/$orgId/competitions/$competitionId/setup`.

Web join (invitation) path is intention → invitation → game-account → review. Finish POSTs `/identity/onboarding/invitation` and navigates to the competition. Preview is `POST /identity/onboarding/invitation/preview`. Skip on invitation continues as player (`onboarding.invitation.continuePlayer`).

Mobile welcome lists three organizer-only captions and a "Comenzar" button to home. No intention choice, no org name, no invitation token, no destinations.

SDK also has `organizations.create` and `acceptInvitation` for post-onboarding org work. The Must onboarding minimum is the identity complete endpoints, not those.

### Key files and symbols

- `apps/mobile/app/(onboarding)/welcome.tsx`. Placeholder.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-routing.ts`. `allowedStepsByPath`.
- `apps/web/src/modules/identity/presentation/onboarding/steps/organization-step.tsx`, `invitation-step.tsx`, `intention-step.tsx`.
- `apps/api/src/http/routes/onboarding.ts`. Transactional finish for organization and invitation.
- `packages/sdk/src/resources/identity.ts`. `completeOrganizationOnboarding`, `completeInvitationOnboarding`.
- `packages/sdk/src/resources/organizations.ts`. `checkNameAvailability`, `resolvePostAuthDestination`.

### Gaps vs acceptance criteria

- Organize and join paths do not exist on mobile.
- Destinations `competition-setup` and `competition` are not mapped to Expo routes.
- Org name availability and invitation preview are unused.
- Welcome copy talks only about creating an organization, which contradicts the player epic.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/onboarding/onboarding-routing.test.ts` | Given path `organization`, when mapping finish destination `competition-setup`, then the route is the competition setup screen with those ids. |
| unit | `apps/mobile/src/modules/onboarding/onboarding-routing.test.ts` | Given path `invitation` and destination `{ kind: "competition", organizationId, competitionId }`, then the route is that competition, not `/(home)`. |
| integration | `apps/mobile/src/modules/onboarding/onboarding-gateway.test.ts` | Given name `"Liga Única"` and a 200 complete-organization body, when organize finish runs, then one POST to `/identity/onboarding/organization` occurs. |
| e2e | `apps/mobile/e2e/onboarding-organize-join.yaml` | Given a new user, when they pick Organizar or Unirme and finish, then they land on the same destination kinds as web. |

### Notas

Welcome es un placeholder de organizador. No hay caminos organizar ni unirme ni paridad de destinos.

---

## [UI] Switcher Personal ↔ Organización en shell móvil

### Context

Web `WorkspaceSelection` is `personal` | `competition` | `organization`. `resolveDefaultWorkspaceSelection` for path `player` is personal. It does not invent an organization. `workspaceSelectionFromPathname` reads `/orgs/:orgId` and `/orgs/:orgId/competitions/:compId`. `WorkspaceSelector` lists real memberships and associated ExternalClubs.

Mobile has no switcher, no workspace model, and no org routes. Home is a single stack screen.

### Key files and symbols

- `apps/web/src/shared/presentation/shell/workspace-selection.ts`. `WORKSPACE_SELECTION_KIND`, `resolveDefaultWorkspaceSelection`, `workspaceSelectionFromPathname`.
- `apps/web/src/shared/presentation/shell/workspace-selector-model.ts`. `buildWorkspaceSelectorModel`.
- `apps/web/src/shared/presentation/shell/workspace-selector.tsx`.
- `packages/sdk/src/resources/organizations.ts`. `listMine`.
- `apps/web/src/shared/presentation/shell/workspace-selection.test.ts`.

### Gaps vs acceptance criteria

- No Personal ↔ Organization control in a mobile shell.
- No stable deep links for workspace (`/player`, `/orgs/:id`).
- No risk of a fake org yet, because there is no switcher. The web rule must be copied so a player-only actor stays on personal.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/shell/workspace-selection.test.ts` | Given onboarding path `player` and no memberships, when default selection is resolved, then kind is `personal` and `organizationId` is absent. |
| unit | `apps/mobile/src/modules/shell/workspace-selection.test.ts` | Given memberships `[{ organizationId: "org-1" }]`, when the user picks that org, then the route is `/orgs/org-1` and personal remains selectable. |
| unit | `apps/mobile/src/modules/shell/workspace-selection.test.ts` | Given pathname `/player`, when parsing, then kind is personal even if a stale org id is in memory. |

### Notas

El switcher web ya evita org ficticia en player. En móvil no hay shell ni deep links de workspace.

---

## [Auth] Filtrar tabs/acciones por EffectiveAccess en móvil

### Context

Web presentation uses `allowed` from `EffectiveAccessDto`. `can` / `useCan` / `useCapabilities` fail closed on loading and 403 (`capabilityStateFromQuery` → `unavailable` → empty allowed set). Org nav items carry `requiredPermission` from BC constants (`ORGANIZATION_PERMISSION`, `TEAM_PERMISSION`, `COMPETITION_PERMISSION`). Personal player nav (home, matches, stats, invitations) does not require those org permissions.

SDK: `client.authorization.getEffectiveAccess(scope, permissions)`.

Mobile never calls this endpoint. There are no tabs to filter.

### Key files and symbols

- `packages/sdk/src/resources/authorization.ts`. `getEffectiveAccess`.
- `packages/shared-kernel/src/authorization.port.ts`. `EffectiveAccess`.
- `apps/web/src/context/permissions.ts`. `allowedPermissionSet`, `capabilityStateFromQuery`, `EffectiveAccessHttpError`.
- `apps/web/src/shared/presentation/permissions/can.ts`. `can`.
- `apps/web/src/shared/presentation/shell/nav-registry.ts`. `filterByPermission`.
- `docs/architecture/overview.md` and `module-boundaries.md`. Mobile must use `EffectiveAccess`, not role strings.

### Gaps vs acceptance criteria

- Tabs and actions are not gated.
- 403 is not a recoverable UI state (retry). Web hides actions. Recoverable 403 needs a visible retry, not a fake-authorized home.
- Importing `@futrob/organizations` permission constants into mobile would violate AC-MOB-003 if it pulls BC packages. Copy the wire permission strings from `@futrob/api-contracts` / DTO, or a small shared constants module that is not a BC.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/shell/nav-access.test.ts` | Given `allowed` without `organizations.read`, when building org tabs, then the org home tab is omitted. |
| unit | `apps/mobile/src/modules/shell/nav-access.test.ts` | Given capability status `loading` or `unavailable`, when rendering actions, then privileged actions are hidden. |
| integration | `apps/mobile/src/modules/shell/effective-access.test.ts` | Given `getEffectiveAccess` returns HTTP 403, when the shell loads, then the user sees a retry control and no stale allowed set from a previous 200. |
| unit | `apps/web/src/shared/presentation/permissions/can.test.ts` | Existing `can` tests. Reuse the same fail-closed literals in mobile rather than a second policy. |

### Notas

SDK y política fail-closed ya existen en web. Móvil no consulta EffectiveAccess ni oculta tabs.

---

## [QA] Smoke E2E móvil: signup → onboarding → home → inbox

### Context

CI (`.github/workflows/ci.yml`) runs format, typecheck, `npm run test:coverage`, and web build. Playwright is installed for Storybook component tests, not for native. No Maestro, Detox, or EAS workflow. `apps/cli` `e2e-golden-path` is API org → fixture, not player mobile.

`verify-futrob` says native iOS/Android is out of scope for that skill. Expo web is not AC-MOB proof.

The smoke path cannot pass until home and inbox exist. Signup → welcome → home exists as a local gesture only.

### Key files and symbols

- `.github/workflows/ci.yml`. Jobs `check`, `typecheck`, `test`, `build`.
- `vite.config.ts`. `test.projects` omits `apps/mobile`.
- `apps/mobile/vite.config.ts`. Project name `mobile`.
- `apps/mobile/package.json`. `"test": "vp test"`.
- `product/acceptance-criteria.md`. AC-MOB-001, exit criterion 7.

### Gaps vs acceptance criteria

- No native smoke. CI cannot fail on a mobile happy-path break.
- Mobile unit tests are not in the default `vp test` graph.
- Dependencies (player home UI, inbox UI) are themselves missing.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| e2e | `apps/mobile/e2e/signup-onboarding-home-inbox.yaml` | Given a clean native install, when the user signs up, finishes player onboarding, opens home, then inbox, then they see those four screens in order. |
| integration | `apps/mobile/src/modules/player/smoke-sequence.test.ts` | Given mock SDK 200s, when the client runs signup token persist → `completePlayerOnboarding` → `getNextEncounter` → `listMine`, then each call happens once in that order. |
| unit | `vite.config.ts` (project list) | Given `npm test`, when CI runs, then the `mobile` Vitest project is included so a failing mobile test fails the job. |

### Notas

No hay harness nativo ni job CI móvil. `apps/mobile` ni siquiera entra en `vp test` del root.

---

## [UX] Auditoría 44 dp + estados vacíos Must en móvil

### Context

`theme.controlHeight` maps `--control-height` to dp (`1rem = 16`). `Button` and `Input` set `minHeight: theme.controlHeight`. `EmptyState` exists (title, description, optional action). Home uses it as the entire body. `Screen` applies safe-area insets.

`design.md` forbids dense mode on mobile and requires ≥44 dp. Web empty states for home, matches, statistics, and inbox are specified in `catalogs.ts` with CTAs.

There is no audit checklist in-repo for mobile screens. Many targets (tab items, list rows, switcher) do not exist yet.

### Key files and symbols

- `apps/mobile/src/theme/theme.ts`. `controlHeight`.
- `apps/mobile/src/ui/button.tsx`, `input.tsx`, `empty-state.tsx`.
- `design.md`. UX-A11Y-002, mobile 44 dp.
- `apps/web/src/modules/player-home/presentation/player-home-page.tsx`. Empty and error slots.
- `apps/web/src/modules/statistics/presentation/player-matches-page.tsx`. Empty plus CTA.

### Gaps vs acceptance criteria

- Primitives meet 44 dp. Unaudited custom rows and future tabs do not.
- Home empty copy is a generic "when you join an org" message, not the Must player-home empties (next encounter, invitations, EA, stats).
- No checklist artifact tied to onboarding and player home.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/theme/theme.test.ts` | Given `GEOMETRY_TOKENS["control-height"]`, when converted, then `theme.controlHeight` is `44`. |
| unit | `apps/mobile/src/ui/button.test.ts` | Given a `Button`, when style is read, then `minHeight` is `theme.controlHeight`. |
| unit | `apps/mobile/src/modules/player-home/empty-copy.test.ts` | Given no pending invitations, when the inbox slot renders, then title matches the Must empty and the CTA is present. |

### Notas

Button e Input ya usan 44 dp. Falta la checklist de pantallas Must y los vacíos de producto, no solo el placeholder.

---

## [Lógica] Onboarding móvil 3 caminos vía @futrob/sdk

### Context

Three paths in contracts: `organization`, `invitation`, `player`. `saveOnboardingProgress` PATCHes `{ path, currentStep }`. Finish is one POST per path. Skip of optional steps is client-side (`goTo` next step without the optional field). Review is the last step. Destinations: organization → `competition-setup`, invitation → `competition`, player → `"personal"`.

Web cold bootstrap always opens at intention (`resolveOnboardingStep` ignores server step). Resume of a persisted step is `resolvePersistedOnboardingStep` (used in Storybook or harness). AC-MOB-001 wants login to resume the persisted step if incomplete.

API tests prove organization finish is idempotent on retry (`onboarding.test.ts`).

Mobile calls `getOnboardingStatus` on home only. It never saves progress or finishes.

### Key files and symbols

- `packages/sdk/src/resources/identity.ts`. All six identity methods.
- `packages/api-contracts/src/v1/identity/schemas.ts`. Path and step schemas, complete request bodies.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-flow.tsx`. `finish`, skip, `saveProgress`.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-routing.ts`.
- `packages/identity/src/application/complete-onboarding/complete-onboarding.use-case.ts`. Marks `actor_onboarding` complete.
- `apps/api/src/http/routes/onboarding.ts`. Orchestration.

### Gaps vs acceptance criteria

- No mobile orchestrator for steps, skip, review, finish.
- Login does not resume `currentStep`.
- Destinations are not applied.
- Do not reimplement `CompleteOnboardingUseCase` in the app. Call SDK.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/onboarding/onboarding-routing.test.ts` | Given path `player`, when allowed steps are listed, then they are intention, game-account, club, review. |
| unit | `apps/mobile/src/modules/onboarding/onboarding-routing.test.ts` | Given club skip, when advancing, then current step is `review` and `externalClub` sent on finish is `null`. |
| integration | `apps/mobile/src/modules/onboarding/onboarding-gateway.test.ts` | Given incomplete status `{ path: "player", currentStep: "club" }`, when login resume runs, then the club step is shown, not home. |
| integration | `packages/sdk/src/resources/identity.test.ts` | Given the three complete methods, when each is called, then URLs are `/identity/onboarding/organization`, `/invitation`, `/player`. Already present. Keep. |

### Notas

El SDK y la API ya orquestan los 3 caminos. Móvil no guarda progreso, no hace skip/review/finish ni reanuda el paso.

---

## [UI] Pantallas y steps de onboarding móvil (paridad web)

### Context

Web screens: `/onboarding/intention`, `/organization`, `/competition`, `/invitation`, `/game-account`, `/club`, `/review`, wrapped by `OnboardingShell` (stepper, error, 44 px actions). `OnboardingActions` has primary, back, skip.

Mobile welcome is not a step machine. No review. Copy is Spanish only.

Parity does not mean StyleX. ADR-0014. Same variants and tokens via `@futrob/ui-tokens`.

### Key files and symbols

- `apps/web/src/modules/identity/presentation/onboarding/steps/*.tsx`.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-shell.tsx`.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-actions.tsx`.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-step-meta.ts`. `stepsForPath`.
- `apps/mobile/app/(onboarding)/welcome.tsx`.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-flow.test.tsx`.

### Gaps vs acceptance criteria

- No step screens, no stepper, no review.
- 44 dp on future actions can reuse `Button`. Screens themselves are missing.
- Intention radios (player / organize / join) are missing.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/onboarding/onboarding-step-meta.test.ts` | Given path `player`, when `stepsForPath` runs, then labels include account, club, and review. |
| integration | `apps/mobile/app/(onboarding)/review.test.tsx` | Given a filled player draft, when review renders, then game account and club name are visible and finish is enabled. |
| integration | `apps/mobile/app/(onboarding)/intention.test.tsx` | Given the intention screen, when the user selects Organizar, then the next route is organization, not welcome. |

### Notas

Paridad web son 7 pasos más review. Móvil solo tiene un welcome estático.

---

## [Lógica] Finish atómico y errores tipados de onboarding en móvil

### Context

Finish is atomic on the API: `transaction.runInTransaction` then `identity.completeOnboarding`. Failures map through `TaggedError` → HTTP `{ code, messageKey, requestId }`. Organization retry does not duplicate the org (`creationKey`). Invitation finish uses `organizations.invitation_*` codes. Exhausted or invalid invitation leaves `completed: false` (API test).

SDK throws `FutrobApiError` with `code` and `messageKey`. Web `finalizationError` maps those codes to i18n keys and never shows provider messages (`provider.secret_message` → `errors.onboarding.completePlayer`).

Mobile has no finish call and no mapper. Home 401 is the only typed HTTP handling.

### Key files and symbols

- `apps/api/src/http/routes/onboarding.ts`. Transactions.
- `apps/api/src/http/routes/onboarding.test.ts`. Idempotent org finish, typed invitation codes.
- `packages/sdk/src/errors.ts`. `FutrobApiError`.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-finalization-errors.ts`. `finalizationError`.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-finalization-errors.test.ts`.

### Gaps vs acceptance criteria

- Mobile cannot recover from finish errors because it never finishes.
- Need the same map as web (copy the table, do not import web presentation).
- Rate limit `api.rate_limited` plus `retryAfterSeconds` is already on the SDK. Unused on mobile.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/onboarding/finalization-errors.test.ts` | Given `FutrobApiError` code `organizations.invitation_not_found`, when mapping, then the message key is `errors.organizations.invitation_not_found`. |
| unit | `apps/mobile/src/modules/onboarding/finalization-errors.test.ts` | Given code `provider.secret_message` on path player, when mapping, then the key is `errors.onboarding.completePlayer` and the raw code is not shown. |
| integration | `apps/mobile/src/modules/onboarding/onboarding-gateway.test.ts` | Given finish 409 `organizations.name_conflict`, when the user retries after renaming, then the error clears and a second POST is sent. |
| integration | `apps/api/src/http/routes/onboarding.test.ts` | Existing atomic retry. Do not retest transactions in mobile. |

### Notas

Finish atómico y códigos tipados viven en API y SDK. Móvil no mapea `FutrobApiError` ni reintenta el finish.

---

## [UI] Estados e i18n es/en en onboarding móvil

### Context

Web uses `createTranslator(locale)` and `catalogs.ts` with parallel `es` and `en` keys (`onboarding.*`, `errors.*`). Spanish is default. Loading, empty, error, and success are distinct in `OnboardingShell` and flow `saving` / `leaving`.

Mobile strings are inline Spanish in login, signup, welcome, home. No locale switch, no `en`. Signup and login have field errors and a form alert. Welcome has no loading or error. Success is an immediate replace to home.

### Key files and symbols

- `apps/web/src/shared/presentation/i18n/catalogs.ts`.
- `apps/web/src/shared/presentation/i18n/translate.ts`. `createTranslator`.
- `apps/web/src/shared/presentation/i18n/i18n.test.ts`.
- `apps/mobile/app/(auth)/login.tsx`, `signup.tsx`, `(onboarding)/welcome.tsx`.
- `.cursor/rules/i18n.mdc`. Both locales in the same change.

### Gaps vs acceptance criteria

- No es/en onboarding catalog on mobile.
- No loading, empty, error, success machine for steps.
- Auth validation strings are Spanish-only (`auth-validation.ts`).

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/i18n/onboarding-copy.test.ts` | Given locale `en`, when reading `onboarding.club.title`, then the English catalog value is returned, not the key. |
| unit | `apps/mobile/src/modules/onboarding/onboarding-status-view.test.ts` | Given `saving === true`, when the review screen renders, then the primary control is busy and not a success state. |
| unit | `apps/mobile/src/modules/onboarding/onboarding-status-view.test.ts` | Given finish success destination personal, when navigation runs, then the user is not left on review with a stale error. |

### Notas

Web ya tiene catálogo es/en y estados. Móvil hardcodea español y no distingue loading, vacío, error y éxito en onboarding.

---

## [Lógica] Asociación club EA en onboarding jugador móvil

### Context

Player finish sends `externalClub` as a locator only (`providerKey`, `externalClubId`, `platform`, `gameEdition`). No `name`, no `imageUrl` on that request. API `getExternalClub` then `associatePlayerExternalClub` inside the transaction. Crest URL is resolved from the provider (`packages/ea-clubs` `buildEaClubCrestUrl`) and stored as `imageUrl` on `PlayerExternalClubAssociation`. The client does not persist crest bytes.

Standalone association after onboarding: `POST /players/me/external-club` via `client.teams.players.associateExternalClub` (includes `name` and `imageUrl` on that DTO). Search is `GET /game-data/clubs/search`.

Mobile never searches or associates.

### Key files and symbols

- `packages/sdk/src/resources/game-data.ts`. `clubs.search`, `clubs.retrieve`.
- `packages/api-contracts/src/v1/teams/schemas.ts`. `playerExternalClubSelectionInputSchema` (no image), `associateMyPlayerExternalClubRequestSchema` (name + imageUrl).
- `apps/api/src/http/routes/onboarding.ts`. Resolve club then associate.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-draft.ts`. `externalClubLocatorFromDraft`.
- `packages/teams/src/application/associate-player-external-club/associate-player-external-club.use-case.ts`.
- `packages/ea-clubs/src/crest-url.ts`. CDN URL builder. Not for mobile import if it is adapter-flavored. Prefer `imageUrl` on `ExternalClubDto`.

### Gaps vs acceptance criteria

- No search or associate on mobile.
- Must send locator on player finish, not a crest blob and not a `Team`.
- `ExternalClub` vs `Team` is already distinct in domain. UI must not label the club pick as Team.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| integration | `apps/mobile/src/modules/onboarding/club-search.test.ts` | Given query `"Fera"`, when search runs, then `GET /game-data/clubs/search` is used and results have `externalClubId`, not a team id. |
| unit | `apps/mobile/src/modules/onboarding/onboarding-draft.test.ts` | Given a selected club with `imageUrl`, when `externalClubLocatorFromDraft` runs, then the payload has no `imageUrl` and no `name`. |
| integration | `packages/sdk/src/resources/game-data.test.ts` | Existing search parse. Keep. |

### Notas

Finish de jugador ya asocia ExternalClub en API sin que el cliente envíe el crest. Móvil no busca ni envía el locator.

---

## [UI] Paso Club con crest CDN / Avatar fallback

### Context

Web `ClubStep` uses `EaClubLinkForm` and `ClubCrestAvatar`. If `imageUrl` is missing or the image errors, initials fallback. Crest is an EA CDN URL, not an uploaded asset. Skip clears the club and goes to review.

Mobile has no Image-based crest primitive and no club step. `packages/ui` Avatar is DOM. ADR-0014 says mobile primitives live in `apps/mobile/src/ui/`.

### Key files and symbols

- `apps/web/src/modules/identity/presentation/onboarding/steps/club-step.tsx`.
- `apps/web/src/modules/game-data/presentation/ea-club-link-form.tsx`.
- `apps/web/src/shared/presentation/club-crest-avatar.tsx`. `ClubCrestAvatar`.
- `apps/web/src/modules/identity/presentation/onboarding/onboarding-story-router.tsx`. Fixture with FC26 crest URL.

### Gaps vs acceptance criteria

- No club step UI.
- No crest or Avatar fallback primitive on RN.
- Copy must say club or ExternalClub, never Team.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/ui/club-crest-avatar.test.ts` | Given `imageUrl: null`, when rendering, then initials from the club name are shown. |
| unit | `apps/mobile/src/ui/club-crest-avatar.test.ts` | Given a CDN URL that fails to load, when `onError` fires, then initials are shown. |
| integration | `apps/mobile/app/(onboarding)/club.test.tsx` | Given search results, when one club is selected, then the label is the club name and no "Team" string is used. |

### Notas

Web ya distingue crest CDN y fallback. En móvil no hay paso Club ni primitiva de crest.

---

## [Lógica] Shell autenticado móvil: sesión y permisos efectivos

### Context

Session gate is `app/index.tsx` (`getSession` → home or login). Home repeats the guard. Logout is local. No `getEffectiveAccess`. No grant-based gates. 401 on onboarding status kicks to login. 403 is ignored on that call (only 401 is special-cased).

Web shell loads `SHELL_PERMISSIONS` and filters nav and commands.

### Key files and symbols

- `apps/mobile/app/index.tsx`. Session gate.
- `apps/mobile/app/(home)/index.tsx`. `handleLogout`, 401 branch.
- `apps/web/src/context/permissions.ts`. `SHELL_PERMISSIONS`.
- `apps/web/src/shared/presentation/shell/shell-commands.ts`.
- `packages/sdk/src/resources/authorization.ts`.

### Gaps vs acceptance criteria

- No EffectiveAccess in the shell.
- Logout is not remote.
- No recoverable 403.
- Gates by grant are missing.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| integration | `apps/mobile/src/modules/shell/session-gate.test.ts` | Given no SecureStore session, when the gate runs, then the route is `/(auth)/login`, not home. |
| integration | `apps/mobile/src/modules/shell/session-gate.test.ts` | Given a token and `getOnboardingStatus` 401, when home loads, then session is cleared and login is shown. |
| integration | `apps/mobile/src/modules/shell/effective-access.test.ts` | Given 403 on effective-access, when the shell renders, then actions that need grants are hidden and retry is available. |

### Notas

Hay gate de sesión local. No hay logout remoto ni EffectiveAccess ni gates por grant.

---

## [UI] Shell y navegación Player (home, partidos, stats, invitaciones)

### Context

Web personal nav: `/player`, `/player/competitions`, `/player/game-accounts`, `/player/matches`, `/player/statistics`, `/invitations`. The epic asks for home, matches, stats, invitations. Competitions and game-accounts are web extras, not this task's minimum.

Mobile stack lists `(home)` only. No tabs. Nothing to hide without grant (personal items currently have no `requiredPermission` on web).

### Key files and symbols

- `apps/web/src/shared/presentation/shell/nav-registry.ts`. `personalGeneralNav`.
- `apps/web/src/routes/_app/player.tsx`. Home route.
- `apps/web/src/routes/_app/player_.matches.index.tsx`.
- `apps/web/src/routes/_app/player_.statistics.tsx`.
- `apps/web/src/routes/_app/invitations/index.tsx`.
- `apps/mobile/app/_layout.tsx`. Stack screens.

### Gaps vs acceptance criteria

- No Player tab bar or equivalent.
- No hide-without-grant because there are no grant-gated player tabs yet. Org tabs would need it when the switcher exists.
- Placeholder home is not a shell.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/shell/player-nav.test.ts` | Given personal workspace, when nav items are built, then hrefs are home, matches, statistics, invitations. |
| unit | `apps/mobile/src/modules/shell/player-nav.test.ts` | Given org workspace without `organizations.read`, when nav is built, then org-only items are omitted. |
| integration | `apps/mobile/app/(home)/tabs.test.tsx` | Given tap on Partidos, when navigation runs, then the matches screen mounts. |

### Notas

Nav player web es la referencia. Móvil no tiene tabs ni pantallas destino.

---

## [Lógica] Player home móvil: datos vía SDK

### Context

Web `usePlayerHome` loads in parallel: profile, recent matches, game profile, accessible competitions, next encounter, roster invitations. `resolvePlayerHome` turns those facts into layout slots (onboarding, select-club, dashboard) including next Encounter.

SDK: `client.teams.players.getNextEncounter` → `GET /players/me/next-encounter`. Also `getProfile`, `statistics.getMyRecentMatches`, `getMyGameProfile`, `teams.rosterInvitations.listMine`, `competitions.listMine`.

Mobile home does not call these. It only greets by first name and prints onboarding pending or completed.

### Key files and symbols

- `apps/web/src/modules/player-home/presentation/use-player-home.ts`.
- `apps/web/src/modules/player-home/presentation/player-home-model.ts`. `resolvePlayerHome`, `PlayerHomeFacts`.
- `apps/web/src/modules/player-home/presentation/player-home-model.test.ts`.
- `packages/sdk/src/resources/players.ts`. `getNextEncounter`.
- `apps/web/src/modules/teams/presentation/player-queries.ts`. Query hooks (TanStack Query is web. Mobile may use a simpler loader).

### Gaps vs acceptance criteria

- Home does not consume next encounter or activity via SDK.
- `player-home-model.ts` is web presentation. Extracting shared pure mapping into a non-BC helper is optional. Copying the model into `apps/mobile` is allowed. Importing web modules is not.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| unit | `apps/mobile/src/modules/player-home/player-home-model.test.ts` | Given `nextEncounter` with two team names, when `resolvePlayerHome` runs, then hero kind is `next-encounter`. |
| unit | `apps/mobile/src/modules/player-home/player-home-model.test.ts` | Given `encounter: null` and no competitions, when resolving, then hero is `no-competitions` or `no-upcoming` per the web table. |
| integration | `apps/mobile/src/modules/player-home/player-home-loader.test.ts` | Given SDK 200s, when home loads, then it calls `getNextEncounter` and `listMine` once each. |

### Notas

Web ya compone home desde next-encounter e inbox vía API. Móvil no llama esos métodos.

---

## [UI] Player home móvil (reemplaza placeholder)

### Context

`HomeScreen` is the placeholder to replace. It uses `EmptyState` plus logout. Must states (loading, error retry, empty slots, 44 dp) exist on web in `player-home-page.tsx` and `home-skeletons.tsx`.

### Key files and symbols

- `apps/mobile/app/(home)/index.tsx`. `HomeScreen`.
- `apps/web/src/modules/player-home/presentation/player-home-page.tsx`.
- `apps/web/src/modules/player-home/presentation/home-next-encounter-fixture.tsx`.
- `apps/web/src/modules/player-home/presentation/home-invitations-card.tsx`.

### Gaps vs acceptance criteria

- Placeholder still shown.
- No per-slot loading or error.
- CTA targets for matches and invitations are missing.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| integration | `apps/mobile/app/(home)/index.test.tsx` | Given ready facts with a next encounter, when home renders, then the greeting placeholder string is absent and the encounter names are visible. |
| integration | `apps/mobile/app/(home)/index.test.tsx` | Given a slot error, when retry is pressed, then the loader is called again. |
| unit | `apps/mobile/src/ui/button.test.ts` | Home CTAs use `minHeight` 44. |

### Notas

Home sigue siendo el EmptyState de fundación. Hay que reemplazarlo con los slots Must de web.

---

## [Lógica] Mis partidos y Mis estadísticas en móvil vía SDK

### Context

The Notion criterion names `/players/me/statistics` and `/matches`. The SDK paths are `GET /players/me/statistics` and `GET /players/me/matches` (`getMyStatistics`, `getMyMatches`). Official match contributions live there. Recent provider matches are `/players/me/recent-matches` (EA observations, not official results). Keep that split. Statistics BC only after approved official results.

Web pages: `PlayerMatchesPage`, `PlayerStatisticsPage`. Queries in `statistics-queries.ts`.

### Key files and symbols

- `packages/sdk/src/resources/statistics.ts`. `getMyStatistics`, `getMyMatches`.
- `packages/sdk/src/resources/statistics.test.ts`. Asserts those URLs.
- `apps/web/src/modules/statistics/presentation/player-matches-page.tsx`.
- `apps/web/src/modules/statistics/presentation/player-profile/player-statistics-page.tsx`.
- `apps/web/src/routes/_app/player_.matches.index.tsx`.
- `apps/web/src/routes/_app/player_.statistics.tsx`.

### Gaps vs acceptance criteria

- Mobile never calls these SDK methods.
- Do not use `encounters` org routes for "mis partidos" in the personal space.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| integration | `apps/mobile/src/modules/player/matches-loader.test.ts` | Given the adapter, when listing matches, then the request URL is `/players/me/matches` not `/encounters`. |
| integration | `apps/mobile/src/modules/player/statistics-loader.test.ts` | Given filters `{ platform: "playstation" }`, when loading stats, then the query string includes `platform=playstation` and the body `statistics` field is returned as parsed. |
| integration | `packages/sdk/src/resources/statistics.test.ts` | Existing URL tests. Keep. |

### Notas

SDK ya apunta a `/players/me/statistics` y `/players/me/matches`. Móvil no los consume.

---

## [UI] Pantallas Mis partidos y Mis estadísticas

### Context

Web empty states include titles and CTAs (add game account or club when needed). Filters on matches (Todos, Liga, Playoff, Amistosos) are web. Personal space entry is the shell, not an org.

Mobile has no screens.

### Key files and symbols

- `apps/web/src/modules/statistics/presentation/player-matches-page.tsx`.
- `apps/web/src/modules/statistics/presentation/player-matches-list.tsx`. `MatchesEmpty`.
- `apps/web/src/modules/statistics/presentation/player-profile/player-statistics-page.tsx`.
- `apps/web/src/shared/presentation/i18n/catalogs.ts`. `player.matches.emptyTitle`, `player.statistics.emptyTitle`.

### Gaps vs acceptance criteria

- No screens.
- No empty + CTA.
- Must be reachable from personal workspace.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| integration | `apps/mobile/app/(home)/matches.test.tsx` | Given `{ matches: [], nextCursor: null }`, when the screen renders, then the empty title is shown and a CTA is present. |
| integration | `apps/mobile/app/(home)/statistics.test.tsx` | Given `statistics: null`, when the screen renders, then the empty statistics copy is shown with a CTA. |
| unit | `apps/mobile/src/modules/shell/player-nav.test.ts` | Given personal selection, when opening matches, then the route is under player space, not `/orgs`. |

### Notas

Pantallas web con vacío y CTA son la paridad. En móvil no existen.

---

## [Lógica] Inbox de invitaciones de plantilla del jugador móvil

### Context

Inbox is roster invitations (`teams`), not competition access invitations (`organizations`). `GET /players/me/roster-invitations` via `client.teams.rosterInvitations.listMine` / `client.teams.listMyRosterInvitations`. Web `useMyRosterInvitationsQuery`. Respond is `POST /roster-invitations/:id/respond`. Accept by token is `POST /roster-invitations/accept`. Capacity errors use `teams.roster_full`.

Mobile does not list invitations.

### Key files and symbols

- `packages/sdk/src/resources/roster-invitations.ts`. `listMine`, `respond`, `accept`.
- `apps/web/src/modules/teams/presentation/player-queries.ts`. `useMyRosterInvitationsQuery`.
- `apps/web/src/modules/teams/presentation/invitation-inbox-model.ts`. `toInvitationViewItem`, expired-pending display.
- `packages/teams/src/application/accept-roster-invitation/accept-roster-invitation.use-case.ts`. `teams.roster_full`.

### Gaps vs acceptance criteria

- No SDK call from mobile.
- Do not mix access-invitation tokens into this inbox.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| integration | `apps/mobile/src/modules/player/inbox-loader.test.ts` | Given the adapter, when loading inbox, then `GET /players/me/roster-invitations` is called and pending items are returned as parsed DTOs. |
| unit | `apps/mobile/src/modules/player/invitation-inbox-model.test.ts` | Given status `pending` and `expiresAt` in the past, when mapping, then display status is `expired`. |
| integration | `packages/sdk/src/resources/teams-nesting.test.ts` | Existing accept alias. Add `listMine` URL assertion if missing. |

### Notas

El inbox Must es `GET /players/me/roster-invitations`. Móvil no lo consulta.

---

## [UI] Inbox de invitaciones + deep links claim/resume

### Context

Web inbox UI: `player-invitations-page.tsx` (pending and history tabs, empty, respond). Claim via `/roster-invitations/accept/$token` and paste. Resume after auth uses `redirectTo`. Typed cupo is `teams.roster_full` (and related `teams.roster_locked`). Access invitations are a different URL (`/invitations/accept/:token`).

Mobile has neither inbox UI nor claim routes.

### Key files and symbols

- `apps/web/src/modules/teams/presentation/player-invitations-page.tsx`.
- `apps/web/src/modules/teams/presentation/accept-roster-invitation-form.tsx`.
- `apps/web/src/routes/_app/roster-invitations/accept.$token.tsx`.
- `packages/sdk/src/roster-invitation-share-url.ts`.
- `packages/teams/src/domain/errors/team.errors.ts`. `teams.roster_full`.

### Gaps vs acceptance criteria

- No inbox UI.
- No claim or resume deep links on mobile.
- No mapping of `teams.roster_full` to a recoverable message.

### Tests to write

| Layer | File | Behavior |
| --- | --- | --- |
| integration | `apps/mobile/app/(home)/invitations.test.tsx` | Given one pending item, when inbox renders, then club name and accept or decline controls are shown. |
| integration | `apps/mobile/src/modules/identity/deep-link.test.ts` | Given `futrob://roster-invitations/accept/tok`, when the app opens cold then the user logs in, then accept is called with `{ token: "tok" }`. |
| unit | `apps/mobile/src/modules/player/invitation-errors.test.ts` | Given `FutrobApiError` code `teams.roster_full`, when mapping, then the user-visible key is the cupo error, not a generic finish. |

### Notas

Web tiene inbox, claim por token y cupo `teams.roster_full`. Móvil no tiene UI ni resume del deep link.
