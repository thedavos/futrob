# Futrob

**Ligas, copas y torneos de EA SPORTS FC, con foco en FC Clubs.**

Futrob reúne la operación de una competición: organizaciones, equipos, plantillas, calendario, resultados oficiales y estadísticas. Combina datos de EA Clubs con la selección y confirmación de los partidos que cuentan para cada enfrentamiento.

El producto contempla una aplicación web y un cliente móvil nativo para organizadores, capitanes y jugadores, además de un portal público para seguidores.

[Producto](product/prd.md) · [Estado del MVP](#status) · [Desarrollo local](#desarrollo-local) · [Arquitectura](docs/architecture/overview.md) · [Decisiones técnicas](docs/adr/README.md)

## Del partido jugado al resultado oficial

Dos equipos pueden jugar cinco veces en una noche y tener solo dos partidos programados para la competición. Futrob distingue los registros del proveedor de los partidos oficiales:

1. El calendario define el enfrentamiento y sus partidos oficiales.
2. La integración con EA Clubs obtiene los partidos candidatos.
3. Los capitanes seleccionan y confirman cuáles cuentan para la competición.
4. Los resultados aprobados alimentan la tabla, las estadísticas y los rankings oficiales.

La sincronización con EA por sí sola no convierte un partido en oficial. Esta separación permite mantener una selección auditable y gestionar reprogramaciones y disputas.

## Para quién es

| Perfil                   | Objetivo                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| Organizadores y staff    | Configurar competiciones, gestionar participantes y operar calendario y resultados.              |
| Capitanes y subcapitanes | Representar al equipo, mantener la plantilla y gestionar sus enfrentamientos.                    |
| Jugadores                | Mantener su perfil personal y consultar partidos y estadísticas, sin necesitar una organización. |
| Espectadores             | Seguir la información que cada competición publique en el portal web.                            |

<a id="status"></a>

## Estado del MVP

**En desarrollo.** El repositorio contiene implementaciones de las siguientes áreas; su presencia no equivale a aceptación completa ni a verificación en producción.

| Área                      | Implementación en el repositorio                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Identidad                 | Registro, login, sesiones y onboarding; perfiles personales y destinos según membresías.                                           |
| Organizaciones            | Organizaciones, membresías e invitaciones con persistencia en Postgres.                                                            |
| Competiciones             | Borradores y configuración, participantes, equipos, plantillas y generación de fixtures en la API.                                 |
| EA Clubs                  | Búsqueda de clubes y acceso a datos del proveedor desde la API de producto.                                                        |
| Resultados y estadísticas | Selección y confirmación oficial, proyección de estadísticas, tabla y endpoints de rankings; página web de rendimiento de equipos. |
| Móvil                     | Auth, onboarding mediante el SDK y destinos nativos mínimos.                                                                       |

Quedan por completar y aceptar los flujos del MVP de competiciones, calendario y resultados, la entrega durable de eventos entre módulos, las analíticas premium, el portal público y la cobertura de funcionalidades autenticadas en móvil. El [README móvil](apps/mobile/README.md) detalla su alcance actual.

El [PRD](product/prd.md) define el producto objetivo. Los [requisitos](product/mvp-requirements.md), los [criterios de aceptación](product/acceptance-criteria.md) y las [decisiones abiertas](product/open-decisions.md) describen el alcance y cómo validarlo.

## Arquitectura

Monorepo TypeScript con contextos de negocio hexagonales: dominio, casos de uso y puertos en `packages/<bc>`; adaptadores e infraestructura en las aplicaciones.

| Aplicación                     | Responsabilidad                                | Tecnología                                  |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------- |
| [Web](apps/web)                | Interfaz, BFF `/api/v1` y proxy de auth        | React, TanStack Start, Cloudflare Workers   |
| [Auth](apps/auth)              | Credenciales, sesiones y actores               | Better Auth, Cloudflare Workers, Hyperdrive |
| [API](apps/api/README.md)      | Casos de uso, persistencia y acceso a EA Clubs | Hono, Node.js, Railway, Postgres            |
| [Móvil](apps/mobile/README.md) | Cliente nativo autenticado                     | React Native, Expo, Expo Router             |
| [CLI](apps/cli/README.md)      | Playground de dominio y smokes de API          | Node.js, tsx                                |

Web y móvil consumen los contratos HTTP mediante `@futrob/sdk`. La autenticación vive en `apps/auth`; el BFF resuelve el actor y llama a la API con autenticación de servicio. Auth y producto comparten Postgres, con una sola historia de migraciones en `apps/api/migrations`.

Los contextos mantienen responsabilidades distintas:

| Contexto     | Responsabilidad                                                          |
| ------------ | ------------------------------------------------------------------------ |
| `scheduling` | Cuándo se juega y cuántos partidos oficiales requiere el enfrentamiento. |
| `game-data`  | Qué reporta el proveedor y cómo se normaliza.                            |
| `results`    | Qué partidos cuentan y cómo se aprueban.                                 |
| `statistics` | Tabla y rankings derivados de resultados aprobados.                      |
| `analytics`  | Interpretación y análisis premium.                                       |

La interfaz usa StyleX, primitivas Base UI y Storybook. Web y móvil comparten tokens mediante `@futrob/ui-tokens`; [design.md](design.md) define el contrato visual. Vite+ integra formato, lint y Vitest.

Consulta el [mapa de paquetes](packages/README.md), los [límites de módulos](docs/architecture/module-boundaries.md) y el [grafo de dependencias](docs/architecture/dependency-graph.md).

## Desarrollo local

Requisitos: **Node.js 24 o superior**, npm y una base **Postgres propia** para autenticación y persistencia. La API puede ejecutarse sin `DATABASE_URL` con almacenamiento en memoria; ese modo pierde los datos al reiniciar y no permite iniciar sesión.

### 1. Instalar dependencias

```bash
git clone https://github.com/thedavos/futrob.git
cd futrob
npm ci
```

Si tienes Vite+ instalado globalmente, puedes usar `vp install`. Los scripts `npm run` usan el binario local del repositorio; para invocarlo directamente usa `./node_modules/.bin/vp`.

### 2. Preparar el entorno

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
cp apps/auth/.dev.vars.example apps/auth/.dev.vars
cp apps/api/.env.example apps/api/.env
cp apps/auth/.env.example apps/auth/.env
cp apps/web/.env.example apps/web/.env
```

Configura los archivos locales con estas relaciones:

| Variable                                                   | Configuración                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                             | En `apps/api/.env`, apunta a tu Postgres de desarrollo.                               |
| `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` | En `apps/auth/.env` y `apps/web/.env`, usa la misma conexión que `DATABASE_URL`.      |
| `BETTER_AUTH_SECRET`                                       | Mismo valor en los `.dev.vars` de web y auth.                                         |
| `INTERNAL_JOB_SECRET`                                      | Mismo valor en web y API.                                                             |
| `RATE_LIMIT_FINGERPRINT_SECRET`                            | En web, usa un secreto aleatorio independiente.                                       |
| `FUTROB_API_BASE_URL`                                      | En web, `http://localhost:8787/api/v1`.                                               |
| `SENTRY_DSN`                                               | Vacío en local. En producción, secreto de Wrangler (web/auth) o env de Railway (API). |
| `EXPO_PUBLIC_SENTRY_DSN`                                   | Vacío en local. Expo Go no envía eventos.                                             |

Mantén `ENVIRONMENT=development` en web para el desarrollo local. Los archivos de entorno están excluidos de Git; no publiques sus valores.

**En un worktree, verifica las conexiones antes de migrar:** el setup puede copiar las de la base compartida. Apunta la API y ambos Hyperdrive a tu propia base. No ejecutes migraciones ni seeds contra una base compartida.

### 3. Aplicar migraciones e iniciar

```bash
npm run migrate -w @futrob/api
npm run dev
```

| Servicio        | Dirección local                |
| --------------- | ------------------------------ |
| Web             | http://localhost:3000          |
| API de producto | http://localhost:8787/api/v1   |
| Auth            | http://localhost:8788/api/auth |

`npm run dev` inicia web, API y auth. Wrangler conecta web con el Worker de auth mediante `AUTH_SERVICE`.

Para ejecutar el cliente nativo, sigue la [configuración móvil](apps/mobile/README.md#desarrollo).

### Problemas frecuentes

- **Login correcto, pero la web sigue sin sesión:** comprueba que `BETTER_AUTH_SECRET` coincide entre web y auth.
- **Llamadas BFF de organizaciones con 401:** comprueba que `INTERNAL_JOB_SECRET` coincide entre web y API.
- **No puedes iniciar sesión:** comprueba Postgres, las conexiones Hyperdrive y las migraciones aplicadas.
- **Rutas protegidas del BFF con 503 fuera de desarrollo:** comprueba `RATE_LIMIT_FINGERPRINT_SECRET`. Provisiona el secreto antes de desplegar el Worker:

```bash
npx wrangler secret put RATE_LIMIT_FINGERPRINT_SECRET --config apps/web/wrangler.jsonc
```

Los valores y ajustes opcionales de rate limits están documentados en `apps/web/.dev.vars.example`.

## Comandos habituales

| Comando                                                               | Uso                                                              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                                                         | Web, API y auth en paralelo.                                     |
| `npm run web` / `npm run api`                                         | Iniciar solo web o API.                                          |
| `npm run dev -w @futrob/auth`                                         | Iniciar solo auth.                                               |
| `npm run check`                                                       | Formato, lint y análisis de tipos de Vite+, más reglas de tests. |
| `npm run typecheck`                                                   | Typechecks de los workspaces.                                    |
| `npm run test`                                                        | Tests con Vitest.                                                |
| `npm run test:coverage`                                               | Tests con cobertura.                                             |
| `npm run build`                                                       | Build de web.                                                    |
| `npm run bundle:budget`                                               | Comprobar presupuestos del bundle tras el build.                 |
| `npm run storybook`                                                   | Catálogo de componentes en `:6006`.                              |
| `npm run storybook:build`                                             | Build estático de Storybook.                                     |
| `npm run start -w @futrob/mobile`                                     | Iniciar Metro para móvil.                                        |
| `npm run ios -w @futrob/mobile` / `npm run android -w @futrob/mobile` | Ejecutar el cliente nativo.                                      |
| `npm run cli -- help`                                                 | Explorar comandos de dominio y API.                              |
| `npm run cli -- domain-smoke`                                         | Smoke de dominio sin integraciones externas.                     |

## Documentación y contribuciones

Antes de cambiar código, consulta [AGENTS.md](AGENTS.md) para conocer las reglas de arquitectura, manejo de datos y verificación.

- [PRD y visión de producto](product/prd.md)
- [Requisitos del MVP](product/mvp-requirements.md) y [glosario del dominio](product/domain-glossary.md)
- [Criterios de aceptación](product/acceptance-criteria.md)
- [Arquitectura](docs/architecture/overview.md) y [ADRs](docs/adr/README.md)
- [Sistema de diseño](design.md)
- [API de producto](apps/api/README.md), [paquetes y SDK](docs/architecture/packages-and-sdk.md)
- [Verificación de flujos web](.agents/skills/verify-futrob/SKILL.md) y [smokes con CLI](.agents/skills/futrob-cli/SKILL.md)
