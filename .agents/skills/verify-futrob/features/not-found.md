# Missing routes and unexpected failures

A visitor or signed-in user who opens a URL Futrob does not have, or hits an unexpected loader failure, sees a Futrob page with a way out instead of a blank screen.

## Sub-features

- `not-found-anonymous` responds HTTP 404 for an unmatched path and shows an exit link home.
- `not-found-signed-in` shows an exit link to the player's space.
- `route-error-retry` shows the global error page with a retry control after a loader throw.

## How to get to it (user POV)

- Open a path that has no route, such as `http://localhost:3000/this-route-does-not-exist`, with no session.
- After signing in, open the same missing path.
- An unexpected loader failure (not a mapped TaggedError) shows the error page.

## Driving it with verify-futrob

Preconditions:

- `helpers/verify-futrob doctor` exits 0.
- The browser has no Futrob session (or a private profile) for the anonymous case.
- Evidence directory is `$(helpers/verify-futrob evidence-dir)/not-found`.

- **Anonymous 404.** Request `GET http://localhost:3000/this-route-does-not-exist` (use `localhost`, not `127.0.0.1`). The HTTP status is 404. The document contains `Futrob`. Open the path in the browser. A heading `No encontramos esta página` is visible. A link `Volver al inicio` goes to `/`.
- **Exit home.** Choose `Volver al inicio`. The URL becomes `/`. The landing heading about the official result is visible.
- **English.** Switch locale to English if the chrome exposes it, or set the UI locale cookie and reload the missing path. The heading is `We couldn't find this page`. The exit link is `Back to home`. Return to Spanish before the signed-in case.
- **Signed-in 404.** Sign in with a disposable account that can open `/player`. Open `/this-route-does-not-exist`. The heading is still `No encontramos esta página`. A link `Ir a tu espacio` goes to `/player`. Choose it. The URL is `/player` and the heading `Inicio` is visible.
- **Proof.** Capture HTTP status (curl `-sS -o /tmp/not-found.html -w '%{http_code}'`) plus ARIA snapshot and screenshot of the anonymous 404, and a second pair for the signed-in 404. Record `not-found` and the entry path in `NOTES.md`.

## Gotchas

- Vite+ web listens on `[::1]`. `127.0.0.1:3000` fails. Use `localhost`.
- A matching splat route that rendered a 404 page as a successful match would be HTTP 200. The root `notFoundComponent` must stay a not-found, not a new catch-all file route.
- Resource pages that collapse missing and forbidden into "no disponible" are not this feature. Do not treat those EmptyStates as the global 404.
- The error page retry is a button `Reintentar`. Do not drive it with a made-up loader in production. Storybook `Product/Shared/Route error` covers the control. A live loader throw is optional and must not use a committed debug route.
- Locale defaults to Spanish. English copy is a locale switch, not a failure of the Spanish recipe.
