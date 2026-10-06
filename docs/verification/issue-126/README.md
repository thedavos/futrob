# QA #126. Home nativo en `/player`

Fecha: 2026-10-05. Worktree `../futrob-qa-126`, rama `qa/mobile-player-home-126`, base `github/main` `7e0d2b2f` (incluye #133). Sin merge. El #108 permanece abierto.

Superficie: Expo Go nativo. iPhone 17 Pro iOS 26.3 y Android Medium_Phone_API_36.0 (emulador, 1080x2400, 420 dpi). No se acredita Expo web.

## Resultado

La home autenticada vive en `/player`. El gate de entrada no la sustituye. Tras login y onboarding de jugador, iOS y Android muestran el snapshot de seis fuentes, el primer club asociado (#133 / FTR-PLAYER-006) y el cambio de club sin mezclar datos. Un 401 borra la sesión y deja el login. Las pruebas de pantalla del harness integrado cubren ready con fecha literal, CTA a competición, error parcial + retry, invitaciones, ES/EN y 401→200.

## Contrato antiguo vs #133

El issue pedía no inferir el primer club. #133 autorizó el primer club asociado cuando falta `club`. Esta QA conserva ese comportamiento. El loader global y la recuperación por fuente no se rediseñaron.

## Datos

- Cuenta: `qa126.player.1762@example.com` (actor `9ac14c4c-8b09-4805-921c-1cf2e86aceac`).
- Onboarding jugador sin cuenta de juego ni club. Luego se asociaron `44001` Lidl uItra y `10754` Bishops Lyneard vía `POST /players/me/external-club`. La API de EA resolvió los nombres reales.
- Primer club en `/players/me.externalClubs[0]`: Lidl uItra. iOS y Android lo seleccionaron al entrar sin `club`.
- Inbox y competiciones vacíos en vivo. Rendimiento y último partido en `needs_game_account` (sin identificador).

## Recorrido

1. Login ES en iOS contra BFF `:3000` y auth `:8788`.
2. Onboarding jugador. Omitir cuenta y club. Confirmar. `POST /identity/onboarding/player` 200.
3. Gate error `No pudimos comprobar tu acceso`. Causa: `GET /organizations/mine` y `post-auth-destination` 500. El schema `public` de Neon no tenía `organizations.slug` (faltaba `0045_organization_profile.sql` y 0047-0049). `npm run migrate -w @futrob/api` aplicó 4 archivos. Reintentar llegó a `/player`.
4. Home vacía ES/EN (sin clubes). Sign out → login EN → home ready con Lidl uItra.
5. Scroll. Last match bloqueado. Cambio a Bishops Lyneard. El subtítulo cambia. Lidl no queda etiquetado como Bishops. El loader `#133` (`Loading your activity…`) aparece durante el cambio.
6. Revocar `auth_sessions` del usuario. Cambiar de club. Login visible. Sesión local limpiada.
7. Android. ANR de Expo Go al perder Metro. Tras `adb reverse` y relanzar `exp://127.0.0.1:8081`: login EN → `/player` Lidl uItra → Bishops Lyneard → ES.

## Criterios

| Criterio                           | Resultado                                | Evidencia                                                                                                                                                                                                                             |
| ---------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate autenticado llega a `/player` | Pass (iOS, Android)                      | Recorrido 3-4 y 7. Capturas `ios-06`, `ios-09`, `android-02`                                                                                                                                                                          |
| Club inicial = primer asociado     | Pass. No se revirtió #133                | `Your activity with Lidl uItra` en ambas plataformas                                                                                                                                                                                  |
| Cambio de club sin mezclar fuentes | Pass                                     | `ios-11`, `android-03`. Subtítulo Bishops. Lidl sigue como opción no seleccionada                                                                                                                                                     |
| Ready / vacío                      | Pass en los estados que el dato permite  | Vacío sin clubes: `ios-06/07`. Ready sin torneo/inbox/identificador: `ios-09/10`, `android-02/04`                                                                                                                                     |
| Error parcial + retry de sección   | Pass en harness. Pendiente nativo        | No hubo fuente 4xx/5xx en vivo salvo el gate de orgs. `player-home-screen.test.tsx` conserva `6 – 0` y recupera invitaciones                                                                                                          |
| Invitaciones                       | Pass vacío nativo. Pendientes en harness | Nativo: `Sin invitaciones pendientes`. Harness: `2 invitaciones por responder`                                                                                                                                                        |
| 401 limpia sesión y muestra login  | Pass iOS nativo y harness                | `ios-12`. Android no reejecutó 401 (sesión ya revocada)                                                                                                                                                                               |
| 200 vecino reingresa               | Pass harness. iOS nativo tras sign-out   | Login EN → `/player` ready                                                                                                                                                                                                            |
| ES/EN                              | Pass                                     | iOS vacío y Android ready. Harness conserva `6 – 0` y fecha `Intl`                                                                                                                                                                    |
| CTA existentes                     | Pass a rutas existentes en harness       | `Ver competición` → `/orgs/org-1/competitions/competition-liga`. En vivo no hay competición ni enfrentamiento. No se inventó CTA                                                                                                      |
| Nombres y roles (árbol AX)         | Pass parcial                             | iOS: `button` English/Sign out/clubes, `header` Inicio/Home, labels de sección. Android: `android.widget.Button` Español/clubes                                                                                                       |
| Targets ≥44 dp                     | Pass medido                              | iOS puntos: English y Cerrar sesión 354×44; clubes 354×44. Android 420 dpi: Español 116 px (44.2 dp), Lidl 116 px, Bishops 115 px (43.8 dp, redondeo de píxel)                                                                        |
| VoiceOver / TalkBack               | Pendiente. Intentado, no disponible      | iOS 26.3 Settings no lista VoiceOver. Búsqueda: `No Results for “VoiceOver”` (`ios-13`). Android: Use TalkBack > Allow. El toggle volvió a Off. Servicio enabled, `Bound services:{}`, `touchExplorationEnabled=false` (`android-05`) |
| Conservar fuentes sanas            | Pass                                     | Cambio de club oculta el snapshot anterior. Error de perfil en harness mantiene invitaciones y competición                                                                                                                            |
| Recuperación visible               | Pass                                     | Gate `Reintentar` tras migrate. Loader de club. Retry de sección en harness                                                                                                                                                           |
| No rediseñar loader                | Pass                                     | Se dejó `Loading your activity…` / `Cargando tu actividad…`                                                                                                                                                                           |
| No acreditar Expo web              | Pass                                     | Solo Expo Go                                                                                                                                                                                                                          |

## Capturas

iOS: `ios-02` cuenta de juego, `ios-03` club, `ios-04` review, `ios-05` gate error, `ios-06/07` vacío ES/EN, `ios-08` login tras sign-out, `ios-09/10` ready Lidl, `ios-11` Bishops, `ios-12` login tras 401, `ios-13` Settings sin VoiceOver.

Android: `android-01` login EN, `android-02` ready Lidl, `android-03` Bishops EN, `android-04` Bishops ES, `android-05` TalkBack no enlaza.

## Pruebas

Comando:

```bash
npm run test -- --run --project mobile --project sdk --reporter=verbose
```

Resultado: 27 archivos, 171 tests, 0 fallos. Duración 12.46 s. Node v24.21.0. Salida: [tests-mobile-sdk.txt](./tests-mobile-sdk.txt).

Casos de pantalla `player home on /player` ejecutados:

- takes an authenticated player from the entry gate to /player and shows the dated fixture
- shows the no-fixture state while keeping the last match and other healthy sections
- counts only pending invitations
- keeps healthy sections through a failed source and recovers it on retry
- keeps pending invitations and the last match when switching ES and EN
- starts with the first associated club and never labels club B data as club A
- loads the home snapshot once when entering without a club
- keeps healthy sections when the profile fails on entry without a club
- keeps an explicit club that is not associated instead of falling back to the first
- asks for a club when the profile has none associated
- shows the home for a 200 session and keeps the stored session
- clears the session and shows login when the home answers 401 (`/player?club=club-cuervos` y `/player`)
- lets a neighboring 200 sign-in return to the dated home after a 401
- opens an implemented competition screen from the home
- cancels pending home reads on unmount so a late 401 changes nothing

jsdom + react-native-web prueba comportamiento de pantalla. No sustituye iOS/Android.

## Gates

- `npm run check`: pass (1851 archivos fmt, 1282 lint/type-aware).
- `npm run typecheck`: 24 workspaces pass.

## Cambios de esta rama

- Cobertura faltante en `player-home-screen.test.tsx` (ES/EN, hero CTA, conservación de `6 – 0`, 401→login→200).
- `Origin: AUTH_ORIGIN` en auth móvil. Expo Go envía `exp://…` y Better Auth solo acepta orígenes HTTP. Sin este header el login nativo queda en `INVALID_ORIGIN`.

## Bloqueos y pendientes

- VoiceOver no existe en el iPhone 17 Pro iOS 26.3 simulator. Settings > Accessibility no lo muestra. La búsqueda del sistema no tiene resultados. Hace falta un dispositivo físico o un runtime que exponga VoiceOver.
- TalkBack está instalado en el emulador API 36 (`com.google.android.marvin.talkback/.TalkBackService`). El toggle de Settings y el Allow no lo enlazan. `touchExplorationEnabled` permanece false. Hace falta un dispositivo o imagen donde el servicio bindée.
- CI de #143: Format & Lint, Typecheck, Test y Build & Bundle Budget en verde en `c1cbe7de`. pullfrog seguía pending al publicar esta nota.
- CTA nativo a competición y error parcial nativo por fuente no se vieron. El dato en vivo no los produce.
- Invitaciones pendientes nativas no se sembraron.
- Expo Go Android ANR al perder Metro. Tras relanzar el flujo sí llegó a `/player`.
- El 500 de organizaciones era schema `public` atrasado, no un defecto de la home. Queda documentado como bloqueo de entorno ya desbloqueado en esta Neon de desarrollo.

#108 no se cierra. Esta entrega es QA de #126 sobre la composición de #133.
