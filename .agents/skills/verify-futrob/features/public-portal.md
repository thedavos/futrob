# Public competition portal

Signed-out visitors open a published competition at `/{organizationSlug}/{competitionKey}` and read its cover, fixtures and results, official table, bracket, teams, rankings and rules. Pages are server-rendered without a session. A draft, archived or registration-only competition, an unknown key and a competition shown under another organization's slug all render the same not-found page with HTTP 404 (ADR-0024).

## Sub-features

- `portal-cover` opens `/{slug}/{key}` with the competition name as the only `h1`, a status badge (`En juego`, `En pausa` or `Finalizada`), the sections `Últimos resultados` and `Próximos enfrentamientos`, and the link `Ver calendario completo`.
- `portal-tabs` is the navigation `Secciones de la competición`: `Portada`, `Calendario y resultados`, `Tabla`, `Bracket` (only for knockout, groups + knockout and league + playoffs), `Equipos`, `Rankings`, `Reglamento`. The current tab has `aria-current="page"`.
- `portal-calendar` opens `/calendar` with one `Jornada N` section per round. An officialized Encounter shows its score (accessible name `Resultado oficial 3–1`) and the badge `Oficial`.
- `portal-no-fixture` shows `El calendario aún no está publicado` on the cover and calendar when the competition has no fixture.
- `portal-standings` opens `/standings`: the official table, or `Aún no hay tabla` before the first projected result.
- `portal-bracket` opens `/bracket`: rounds as lists, bye sides without a score. Before the fixture it shows `Aún no hay cuadro`; a league opened by URL shows `Esta competición no tiene eliminatorias`.
- `portal-teams`, `portal-rules` and `portal-rankings` (`?kind=scorer|assister|rating|mvp|goalkeeper`, navigation `Tipo de ranking`) each have an empty state.
- `portal-not-found` shows `Esta competición no está disponible` and `Ir a Futrob`, with HTTP 404.
- `portal-error` shows `No pudimos cargar esta sección` and `Reintentar` when the API fails (not on a 404).
- `portal-organizer-link` is the button `Ver portal público` on the organizer's competition overview `/orgs/$orgId/competitions/$competitionId`, shown only when the competition is published, paused or finished. It opens the portal in a new tab.

## How to get to it (user POV)

- Open a shared link `/{organizationSlug}/{competitionKey}` signed out. Today the key is the competition id.
- As organizer, open the competition overview and choose `Ver portal público`.
- Inside the portal, use the section tabs, the cover's `Ver calendario completo`, and the ranking kind links.

## Driving it with verify-futrob

Preconditions:

- API on `:8787` against a migrated database that belongs to this run, and web on `:3000`. The portal needs no auth worker and no session; the organizer link does.
- A published competition: `npm run cli -- e2e-golden-path --actor <actorId>` (org → entries → publish → fixture). Read the slug with `npm run cli -- org-profile <orgId>`.
- An officialized result needs the Match Center path (`results-match-center.md`) or EA egress. Without either, say the official-score proof is blocked rather than calling it verified. After approving, `statistics-rebuild` (superuser) or the in-process projection fills the table.

Steps:

- **SSR.** `curl -s -o page.html -w '%{http_code}' http://localhost:3000/<slug>/<competitionId>` returns 200, and `page.html` already contains the competition name and, after officialization, the score. Repeat for `/calendar`, `/standings`, `/bracket`, `/teams`, `/rankings`, `/rules`. `/rankings` must answer 200, not a redirect.
- **No private data.** Search every saved page for the organization id, team ids, actor ids, EA match or club ids and `providerMatchRef`. None may appear.
- **Browser.** Open the cover. Assert the `h1`, the badge and the tabs. Open each tab and take an ARIA snapshot and a screenshot (desktop and 390 px wide). Repeat the cover with JavaScript disabled; the content must still be there.
- **404.** Open `/<otherOrgSlug>/<competitionId>`, `/<slug>/does-not-exist` and a draft of the same organization. Each answers 404 with `Esta competición no está disponible` and no competition name in the HTML.
- **Organizer link.** Signed in as the organizer, open the competition overview. `Ver portal público` points to `/<slug>/<competitionId>`. It is absent on a draft.

## Gotchas

- The tabs and the cover are one TanStack layout route; a 404 from any section read turns the whole portal into the not-found page.
- Times are shown in the competition time zone (`Horarios en <zone>`), not the visitor's.
- Writing an official result straight into the database skips the in-process projections. If you do it to unblock a proof, say so and run `statistics-rebuild`; the table stays empty otherwise.
- Never point the run at the shared Neon database. Check `DATABASE_URL` and both Hyperdrive local connection strings first.
