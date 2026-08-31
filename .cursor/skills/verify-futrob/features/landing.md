# Landing

The public landing at `/` tells a visitor that Futrob operates EA SPORTS FC Clubs competitions, that captains choose which matches count, and that they can sign in or create an account without seeing administrative data.

## Sub-features

- `landing-load` renders the public page for an anonymous visitor on the default locale.
- `landing-identity` shows the Futrob brand and the hero promise about the official result.
- `landing-cta-signup` opens account creation from the header and from the hero.
- `landing-cta-login` opens sign-in from the header nav named `Acceso`.
- `landing-mechanism` jumps to `#mecanismo` and shows the EA → selection → approval → publication steps.

## How to get to it (user POV)

- Open `http://localhost:3000/` with no session cookie.
- Choose `Crear cuenta` in the header or in the hero.
- Choose `Iniciar sesión` in the header.
- Choose `Ver cómo funciona` in the hero, or open `/#mecanismo`.

## Driving it with verify-futrob

Preconditions:

- `helpers/verify-futrob doctor` exits 0.
- The browser has no Futrob session (or a private profile).
- Evidence directory is `$(helpers/verify-futrob evidence-dir)/landing`.

- **Load landing.** Open `/`. The document title contains `Futrob`. A link named `Futrob` is present. The hero eyebrow reads `Competiciones FC Clubs`. The hero heading contains `Del partido de EA al` and `resultado oficial`. The subtitle contains `Los capitanes eligen los partidos que cuentan.`
- **Header signup.** Choose `Crear cuenta` in the nav `Acceso`. The URL becomes `/signup`. A heading `Crea tu cuenta` is visible.
- **Return home.** Auth pages have no `Futrob` link (logo is an image). Use the browser back control or open `/` in the address bar. The URL is `/` again.
- **Hero signup.** Choose the hero button `Crear cuenta`. The URL becomes `/signup` again. Return home the same way (back or `/`).
- **Header login.** Choose `Iniciar sesión`. The URL becomes `/login`. A heading `Inicia sesión` is visible. Return home.
- **Mechanism.** Choose `Ver cómo funciona`. The URL hash is `#mecanismo`. A heading `Cómo un partido se vuelve oficial` is visible, with steps titled `Sync EA`, `Selección`, `Aprobación`, and `Publicación`.
- **Proof.** Capture an ARIA snapshot and a screenshot of `/` showing the brand, hero, and both CTAs, plus a second pair after scrolling or jumping to `#mecanismo`. Write `landing` and the entry point into `NOTES.md`.

## Gotchas

- Locale defaults to Spanish. English copy (`Log in`, `Create account`, `From the EA match to the`) is a different locale, not a failure of the Spanish recipe.
- There are two `Crear cuenta` controls (header and hero). Drive both; proving only one is an incomplete entry-point pass.
- The landing header `Futrob` link is the only brand home control. `/login` and `/signup` render `AuthTunnelShell` with a non-interactive logo (`role=img`). Do not look for a `Futrob` link there.
- `Ver cómo funciona` is an in-page `#mecanismo` jump, not a new route. Assert the heading, not only the hash.
- Landing is public. A leftover session must not reveal org admin chrome on `/`.
- Client navigation from a landing CTA can update the URL to `/signup` before the signup accessibility tree paints. If the snapshot still shows the hero, navigate to `/signup` once more and wait for heading `Crea tu cuenta`.
- Browser screenshots may land in a temp path. Copy them into `evidence/<run-id>/landing/` before cleanup.
- The demo search section may call the API. A search failure is not a landing-identity failure unless the hero/CTAs are missing.
