# `apps/mobile`

Cliente móvil nativo Must del MVP de Futrob (React Native + Expo SDK 57, Expo Router). Sale junto a web, API y auth.

## Alcance MVP

- Auth y onboarding con los mismos destinos y consecuencias que web.
- Espacio personal: cuentas de juego, clubes EA, equipos/contexto activo, invitaciones, partidos y estadísticas.
- Operación por permiso: organizaciones, competiciones, participantes, equipos/plantillas, fixtures, Match Center, reprogramaciones, resultados oficiales, tabla y rankings.
- Landing y portal público permanecen web responsive y se abren mediante deep links.
- Push nativo no es requisito del MVP; las notificaciones Must siguen siendo in-app/web y correo.

La implementación actual incluye auth, gate de `actor_onboarding`, los tres caminos de onboarding por SDK, borrador reanudable en este dispositivo y destinos nativos mínimos. El resto de la operación por rol y el wizard completo de configuración de competición siguen siendo trabajo del MVP.

## Arquitectura

- **Lógica de negocio:** ninguna local. Toda la lógica vive en
  `packages/<bc>/`; el estado de servidor se consume vía `@futrob/sdk`
  (HTTP a `/api/v1`).
- **Auth:** Better Auth servido por el worker `apps/auth` (`EXPO_PUBLIC_FUTROB_AUTH_BASE_URL`,
  opcional; si falta, usa el origen de web, que proxea `/api/auth`). Sesión en SecureStore
  (`src/modules/identity/`). `/api/v1` acepta Bearer: el cliente tipado vive en
  `src/modules/api/futrob-client.ts` (`getFutrobClient()`), que adjunta el token.
- **UI:** primitivas RN propias en `src/ui/` que respetan
  [`design.md`](/design.md);
  colores/tipo/geometría provienen de `@futrob/ui-tokens`: `Text`, `Button`, `Input`, `Card`,
  `List`/`ListItem`/`ListSection`, `Dialog`, `Tabs` (`line` | `pills`), `Skeleton`, `Icon` y
  los estados `LoadingState`, `ErrorState` y `EmptyState` (cargando, error y vacío son
  distintos). Targets de al menos 44 dp; el estado activo no depende solo del color.
- **Rutas:** Expo Router (`app/`): gate de sesión y onboarding en `app/index.tsx`,
  login/signup en `(auth)`, pasos en `(onboarding)`, destinos personales en `player` y
  organización/competición en `orgs`. Las rutas protegidas revalidan el onboarding.
- **Navegación:** cada contexto (espacio personal, organización, competición) es un grupo
  `(tabs)` con su `_layout.tsx`, que monta `ContextTabsLayout`
  (`src/modules/navigation/`): header con el selector de contexto único, la pestaña activa y la
  barra inferior (headless tabs de `expo-router/ui`, 56 dp). Las pestañas de cada contexto
  viven en `nav-registry.ts`, con el mismo permiso `EffectiveAccess` que web; **Más** agrupa
  los destinos secundarios del contexto (`MORE_DESTINATIONS`), cuenta, idioma y cierre de
  sesión. El detalle y las operaciones son rutas fuera de `(tabs)` que se apilan encima
  (`StackFrame`: atrás, título y contenido). El modelo del selector (opciones, rutas, club por defecto) vive en
  `@futrob/sdk` (`buildWorkspaceOptions`, `workspaceContextPath`…).
- **Onboarding:** `src/modules/identity/onboarding-flow.ts` orquesta el SDK. La API mantiene
  el paso y las consecuencias de negocio; SecureStore conserva el formulario local por usuario.
  Los enlaces `futrob://invitations/accept/<token>` guardan el token hasta completar auth.

## Desarrollo

```bash
npm run start -w @futrob/mobile        # Metro (Expo Go / simulador)
npm run ios -w @futrob/mobile
npm run android -w @futrob/mobile
npm run generate:assets -w @futrob/mobile   # regenera iconos/splash desde packages/ui
```

Variables (`.env` local o shell):

```sh
EXPO_PUBLIC_FUTROB_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_FUTROB_AUTH_BASE_URL=http://localhost:8788
# Leave blank locally. Expo Go never sends Sentry events.
EXPO_PUBLIC_SENTRY_DSN=
```

Sentry en nativo usa `@sentry/react-native` y el plugin de Expo. El único dato de
usuario es el `actorId`. Para source maps en EAS, configura `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG` y `SENTRY_PROJECT` como secretos de EAS; no los commits.

En dispositivo físico usa la IP LAN de tu máquina, no `localhost`.

## Estructura

```text
apps/mobile/
├── app/                       # rutas Expo Router
│   ├── _layout.tsx            # Stack + fuentes Manrope + splash
│   ├── index.tsx              # gate de sesión, onboarding y destino
│   ├── (auth)/               # login/signup → gate u onboarding
│   ├── (onboarding)/         # intención, formularios y revisión
│   ├── player/(tabs)/        # espacio personal: Inicio, Partidos, Estadísticas, Competiciones, Más
│   ├── player/…              # detalle de partido, Clubes EA, Cuentas de juego, Explorar
│   ├── orgs/                 # selector; orgs/[orgId]/(tabs) y …/competitions/[id]/(tabs)
│   └── invitations/accept/   # enlace de invitación
├── assets/                    # generados por scripts/generate-assets.mjs
└── src/
    ├── config/env.ts          # EXPO_PUBLIC_FUTROB_API_BASE_URL
    ├── theme/theme.ts         # ui-tokens → dp, hex, roles typo
    ├── ui/                    # primitivas móviles (Button, List, Dialog, Tabs…)
    └── modules/
        ├── identity/          # auth-api, session-store, validación (+tests)
        ├── navigation/        # shell por contexto, selector, pestañas y Más
        └── player-space/      # espacio del jugador (MOB-02); modelos puros en @futrob/sdk
```
