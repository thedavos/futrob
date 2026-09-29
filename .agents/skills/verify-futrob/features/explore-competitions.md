# Explore competitions

Authenticated players browse published competitions across organizations, filter the catalog in the URL, open a minimal detail, and share that URL. Drafts stay hidden. Self-registration is out of scope.

## Sub-features

- `explore-list` opens `/player/competitions/explore` with heading `Explorar competiciones`.
- `explore-filters` keeps `q`, `format`, `status`, `region`, `platform` and `sort` in the URL.
- `explore-empty-filtered` shows `No encontramos competiciones` and `Limpiar búsqueda y filtros` when filters hide every row.
- `explore-empty-none` shows `Aún no hay competiciones publicadas` when the catalog is empty without filters.
- `explore-detail` opens `/player/competitions/$competitionId` from `Ver competición`.
- `explore-share` copies that detail URL and shows `Enlace copiado` on the card.

## How to get to it (user POV)

- Complete player onboarding, then open `/player/competitions` and choose `Explorar competiciones`.
- Open `/player/competitions/explore` directly.
- From a card, choose `Ver competición` or share the detail URL.

## Driving it with verify-futrob

Preconditions:

- Signed-in actor with **completed** player onboarding.
- `helpers/verify-futrob doctor` exits 0.
- At least one published competition exists if the ready list is the proof target. Publish requires two approved entries (`npm run cli -- e2e-golden-path` then `comp-explore`).

- **Workspace entry.** Open `/player/competitions`. Choose `Explorar competiciones`. The URL is `/player/competitions/explore`. The heading is `Explorar competiciones`.
- **Ready or empty.** If items exist, the status region names the count (`N competiciones`). Each card has `Ver competición` and `Compartir competición`. If none exist and the URL has no filters, the empty title is `Aún no hay competiciones publicadas`.
- **Filtered empty (only if you can force no matches).** Set `?q=zzzzzzzz`. The empty title is `No encontramos competiciones`. Choose `Limpiar búsqueda y filtros`. The search box is empty and `q` leaves the URL.
- **Detail.** From a card, choose `Ver competición`. The URL is `/player/competitions/<id>`. The heading is the competition name. An unknown or draft id shows `Competición no disponible`.
- **API twin.** `npm run cli -- e2e-golden-path --actor <id>` then `npm run cli -- comp-explore --actor <id> --json`. The published id appears. `comp-explore-show <id>` returns the same name.
- **Proof.** Screenshot + ARIA of the explore list or the applicable empty state, plus the detail heading or not-found state.

## Gotchas

- This catalog is authenticated. It is not the public portal.
- `draft` and `archived` never appear, even with a guessed id.
- `Gestionar` appears only for organizer/staff of the owning organization. `Tu equipo participa` is presentational; the manage route still authorizes.
- There is no toast system. Share confirmation stays on the card or detail header.
