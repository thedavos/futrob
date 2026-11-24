# Landing

The public landing at `/` tells a visitor that Futrob operates EA SPORTS FC Clubs competitions, that captains choose which matches count, and that they can sign in or create an account without seeing administrative data.

## Sub-features

- `landing-load` renders the public page for an anonymous visitor on the default locale.
- `landing-identity` shows the Futrob brand and the hero promise about official leagues and cups.
- `landing-bracket` draws the demo cup bracket, shows a club's result on hover, focus or tap, and ends on the official final card.
- `landing-cta-signup` opens account creation from the header, the hero and the below-fold final CTA, all named `Crear competición`; after signup, onboarding opens on the organization step.
- `landing-cta-login` opens sign-in from the header nav named `Acceso`.
- `landing-cta-pricing` jumps to `#precios` from header `Precios`; opens `/pricing` from the final CTA `Ver precios` and the footer `Precios`.
- `landing-cta-portal` jumps from the hero (`Ver ejemplo de portal`) to `#portal`, the public portal section.
- `landing-features` jumps to `#funciones` and shows the bento of seven feature tiles.
- `landing-roles` switches the `Organizadores`, `Capitanes` and `Jugadores` tabs in `#roles`.
- `landing-pricing` shows the plan cards from the public catalog in `#precios`, or the plans-unavailable alert.
- `landing-faq` jumps to `#preguntas` and expands each of the five questions.
- `landing-mechanism` jumps to `#mecanismo` and shows the EA → selection → approval → publication steps.
- `landing-club-search` searches an EA club signed out in `#demo` (`Busca tu club o tu competición`) with `Buscar` set to `Clubes`; every club found is a row link `Crear cuenta con <club>` (signup, then the player onboarding review with that club).
- `landing-open-competitions` searches competitions with open registration in `#demo` with `Buscar` set to `Competiciones`, signed out, from `/api/v1/public/competitions/explore` (optional `q` and `platform`). `Unirme` opens `/signup?redirectTo=%2Fonboarding%2Freview%3Fcompetition%3D…`. Below the results in both kinds, `¿Organizas un torneo?` with the link `Crea tu competición` opens `/signup?redirectTo=%2Fonboarding%2Forganization%3Fintent%3Dorganizer`; after signup, onboarding opens on the organization step, skipping `¿Cómo vas a usar Futrob?`.
- `landing-legal` opens Terms, Privacy, and Refunds from the footer without a session; the footer also shows the `Producto` nav and the EA non-affiliation notice.

## How to get to it (user POV)

- Open `http://localhost:3000/` with no session cookie.
- Choose `Crear competición` in the header, the hero or the below-fold final CTA.
- Choose `Iniciar sesión` in the header nav named `Acceso`.
- Choose `Ver precios` in the final CTA, or `Precios` in the footer, for `/pricing`. Header `Precios` jumps to `/#precios`.
- Choose `Ver ejemplo de portal` in the hero, or open `/#portal`.
- Choose `Funciones` or `Preguntas` in the header, or open `/#funciones` / `/#preguntas`.
- Choose `Cómo funciona` in the header, or open `/#mecanismo`.
- Point at, focus or tap a club crest in the hero bracket.
- In `#demo`, type a club name and choose `Buscar`, then choose a result row (`Crear cuenta con <club>`).
- In `#demo`, set the `Buscar` select to `Competiciones`, optionally type a name or pick a platform, then `Unirme`.
- Choose `Términos de servicio`, `Política de privacidad`, or `Reembolsos` in the footer, or open `/terms`, `/privacy`, `/refunds`.

## Driving it with verify-futrob

Preconditions:

- `helpers/verify-futrob doctor` exits 0.
- The browser has no Futrob session (or a private profile).
- Evidence directory is `$(helpers/verify-futrob evidence-dir)/landing`.

- **Load landing.** Open `/`. The document title contains `Futrob`. A link named `Futrob` is present. The hero eyebrow reads `Para Clubs de EA SPORTS FC` (uppercase by style only). The hero heading reads `Ligas y copas de clubs, oficiales.` (three lines, uppercase by style only). The subtitle contains `Tus capitanes eligen cuáles cuentan`. A list named `Condiciones para empezar` shows `Gratis para tu primera competición` and `No necesitas tarjeta`.
- **Header signup.** Choose `Crear competición` in the nav `Acceso`. The URL becomes `/signup?redirectTo=%2Fonboarding%2Forganization%3Fintent%3Dorganizer`. A heading `Crea tu cuenta` is visible. After signing up a disposable actor, onboarding opens `Crea tu organización` without asking `¿Cómo vas a usar Futrob?`.
- **Return home.** Auth pages have no `Futrob` link (logo is an image). Use the browser back control or open `/` in the address bar. The URL is `/` again.
- **Hero signup.** Choose the hero button `Crear competición`. The URL becomes `/signup?redirectTo=%2Fonboarding%2Forganization%3Fintent%3Dorganizer` again. Return home the same way (back or `/`).
- **Hero portal.** Choose `Ver ejemplo de portal`. The URL hash is `#portal`. A heading `Un portal público a la altura de tu torneo` is visible.
- **Hero bracket.** A figure named `Ejemplo de cuadro de copa en Futrob` lists 16 club buttons at 640 px and wider, 8 below. Hover or focus `Atlético Norte · Finalista · perdió 1–2`: a tooltip with that text appears and its route to the trophy is highlighted. With the bracket focused, the arrow keys move between clubs and `Tab` leaves it. The figure caption reads `Real Cuervos, campeón` and `Final 2–1 ante Atlético Norte · oficial`, with a gold trophy and no stamp. With `prefers-reduced-motion: reduce` the final state is painted without animation.
- **Header login.** Choose `Iniciar sesión`. The URL becomes `/login`. A heading `Inicia sesión` is visible. Return home.
- **Mechanism.** Choose `Cómo funciona` in the header nav `Secciones` (inside the `Sheet` below 1024 px), or open `/#mecanismo`. The URL hash is `#mecanismo`. A heading `Cómo un partido se vuelve oficial` is visible, with steps titled `Sync EA`, `Selección`, `Aprobación`, and `Publicación`.
- **Features.** Choose `Funciones` or open `/#funciones`. A heading `Toda tu competición, de la jornada 1 a la final` is visible with seven tile headings, from `Una tabla que solo suma lo aprobado` to `Y lo que pasa entre jornadas`.
- **Roles.** In `#roles`, the tab `Organizadores` is selected. Choose `Capitanes`: its panel shows `Propón otro horario` and the reschedule example `En negociación`. Choose `Jugadores`: its panel shows `Mis estadísticas`.
- **Pricing.** Choose header `Precios` or open `/#precios`. Heading `Empieza gratis, crece cuando lo necesites` with the plan cards; with the API down, the alert `No pudimos cargar los planes` instead.
- **FAQ.** Choose `Preguntas` or open `/#preguntas`. Five questions; opening `¿Futrob es un producto de EA?` reveals its answer.
- **Club search.** Open `/#demo` signed out. Heading `Busca tu club o tu competición`; the combobox `Buscar` reads `Clubes` and `Plataforma` reads `Cross-gen`. Type a known club name in the searchbox `Nombre del club` and choose `Buscar`; the request goes to `/api/v1/public/game-data/clubs/search` and returns 200 without a session. The list `Clubes encontrados` shows up to ten clubs under `N clubes en <plataforma>`, each row a link named `Crear cuenta con <club>` showing `ID EA <externalClubId>` and the lime text `Crear cuenta`. The row opens `/signup?redirectTo=%2Fonboarding%2Fclub%3Fclub%3D…`. Sign up a disposable actor: onboarding opens `Confirma tu configuración` with the club; `Entrar a mi espacio` lands on `/player` with the club associated. Choosing another `Plataforma` repeats the search. Switching to `Competiciones` and back to `Clubes` with the same name does not search EA again. Repeated searches past the per-IP limit show `Alcanzaste el límite temporal de búsquedas.` and `Reintentar en N s`.
- **Open competitions.** In `#demo`, set `Buscar` to `Competiciones`: the searchbox becomes `Nombre de la competición`, `Plataforma` reads `Todas`, and the list `Inscripciones abiertas` shows up to six rows, each a link named `Unirme a <competition>` with the lime text `Unirme`, the organizer, format, platform, start, and a capacity bar (`N de M equipos`, plus `queda 1 lugar` / `quedan 2 lugares` when nearly full), without typing. `curl -s http://localhost:3000/api/v1/public/competitions/explore` returns 200 without a session and only `registration`, `listed` items; `?q=<name>` narrows by name and `?platform=` by platform. With none open it reads `No hay inscripciones abiertas ahora.` with no action; a name or platform with no match reads `Ninguna competición con inscripción abierta coincide con «<name>».` (or names the platform) and `Ver todas las competiciones` clears both. A club search with no match reads `Ningún club coincide con «<name>» en <plataforma>`. Choose `Unirme` and sign up a disposable actor: onboarding opens `Confirma tu configuración` for that competition.
- **Final CTA.** Scroll past `#preguntas` to the heading `Tu competición, oficial.`. Choose that block’s `Crear competición` → `/signup?redirectTo=%2Fonboarding%2Forganization%3Fintent%3Dorganizer`. Return home. Its `Ver precios` → `/pricing` (heading `Planes para cada competición`). There is no final-CTA `Iniciar sesión`.
- **Footer legal.** Scroll to the footer. Links named `Términos de servicio`, `Política de privacidad`, and `Reembolsos` go to `/terms`, `/privacy`, and `/refunds`. Open `/terms`. A heading `Términos de servicio` is visible. An alert reads `Borrador pendiente de revisión legal`. `curl -sS http://localhost:3000/terms` body contains that heading (SSR HTML, not only client paint). Repeat for `/privacy` (heading `Política de privacidad`, a heading `Eliminación de la cuenta` whose section id is `account-deletion`) and `/refunds` (heading `Reembolsos`).
- **Proof.** Capture an ARIA snapshot and a screenshot of `/` showing the brand, hero, and header CTAs, plus a second pair after scrolling or jumping to `#mecanismo` (include the final CTA if it is in frame). Capture `/pricing` from the final CTA and one legal page (privacy, including the deletion heading). Write `landing` and the entry point into `NOTES.md`.

## Gotchas

- Locale defaults to Spanish. English copy (`Log in`, `Create account`, `Club leagues and cups, official.`) is a different locale, not a failure of the Spanish recipe.
- Verify the three generic `Crear competición` entry points in the header, hero and final CTA. Run the club-search recipe for a `Crear cuenta con <club>` row, which opens signup with that row's club in the onboarding redirect. The Pro and Liga plan cards in `#precios` use `Crear cuenta`, and Gratis uses `Empezar gratis`. The final block also offers `Ver precios`. Login is in the header or the mobile sheet.
- The landing header `Futrob` link is the only brand home control. `/login` and `/signup` render `AuthTunnelShell` with a non-interactive logo (`role=img`). Do not look for a `Futrob` link there.
- `Ver ejemplo de portal` is an in-page `#portal` jump, not a new route. In the accessibility tree it is a **button** (the control is an anchor rendered through Base UI `Button`). Assert the heading, not only the hash. Header `Iniciar sesión`, header/hero/final `Crear competición`, and final `Ver precios` are all **buttons** (`Button` with `render={<Link />}`). Do not `getByRole("link")` for those CTAs.
- The header has two nav landmarks: `Secciones` (content links, in a `Sheet` opened by `Abrir navegación` below 1024 px) and `Acceso`. Below 640 px, `Iniciar sesión` moves into that `Sheet`. The sheet trigger needs hydration: on a slow dev server wait for it before clicking.
- The hero entrance lasts 1.5 s. Wait for it (or emulate reduced motion) before a screenshot, or the capture shows a half-drawn bracket. The bracket's club buttons are a single tab stop; they are demo data, not navigation. Hover/focus paints a tooltip on screen; it is not exposed as `role=tooltip` in the accessibility tree.
- FAQ questions live in `<details>` with a heading in the summary, not `role=button`. Open `¿Futrob es un producto de EA?` by expanding that details row.
- Landing is public. A leftover session must not reveal org admin chrome on `/`.
- Client navigation from a landing CTA can update the URL to `/signup` before the signup accessibility tree paints. If the snapshot still shows the hero, navigate to `/signup` once more and wait for heading `Crea tu cuenta`.
- Browser screenshots may land in a temp path. Copy them into `evidence/<run-id>/landing/` before cleanup.
- The landing loader reads `/public/plans` from the product API; without it, `#precios` shows the plans-unavailable alert and the rest of the page still renders.
- The club search calls EA through the public BFF route and the API. A search failure is not a landing-identity failure unless the hero/CTAs are missing. Club and competition result rows are **links** named `Crear cuenta con <club>` / `Unirme a <competition>`; the organizer `Crea tu competición` is a link too.
- Rate limits are bypassed when `ENVIRONMENT` (or `NODE_ENV`) is `development`, so the 429 state is only reachable on a non-development Worker.
- Legal pages are public drafts. The warning alert is expected; do not treat “borrador” as a failure. Account deletion is `/privacy#account-deletion` until AUTH-03 ships an in-app flow. Vite+ web listens on `[::1]`; use `localhost`, not `127.0.0.1`.
