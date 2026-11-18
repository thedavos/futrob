# Landing

The public landing at `/` tells a visitor that Futrob operates EA SPORTS FC Clubs competitions, that captains choose which matches count, and that they can sign in or create an account without seeing administrative data.

## Sub-features

- `landing-load` renders the public page for an anonymous visitor on the default locale.
- `landing-identity` shows the Futrob brand and the hero promise about official leagues and cups.
- `landing-bracket` draws the demo cup bracket, shows a club's result on hover, focus or tap, and ends on the official final card.
- `landing-cta-signup` opens account creation from the header, the hero and the below-fold final CTA, all named `Crear competición`.
- `landing-cta-login` opens sign-in from the header nav named `Acceso`.
- `landing-cta-pricing` jumps to `#precios` from header `Precios`; opens `/pricing` from the final CTA `Ver precios` and the footer `Precios`.
- `landing-cta-portal` jumps from the hero (`Ver ejemplo de portal`) to `#portal`, the public portal section.
- `landing-features` jumps to `#funciones` and shows the bento of seven feature tiles.
- `landing-roles` switches the `Organizadores`, `Capitanes` and `Jugadores` tabs in `#roles`.
- `landing-pricing` shows the plan cards from the public catalog in `#precios`, or the plans-unavailable alert.
- `landing-faq` jumps to `#preguntas` and expands each of the five questions.
- `landing-mechanism` jumps to `#mecanismo` and shows the EA → selection → approval → publication steps.
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
- Choose `Términos de servicio`, `Política de privacidad`, or `Reembolsos` in the footer, or open `/terms`, `/privacy`, `/refunds`.

## Driving it with verify-futrob

Preconditions:

- `helpers/verify-futrob doctor` exits 0.
- The browser has no Futrob session (or a private profile).
- Evidence directory is `$(helpers/verify-futrob evidence-dir)/landing`.

- **Load landing.** Open `/`. The document title contains `Futrob`. A link named `Futrob` is present. The hero eyebrow reads `Para EA SPORTS FC Clubs` (uppercase by style only). The hero heading reads `Ligas y copas de clubs, oficiales.` (three lines, uppercase by style only). The subtitle contains `Tus capitanes eligen cuáles cuentan`. A list named `Condiciones para empezar` shows `Gratis para tu primera competición` and `No necesitas tarjeta`.
- **Header signup.** Choose `Crear competición` in the nav `Acceso`. The URL becomes `/signup`. A heading `Crea tu cuenta` is visible.
- **Return home.** Auth pages have no `Futrob` link (logo is an image). Use the browser back control or open `/` in the address bar. The URL is `/` again.
- **Hero signup.** Choose the hero button `Crear competición`. The URL becomes `/signup` again. Return home the same way (back or `/`).
- **Hero portal.** Choose `Ver ejemplo de portal`. The URL hash is `#portal`. A heading `Un portal público a la altura de tu torneo` is visible.
- **Hero bracket.** A figure named `Ejemplo de cuadro de copa en Futrob` lists 16 club buttons at 640 px and wider, 8 below. Hover or focus `Atlético Norte · Finalista · perdió 1–2`: a tooltip with that text appears and its route to the trophy is highlighted. With the bracket focused, the arrow keys move between clubs and `Tab` leaves it. The figure caption reads `Real Cuervos 2–1 Atlético Norte` and `Final · Copa Apertura · Oficial`. With `prefers-reduced-motion: reduce` the final state is painted without animation.
- **Header login.** Choose `Iniciar sesión`. The URL becomes `/login`. A heading `Inicia sesión` is visible. Return home.
- **Mechanism.** Choose `Cómo funciona` in the header nav `Secciones` (inside the `Sheet` below 1024 px), or open `/#mecanismo`. The URL hash is `#mecanismo`. A heading `Cómo un partido se vuelve oficial` is visible, with steps titled `Sync EA`, `Selección`, `Aprobación`, and `Publicación`.
- **Features.** Choose `Funciones` or open `/#funciones`. A heading `Toda tu competición, de la jornada 1 a la final` is visible with seven tile headings, from `Una tabla que solo suma lo aprobado` to `Y lo que pasa entre jornadas`.
- **Roles.** In `#roles`, the tab `Organizadores` is selected. Choose `Capitanes`: its panel shows `Propón otro horario` and the reschedule example `En negociación`. Choose `Jugadores`: its panel shows `Mis estadísticas`.
- **Pricing.** Choose header `Precios` or open `/#precios`. Heading `Empieza gratis, crece cuando lo necesites` with the plan cards; with the API down, the alert `No pudimos cargar los planes` instead.
- **FAQ.** Choose `Preguntas` or open `/#preguntas`. Five questions; opening `¿Futrob es un producto de EA?` reveals its answer.
- **Final CTA.** Scroll past `#preguntas` to the heading `Tu competición, oficial.`. Choose that block’s `Crear competición` → `/signup`. Return home. Its `Ver precios` → `/pricing` (heading `Planes para cada competición`). There is no final-CTA `Iniciar sesión`.
- **Footer legal.** Scroll to the footer. Links named `Términos de servicio`, `Política de privacidad`, and `Reembolsos` go to `/terms`, `/privacy`, and `/refunds`. Open `/terms`. A heading `Términos de servicio` is visible. An alert reads `Borrador pendiente de revisión legal`. `curl -sS http://localhost:3000/terms` body contains that heading (SSR HTML, not only client paint). Repeat for `/privacy` (heading `Política de privacidad`, a heading `Eliminación de la cuenta` whose section id is `account-deletion`) and `/refunds` (heading `Reembolsos`).
- **Proof.** Capture an ARIA snapshot and a screenshot of `/` showing the brand, hero, and header CTAs, plus a second pair after scrolling or jumping to `#mecanismo` (include the final CTA if it is in frame). Capture `/pricing` from the final CTA and one legal page (privacy, including the deletion heading). Write `landing` and the entry point into `NOTES.md`.

## Gotchas

- Locale defaults to Spanish. English copy (`Log in`, `Create account`, `Club leagues and cups, official.`) is a different locale, not a failure of the Spanish recipe.
- There are three signup controls, all named `Crear competición`: header, hero and the below-fold final CTA. Drive all three; proving only header + hero is an incomplete entry-point pass. Login lives only in the header (and the mobile sheet). The final block’s second control is `Ver precios`, not `Iniciar sesión`.
- The landing header `Futrob` link is the only brand home control. `/login` and `/signup` render `AuthTunnelShell` with a non-interactive logo (`role=img`). Do not look for a `Futrob` link there.
- `Ver ejemplo de portal` is an in-page `#portal` jump, not a new route. In the accessibility tree it is a **button** (the control is an anchor rendered through Base UI `Button`). Assert the heading, not only the hash. Header `Iniciar sesión`, header/hero/final `Crear competición`, and final `Ver precios` are all **buttons** (`Button` with `render={<Link />}`). Do not `getByRole("link")` for those CTAs.
- The header has two nav landmarks: `Secciones` (content links, in a `Sheet` opened by `Abrir navegación` below 1024 px) and `Acceso`. Below 640 px, `Iniciar sesión` moves into that `Sheet`. The sheet trigger needs hydration: on a slow dev server wait for it before clicking.
- The hero entrance lasts 1.5 s. Wait for it (or emulate reduced motion) before a screenshot, or the capture shows a half-drawn bracket. The bracket's club buttons are a single tab stop; they are demo data, not navigation.
- Landing is public. A leftover session must not reveal org admin chrome on `/`.
- Client navigation from a landing CTA can update the URL to `/signup` before the signup accessibility tree paints. If the snapshot still shows the hero, navigate to `/signup` once more and wait for heading `Crea tu cuenta`.
- Browser screenshots may land in a temp path. Copy them into `evidence/<run-id>/landing/` before cleanup.
- The landing loader reads `/public/plans` from the product API; without it, `#precios` shows the plans-unavailable alert and the rest of the page still renders.
- The demo search section may call the API. A search failure is not a landing-identity failure unless the hero/CTAs are missing.
- Legal pages are public drafts. The warning alert is expected; do not treat “borrador” as a failure. Account deletion is `/privacy#account-deletion` until AUTH-03 ships an in-app flow. Vite+ web listens on `[::1]`; use `localhost`, not `127.0.0.1`.
