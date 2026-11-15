# Organization and competition audit

An organizer reads who acted, what changed, when and why from organization settings or the competition audit tab. The read-only timeline combines existing owner histories and new operational facts without rewriting historical records (ADR-0029). Entries belong to one organization and can link to the affected object.

## Sub-features

- `audit-organization` is `Auditoría` under organization settings, with table `Historial de auditoría` and columns `Fecha`, `Actor`, `Acción`, `Motivo`, `Objeto afectado`.
- `audit-competition` is the competition `Auditoría` tab. It fixes the competition scope and offers `Resumen` to return.
- `audit-filters` offers `Competición` on the organization page, `Actor`, `Acción`, `Desde (UTC)` and `Hasta (UTC)`. `Aplicar filtros` restarts pagination. `Quitar filtros` restores the unfiltered timeline.
- `audit-pagination` uses `Anterior` and `Siguiente`, newest first. Filters apply before pagination and remain active across pages.
- `audit-states` distinguishes `Sin actividad registrada`, `Sin resultados con estos filtros`, loading, retryable failure and `Auditoría no disponible`.
- `audit-permission` needs `organizations.audit.read`. Organizers receive it by default; staff needs a grant. Players and captains do not receive it by default. API authorization is independent of navigation visibility.

## How to get to it (user POV)

- Organization sidebar `Auditoría`, or `Ajustes` then `Auditoría`, at `/orgs/$orgId/settings/audit`.
- Competition sidebar or `Auditoría` tab on `Resumen`, at `/orgs/$orgId/competitions/$competitionId/audit`.
- SDK `client.audit.list(organizationId, filters)` and BFF `GET /api/v1/organizations/$organizationId/audit`.
- CLI `audit-list <orgId>` and `audit-smoke <orgId> --outsider <actorId>`.

## Driving it with verify-futrob

Preconditions are a doctor-ready stack with local migrated Postgres, a signed-in organizer with a competition, a captain/player without an audit grant and a second organization. Retain real auth sessions; never mock Better Auth or the BFF.

1. Open organization `Ajustes` and follow `Auditoría`. Capture the action, URL, table and actor/reason/object content.
2. Filter `Acción` to `sanctions.imposed` or another existing action. Apply, reload the read through the BFF and compare its entries to the table. Use a nonexistent actor to see filtered-empty; `Quitar filtros` restores rows.
3. Apply `Desde (UTC)` later than `Hasta (UTC)`. Read the validation message and confirm no request changed the applied timeline.
4. With more than 25 entries, use `Siguiente` then `Anterior`. Confirm no duplicates, descending dates and preserved filters. Change filters and confirm `Anterior` becomes disabled.
5. Open the competition summary and its `Auditoría` tab. Check that the competition filter is fixed and every returned row belongs to it. Follow an affected-object link and return to the timeline.
6. As the captain/player, open each direct URL. Read `Auditoría no disponible`; direct GET to its BFF returns 403. The organizer cannot read another organization's entries.
7. Run `npm run cli -- audit-smoke <orgId> --outsider <actorId> --actor <organizer> --json` and the same command with `--competition <id>`. Retain command, output and exit code.
8. POST, PATCH and DELETE against the audit collection and an entry do not expose mutation operations. A subsequent GET retains the same history.

Capture ARIA snapshots and screenshots for navigation, populated, filtered-empty and denied states, including a narrow viewport. Record the feature id and entry point in the evidence run notes. Unit/contract tests cover simulated loading and service errors separately from live proof.

## Gotchas

- Older records can lack actor, reason or correlation. The viewer displays missing values honestly and does not infer an actor from current membership.
- Dates in filters cover whole UTC days. Rows display the viewer's locale and browser timezone.
- A cursor belongs to its organization and filters; changing either requires restarting pagination.
- The endpoint offers only GET. Revoke a sanction or change roles from their owning screens; audit entries themselves are immutable.
- Native screens and the public portal are outside this web viewer task. The shared SDK can read the same contract.
