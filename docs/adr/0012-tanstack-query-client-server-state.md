# ADR-0012: TanStack Query para server state de UI sobre `/api/v1`

- Estado: Aceptada
- Fecha: 2026-08-03
- Relacionado: [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md) · [ADR-0005](/docs/adr/0005-typed-private-api.md) · [ADR-0011](/docs/adr/0011-tagged-errors.md)

## Contexto

La UI autenticada de `apps/web` consume `/api/v1` vía `*BrowserClient` same-origin (cookies) y, en algunos casos, loaders / `createServerFn` de TanStack Start. Sin una capa de server state, cada pantalla repetía `useEffect` + loading/error local, sin cache compartida ni invalidación tras mutaciones.

## Decisión

1. **TanStack Query** es la capa de server state en **presentation** para llamadas cliente a endpoints `/api/v1` (listas, detalle, búsquedas disparadas, mutaciones + invalidación).
2. Los `queryFn` / `mutationFn` delegan en `*BrowserClient` (o helpers equivalentes). No llaman use cases, D1 ni adapters de proveedor.
3. Las **query keys** viven en `apps/web/src/shared/presentation/query/query-keys.ts` y espejan recursos del contrato (`players`, `organizations`, `competitions`, `game-data`, …).
4. El **`QueryClientProvider`** monta en el root de la app (`AppProviders`). No entra en `di/`, bootstrap server ni `packages/<bc>`.
5. **Loaders / server functions de Start** siguen siendo el camino preferido para el primer paint autorizado, redirects y datos SSR (p. ej. onboarding). Query no los sustituye.
6. Fallos esperados del cliente HTTP de presentation usan **`TaggedError`** cuando aportan discriminación; el transport puede devolver `Result` (better-result) y unwrapping hacia throw en el borde de Query (Query modela errores como excepciones).
7. Session de Better Auth no pasa por Query (`authClient.useSession` u equivalente). Estado de UI (wizard step, form dirty, tabs locales) tampoco.

## Consecuencias

- Pantallas que leen o mutan `/api/v1` desde el browser usan `useQuery` / `useMutation` (o hooks de módulo que los envuelven), no `useEffect` + fetch ad-hoc.
- Tras mutaciones, `invalidateQueries` sobre las keys afectadas mantiene cache coherente entre rutas hermanas.
- Domain/application permanecen agnósticos de React Query.

## Ejemplos

### Query keys

Factory en [`/apps/web/src/shared/presentation/query/query-keys.ts`](/apps/web/src/shared/presentation/query/query-keys.ts):

```ts
export const queryKeys = {
  players: {
    all: ["players"] as const,
    me: () => [...queryKeys.players.all, "me"] as const,
    meTeams: () => [...queryKeys.players.all, "me", "teams"] as const,
  },
  organizations: {
    all: ["organizations"] as const,
    mine: () => [...queryKeys.organizations.all, "mine"] as const,
  },
  // …
} as const;
```

### Query + mutation con invalidación

Hooks de módulo (`/apps/web/src/modules/teams/presentation/player-queries.ts`):

```ts
export function useMyPlayerProfileQuery() {
  return useQuery({
    queryKey: queryKeys.players.me(),
    queryFn: () => teamsBrowserClient.getMyProfile(),
  });
}

export function useAddMyGameAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => teamsBrowserClient.addMyGameAccount(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.players.me() });
    },
  });
}
```

`/player` y `/player/game-accounts` comparten `queryKeys.players.me()`; al añadir una cuenta, el workspace se actualiza sin refetch manual.

### `Result` + `TaggedError` en el browser client, unwrap en Query

Transport ([`game-data-browser-client.ts`](/apps/web/src/modules/game-data/presentation/game-data-browser-client.ts)) devuelve `Result`; la mutation lanza el error tipado porque Query modela fallos como excepciones:

```ts
// browser client
async searchClubs(input): Promise<Result<SearchClubsResponse, GameDataClientError>> {
  if (!response.ok) {
    return err(new GameDataClientError({ code, message: code, status: response.status }));
  }
  return ok(body.data);
}

// presentation hook
mutationFn: async (input) => {
  const result = await gameDataBrowserClient.searchClubs(input);
  if (!result.isOk()) throw result.error;
  return result.value;
};
```

En UI: `GameDataClientError.is(cause)` para mapear a copy segura.

### Qué no va por Query

| Caso                                                             | Camino                                |
| ---------------------------------------------------------------- | ------------------------------------- |
| Bootstrap / redirect de onboarding                               | Route `loader` + `createServerFn`     |
| Session                                                          | Better Auth (`authClient.useSession`) |
| Paso actual del wizard / form dirty                              | Estado local o URL                    |
| Nuevo `GET/POST /api/v1/…` desde una pantalla montada en cliente | `useQuery` / `useMutation` (este ADR) |

### Anti-ejemplo

```ts
// Incorrecto: fetch ad-hoc en presentation
useEffect(() => {
  void (fetch("/api/v1/organizations/mine", { credentials: "include" }).then(/* setState */));
}, []);
```

Usar `useMyMembershipsQuery()` (o equivalente) sobre `organizationsBrowserClient.listMine()`.

## Alternativas rechazadas

- Solo loaders de Start para todo el server state interactivo (no cubre cache/share/invalidación entre pantallas montadas en cliente).
- Meter QueryClient en composition server / ports de dominio.
- Devolver `Result` como valor de éxito de `useQuery` (rompe el modelo `isError` / `isPending` de Query).
