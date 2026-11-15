# FEED-01 verification, 2026-11-10

Baseline is fetched `origin/main` at `db66feb67f2296e77a8f89347b51a097c09ead26`. The branch is `feat/feed-01-activity-feed-verification`. The card is [FEED-01](https://app.notion.com/p/4147b204009a81679c69f8ee31fedfb3).

This run used its own `futrob-feed01-postgres` Docker container at `127.0.0.1:55432/futrob_feed01`. The configured shared Neon database was not migrated, seeded, reset, or mutated. All migrations and the existing demo seed ran locally. Env files and auth state are excluded from the PR.

## Actions and audiences

The [reproducible recipe](../../features/activity-feed.md) names entry points and prerequisites. The [SDK driver](../../helpers/feed-01-live.mjs) uses public SDK methods and read-only SQL to discover demo IDs. Its SQL never sets domain state. Run mutating modes against a fresh seed. `readback` checks the completed run without recreating it.

| Feature | Entry and observed result | Evidence |
| --- | --- | --- |
| `feed-actions` publication | CLI golden path publishes and creates a fixture. Publication is one closed, non-actionable organization row. Repeating publish returns 409 and keeps that row. | [CLI](cli.log), [final readback](sdk-readback.log) |
| `feed-actions` selection | Propose creates one actionable rival row and one organization watch row. Proposer has no rival action. Confirm closes the row. Keyed retries keep row IDs and produce no duplicate. | [Selection actions](sdk-selections.log) |
| `feed-actions` dispute | Open and replay produce one operator action. Review preserves it. Resolution closes it, and the closed history survives replay. | [Dispute actions](sdk-selections.log), [final readback](sdk-readback.log) |
| `feed-actions` roster invitation | Registered game identifier resolves the directed invitee. Only that actor gets the action, with an organization watch row. Decline closes it. | [Invitation actions](sdk-invitations.log), [final readback](sdk-readback.log) |
| `feed-actions` reschedule | Create, counter, and accept use the default-clock API. Counter closes the earlier proposal and moves the action to the other team. Acceptance applies the schedule and closes both sides. All keyed replays preserve their outcome. | [Negotiation](sdk-reschedules.log) |
| `feed-actions` expiry and organizer decision | Real HTTP routes and Postgres use an injected ClockPort advanced past the proposal deadline. Expiry closes the team proposal and opens an operator escalation. Resolution closes it and records closed `schedule_kept` decisions for organization and both teams. | [Controlled-clock expiry](sdk-expiry.log) |
| `feed-actions` registrations | CLI self-service applications create operator Pending rows. Approval and rejection close them and create one closed decision for the organization and applicant team. Applicant readback preserves the actual status. Repeated rejection returns 409 without adding rows. | [CLI applications and decisions](sdk-applications.log), [other registration decisions](sdk-registrations.log), [final readback](sdk-readback.log) |
| `feed-actions` isolation | EffectiveAccess and feed reads cover superuser, organizer, competition staff, captain, vice-captain, player, spectator, and another organization's operator. Only superuser and the owning organizer read this organization feed. Personal responses contain no organization-audience rows. | [Access and pagination](sdk-access.log) |

The expiry clock also processes other demo requests due at that controlled time. This leaves some future timestamps in this disposable dataset, visible in subsequent browser captures. That is a property of the controlled-clock fixture. The default-clock API was not advanced. This proves the expiry HTTP integration, not elapsed wall-clock execution or the deployed scheduler. EA observations came from the demo seed's provider boundary. Live EA egress remains unverified.

## Browser entry points

Screenshots have matching ARIA snapshots beside them. Real web sign-in was exercised. The final denied and personal deep-link contexts were prepared through the real web auth endpoint, without mocked auth or BFF responses.

| Feature | Action and result | Capture |
| --- | --- | --- |
| `feed-organization` | Login → organization home. Exactly 10 recent rows and the full-feed CTA. | [Home](organization-home.png) |
| `feed-organization` | CTA → activity. First page contains 25 rows. Load more adds the next page. | [First page](organization-full-first.png), [next page](organization-full-more.png) |
| `feed-player` | Home had no activity section before the fix. The completed home has 10 rows and a CTA to the personal feed. | [Before](player-home-before.png), [after](player-home-after.png) |
| `feed-player` | Personal CTA opens `/player/activity`, with personal copy and team rows. | [Full feed](player-full-after.png) |
| `feed-player` | Spectator opens the personal activity deep link with no audience rows. | [Empty](player-empty.png) |
| `feed-organization` denied | An ordinary organization member opens the organization's activity deep link and sees permission denial. | [Denied](organization-denied.png) |
| `feed-pending` | Public SDK preference setup selects `pending-queue`; login then shows the chosen layout with operator disputes, entries, and escalations. | [Organization Pending](org-pro-pending.png), [preference readback](sdk-preferences.log) |
| `feed-pending` | Captain login shows the personal Pending action for the rival's selection. | [Player Pending](capitan-visita-pending.png) |
| `feed-actions` reverse read | Rejected applicant clicks the decision row. Before, Partidos displayed unavailable. After, competition detail displays `Solicitud rechazada`. | [Before](rejection-link-before.png), [after](rejection-link-after.png) |

[Browser output](browser.log) records completed entry checks and sidebar contents. Some earlier automation attempts used incorrect labels, captured data before query completion, or timed out during rapid navigation and repeated logins. Those attempts are not counted as passing evidence. Final captures await the relevant visible state. The local auth service binding also initially failed because Wrangler and Miniflare chose different registry directories. The owned launch used both `CLOUDFLARE_DEV_REGISTRY_PATH` and `WRANGLER_REGISTRY_PATH` set to the same private temporary directory. Login and authenticated BFF reads passed afterward.

## Bugs fixed and test evidence

| Defect | Failing before | Passing after |
| --- | --- | --- |
| Rejection remained pending in Postgres, leaving its activity open. | [Postgres regression](rejection-red.log) | [Same regression](rejection-green.log), live applicant and activity readbacks |
| Player home and full activity views were absent. | [Behavioral regression](player-red.log) | [Notification tests](player-green.log), browser home and full screen |
| Rejected-registration activity linked to inaccessible matches. | [Destination regression](rejection-link-red.log), before screenshot | [Destination and notification tests](rejection-link-green.log), readable rejection screenshot |

The final notification suite has 19 passing tests. The earlier 18-test log predates the destination regression. Activity Storybook has 19 passing stories. The [Postgres/API run](api-checks.log) passes 1,187 tests across nine files, including existing activity adapter/migration tests, schedule negotiation/expiry integration, the RBAC matrix, and route coverage. [CLI results smoke](results-smoke.log) is offline proof only.

[Repo check](check-final.log), [API typecheck](api-typecheck-final.log), [web typecheck](web-typecheck-final.log), [build](build.log), and [bundle budget](bundle-budget.log) are separate from live evidence. No HTTP contract changed, so OpenAPI regeneration is not applicable. No UI token changed, so token CSS generation is not applicable.

## Surface checklist and remaining scope

- **Clients.** Web now has both feeds. Shared wire/client behavior remains in existing `@futrob/sdk` methods. Native activity reads remain MOB-06 and are unverified here.
- **Contract.** Existing `/api/v1` schemas, SDK, BFF routes, and OpenAPI are reused. Route coverage passed. No new API contract or persistence schema.
- **Access.** Existing EffectiveAccess permission `encounters.results.approve` governs organization reads. Live role reads and member denial passed. The existing full RBAC matrix also passed.
- **Entry points.** Organization home CTA, personal home CTA, activity deep links, row destinations, both Pending layouts, and existing CLI commands are covered. Public SDK fills documented CLI gaps. Email and native deep links are outside this delivery.
- **Reverse states.** Confirmation, dispute resolution, invitation decline, counterproposal, acceptance, expiry escalation/resolution, and registration decisions have readbacks. Closed facts remain in history and leave Pending. Rejected applicants can read their decision destination. Native revoke/cancel policies are unchanged.
- **States.** Filled, paginated, empty, and denied states have live captures. Loading and error/retry states are covered by the component tests and Storybook. No filter controls were introduced, so filtered-empty is not applicable.
- **Docs.** Plan, ADR-0008, ADR-0019 and its index, feature map, and demo-seed README are updated. T9 is complete for these defined checks. Filters remain deferred web follow-up. MOB-06 owns native reads. MAIL-01 owns token invitation policy/revocation and email/outbox. No implementation from those cards is included.

## Review and principles

An independent read-only review found no product correctness defect in the fixes. Its requested driver safeguards are present: unknown modes fail and successful modes emit a completion marker. The review used the available inherited model; a different model family was unavailable in this session.

Prove It Works led to live audience and status readbacks. Test Behavior, Not Implementation led to a durable applicant-state regression. Model the Domain led to one discriminated organization/personal feed source. Build the Lever produced the retained SDK driver. Sequence Work into Verifiable Units kept red/green evidence per defect. Type System Discipline kept source variants and route destinations typed.

The decision trail is [decisions.tsv](decisions.tsv). Cleanup results are recorded in `cleanup.log`. Evidence survives cleanup.

## Resumed verification

The resumed run fetched `origin/main` and confirmed the same baseline. No work was discarded.
Fresh [Postgres/API tests](api-checks-final.log) pass all 1,187 tests across nine files.
Fresh [web notification tests](web-tests-final.log) pass all 19 tests across three files.
Both affected typechecks, the [offline results smoke](results-smoke-final.log), and
[final SDK readback](readback-final.log) pass. The [doctor](doctor-resumed.log) confirms
the owned web, API, auth, and local Postgres before readback. Build, bundle budget, and
Storybook evidence above were retained from the same product diff.

The final source review found no remaining FEED-01 acceptance gap. ADR-0019 and the
ADR index now describe the verified registration activity instead of marking it absent.
The plan clarifies that competition-scoped staff cannot read the entire organization feed.
The retained evidence and helper were scanned against configured secret values and token
patterns with no matches. No environment files or auth storage state are included.

The owned verification web/API/auth launch was stopped. All three ports are free.
The isolated database container was stopped with its data retained. Evidence remains on disk
and is included in the PR. Native activity, email, live EA egress, and the deployed expiry
scheduler remain unverified and outside this card.
