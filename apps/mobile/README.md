# `apps/mobile`

Cliente móvil Futrob (React Native + Expo SDK 54, Expo Router). Consumió
post-MVP en los ADRs; ahora sale junto a web y API.

## Arquitectura

- **Lógica de negocio:** ninguna local. Toda la lógica vive en
  `packages/<bc>/`; el estado de servidor se consume vía `@futrob/sdk`
  (HTTP a `/api/v1`).
- **Auth:** Better Auth de `apps/web` (`/api/auth/*`) consumido con fetch; la sesión se
  guarda en SecureStore (`src/modules/identity/`). `/api/v1` acepta Bearer (plugin
  `bearer()` en web): el cliente tipado vive en `src/modules/api/futrob-client.ts`
  (`getFutrobClient()`), que adjunta el token automáticamente.
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
│   ├── (onboarding)/welcome.tsx  # intro de configuración (pasos; API pendiente Bearer)
│   └── (home)/index.tsx       # home vacío con guard de sesión
├── assets/                    # generados por scripts/generate-assets.mjs
└── src/
    ├── config/env.ts          # EXPO_PUBLIC_FUTROB_API_BASE_URL
    ├── theme/theme.ts         # ui-tokens → dp, hex, roles typo
    ├── ui/                    # primitivas móviles (Button, Input, Text…)
    └── modules/identity/      # auth-api, session-store, validación (+tests)
```
