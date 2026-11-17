# Landing

The public landing at `/` tells a visitor that Futrob operates EA SPORTS FC Clubs competitions, that captains choose which matches count, and that they can sign in or create an account without seeing administrative data.

## Sub-features

- `landing-load` renders the public page for an anonymous visitor on the default locale.
- `landing-identity` shows the Futrob brand and the hero promise about official leagues and cups.
- `landing-bracket` draws the demo cup bracket, shows a club's result on hover, focus or tap, and ends on the official final card.
- `landing-cta-signup` opens account creation from the header (`Crear cuenta`), the hero (`Crear competición`), and the below-fold final CTA (`Crear cuenta`).
- `landing-cta-login` opens sign-in from the header nav named `Acceso`.
- `landing-cta-pricing` opens `/pricing` from header `Precios` and from the final CTA `Ver precios`.
- `landing-cta-portal` jumps from the hero to `#portal`, the public portal section.
- `landing-mechanism` jumps to `#mecanismo` and shows the EA → selection → approval → publication steps.
- `landing-legal` opens Terms, Privacy, and Refunds from the footer without a session.

## How to get to it (user POV)

- Open `http://localhost:3000/` with no session cookie.
- Choose `Crear cuenta` in the header or the below-fold final CTA, or `Crear competición` in the hero.
- Choose `Iniciar sesión` in the header nav named `Acceso`.
- Choose `Ver precios` in the final CTA, or `Precios` in the header, for `/pricing`.
- Choose `Ver competición pública` in the hero, or open `/#portal`.
- Choose `Cómo funciona` in the header, or open `/#mecanismo`.
- Point at, focus or tap a club crest in the hero bracket.
- Choose `Términos de servicio`, `Política de privacidad`, or `Reembolsos` in the footer, or open `/terms`, `/privacy`, `/refunds`.

## Driving it with verify-futrob

Preconditions:

- `helpers/verify-futrob doctor` exits 0.
- The browser has no Futrob session (or a private profile).
- Evidence directory is `$(helpers/verify-futrob evidence-dir)/landing`.

- **Load landing.** Open `/`. The document title contains `Futrob`. A link named `Futrob` is present. There is **no** visible hero eyebrow; `Competiciones FC Clubs` appears only in `og:title` / `app.title`, not in the hero. The hero heading reads `Ligas y copas de clubs, oficiales.` (three lines, uppercase by style only). The subtitle contains `Del partido de EA al resultado oficial, con la aprobación de tu organización.`
- **Header signup.** Choose `Crear cuenta` in the nav `Acceso`. The URL becomes `/signup`. A heading `Crea tu cuenta` is visible.
- **Return home.** Auth pages have no `Futrob` link (logo is an image). Use the browser back control or open `/` in the address bar. The URL is `/` again.
- **Hero signup.** Choose the hero button `Crear competición`. The URL becomes `/signup` again. Return home the same way (back or `/`).
- **Hero portal.** Choose `Ver competición pública`. The URL hash is `#portal`. A heading `Un portal público a la altura de tu torneo` is visible.
- **Hero bracket.** A figure named `Ejemplo de cuadro de copa en Futrob` lists 16 club buttons at 640 px and wider, 8 below. Hover or focus `Atlético Norte · Finalista · perdió 1–2`: a tooltip with that text appears and its route to the trophy is highlighted. With the bracket focused, the arrow keys move between clubs and `Tab` leaves it. The figure caption reads `Real Cuervos 2–1 Atlético Norte` and `Final · Copa Apertura · Oficial`. With `prefers-reduced-motion: reduce` the final state is painted without animation.
- **Header login.** Choose `Iniciar sesión`. The URL becomes `/login`. A heading `Inicia sesión` is visible. Return home.
- **Mechanism.** Choose `Cómo funciona` in the header nav `Secciones` (inside the `Sheet` below 1024 px), or open `/#mecanismo`. The URL hash is `#mecanismo`. A heading `Cómo un partido se vuelve oficial` is visible, with steps titled `Sync EA`, `Selección`, `Aprobación`, and `Publicación`.
- **Final CTA.** Scroll past `#mecanismo` to `Publica tu primera jornada oficial`. Choose that block’s `Crear cuenta` → `/signup`. Return home. Its `Ver precios` → `/pricing` (heading `Planes para cada competición`). There is no final-CTA `Iniciar sesión`.
- **Footer legal.** Scroll to the footer. Links named `Términos de servicio`, `Política de privacidad`, and `Reembolsos` go to `/terms`, `/privacy`, and `/refunds`. Open `/terms`. A heading `Términos de servicio` is visible. An alert reads `Borrador pendiente de revisión legal`. `curl -sS http://localhost:3000/terms` body contains that heading (SSR HTML, not only client paint). Repeat for `/privacy` (heading `Política de privacidad`, a heading `Eliminación de la cuenta` whose section id is `account-deletion`) and `/refunds` (heading `Reembolsos`).
- **Proof.** Capture an ARIA snapshot and a screenshot of `/` showing the brand, hero, and header CTAs, plus a second pair after scrolling or jumping to `#mecanismo` (include the final CTA if it is in frame). Capture `/pricing` from the final CTA and one legal page (privacy, including the deletion heading). Write `landing` and the entry point into `NOTES.md`.

## Gotchas

- Locale defaults to Spanish. English copy (`Log in`, `Create account`, `Club leagues and cups, official.`) is a different locale, not a failure of the Spanish recipe.
- There are three signup controls: `Crear cuenta` in the header and in the below-fold final CTA, and `Crear competición` in the hero. Drive all three; proving only header + hero is an incomplete entry-point pass. Login lives only in the header (and the mobile sheet). The final block’s second control is `Ver precios`, not `Iniciar sesión`.
- The landing header `Futrob` link is the only brand home control. `/login` and `/signup` render `AuthTunnelShell` with a non-interactive logo (`role=img`). Do not look for a `Futrob` link there.
- `Ver competición pública` is an in-page `#portal` jump, not a new route. In the accessibility tree it is a **button** (the control is an anchor rendered through Base UI `Button`). Assert the heading, not only the hash. Header `Iniciar sesión`, header/final `Crear cuenta`, hero `Crear competición`, and final `Ver precios` are all **buttons** (`Button` with `render={<Link />}`). Do not `getByRole("link")` for those CTAs.
- The header has two nav landmarks: `Secciones` (content links, in a `Sheet` opened by `Abrir navegación` below 1024 px) and `Acceso`. Below 640 px, `Iniciar sesión` moves into that `Sheet`. The sheet trigger needs hydration: on a slow dev server wait for it before clicking.
- The hero entrance lasts 1.5 s. Wait for it (or emulate reduced motion) before a screenshot, or the capture shows a half-drawn bracket. The bracket's club buttons are a single tab stop; they are demo data, not navigation.
- Landing is public. A leftover session must not reveal org admin chrome on `/`.
- Client navigation from a landing CTA can update the URL to `/signup` before the signup accessibility tree paints. If the snapshot still shows the hero, navigate to `/signup` once more and wait for heading `Crea tu cuenta`.
- Browser screenshots may land in a temp path. Copy them into `evidence/<run-id>/landing/` before cleanup.
- The demo search section may call the API. A search failure is not a landing-identity failure unless the hero/CTAs are missing.
- Legal pages are public drafts. The warning alert is expected; do not treat “borrador” as a failure. Account deletion is `/privacy#account-deletion` until AUTH-03 ships an in-app flow. Vite+ web listens on `[::1]`; use `localhost`, not `127.0.0.1`.
