# `apps/mobile`

Cliente móvil nativo Must del MVP de Futrob (React Native + Expo SDK 54, Expo Router). Sale junto a web, API y auth.

## Alcance MVP

- Auth y onboarding con los mismos destinos y consecuencias que web.
- Espacio personal: cuentas de juego, clubes EA, equipos/contexto activo, invitaciones, partidos y estadísticas.
- Operación por permiso: organizaciones, competiciones, participantes, equipos/plantillas, fixtures, Match Center, reprogramaciones, resultados oficiales, tabla y rankings.
- Landing y portal público permanecen web responsive y se abren mediante deep links.
- Push nativo no es requisito del MVP; las notificaciones Must siguen siendo in-app/web y correo.

La implementación actual es fundacional: auth, SecureStore, cliente SDK, tokens/primitivas y un home inicial. Los módulos funcionales anteriores siguen siendo trabajo del MVP; este README describe el contrato objetivo sin afirmar que ya esté completo.

## Arquitectura

- **Lógica de negocio:** ninguna local. Toda la lógica vive en
  `packages/<bc>/`; el estado de servidor se consume vía `@futrob/sdk`
  (HTTP a `/api/v1`).
- **Auth:** Better Auth servido por el worker `apps/auth` (`EXPO_PUBLIC_FUTROB_AUTH_BASE_URL`,
  default `http://localhost:8788`; fallback al origen de web, que proxea `/api/auth`). Sesión en SecureStore
  (`src/modules/identity/`). `/api/v1` acepta Bearer: el cliente tipado vive en
  `src/modules/api/futrob-client.ts` (`getFutrobClient()`), que adjunta el token.
- **UI:** primitivas RN propias en `src/ui/` que respetan
  [`product/design-system-spec.md`](../../product/design-system-spec.md);
  colores/tipo/geometría provienen de `@futrob/ui-tokens`.
- **Rutas:** Expo Router (`app/`): gate de sesión en `app/index.tsx`,
  grupo `(auth)` con login/signup y grupo `(home)`.

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
```

En dispositivo físico usa la IP LAN de tu máquina, no `localhost`.

## Estructura

```text
apps/mobile/
├── app/                       # rutas Expo Router
│   ├── _layout.tsx            # Stack + fuentes Manrope + splash
│   ├── index.tsx              # gate de sesión
│   ├── (auth)/login.tsx       # inicio de sesión
│   ├── (auth)/signup.tsx      # registro → onboarding
│   ├── (onboarding)/welcome.tsx  # intro fundacional; flujo completo pendiente
│   └── (home)/index.tsx       # home vacío con guard de sesión
├── assets/                    # generados por scripts/generate-assets.mjs
└── src/
    ├── config/env.ts          # EXPO_PUBLIC_FUTROB_API_BASE_URL
    ├── theme/theme.ts         # ui-tokens → dp, hex, roles typo
    ├── ui/                    # primitivas móviles (Button, Input, Text…)
    └── modules/identity/      # auth-api, session-store, validación (+tests)
```
