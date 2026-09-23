---
name: futrob-hexagonal-module
description: Implement or refactor Futrob bounded contexts, use cases, ports, app adapters and product API boundaries. Use for business behavior, persistence or cross-context integration; pure UI composition uses the design skills.
---

# Futrob hexagonal modules

Deliver the smallest complete change in the context that owns the behavior. Extend an
existing module unless the capability has a distinct vocabulary and responsibility.
A new use case does not automatically require a new port, endpoint or bounded context.

## Establish ownership

Read the relevant requirement and acceptance criteria in `product/`, then consult
[architecture overview](../../../docs/architecture/overview.md),
[module boundaries](../../../docs/architecture/module-boundaries.md) and
[dependency graph](../../../docs/architecture/dependency-graph.md).
For changes to architectural decisions or discrepancies between code and ADRs, use
[futrob-adr](../futrob-adr/SKILL.md) to consult the index, follow successors and classify
the impact. A use case that follows an existing decision does not need another ADR.
Inspect the current use case, port, adapter, DI and tests nearest to the request.
The documents describe both implemented behavior and targets; verify the actual wiring.

Keep these responsibilities separate:

| Context | Owns the decision |
| --- | --- |
| scheduling | When an Encounter happens and which official slots it needs |
| game-data | What providers report; normalized observations and sync |
| results | Which matches count, confirmation, disputes and approval |
| statistics | Projections of approved results; preserve separately defined personal/provider views |
| analytics | Interpretation and analytical snapshots |

Use the module-boundaries document for identity, organizations, competitions, teams,
notifications and public-portal ownership. Billing remains outside the MVP.

When adding a use case, a bridge or an official-result effect, read the matching
[worked example](references/examples.md). The examples link to executable code and
explain what to reuse; they are not templates to copy wholesale.

## Place the change

| Concern | Owner / location |
| --- | --- |
| Entities, policies, business errors and domain-specific ports | `packages/<bc>/src/domain/` |
| Use-case orchestration and input/output types | `packages/<bc>/src/application/<use-case>/` |
| Public package contract | `packages/<bc>/src/index.ts` |
| Product persistence, provider I/O and bridges | `apps/api/src/adapters/<bc>/` |
| Product construction and cross-context composition | `apps/api/src/di/` |
| HTTP parsing and response mapping | `apps/api/src/http/` |
| Shared wire schemas and client methods | `packages/api-contracts`, `packages/sdk` |
| Web BFF and presentation | `apps/web/src/modules/<context>/{server,presentation}/` and existing routes |
| Auth/session authority and D1 migration history | `apps/auth` |
| Native presentation | `apps/mobile`, consuming the SDK and shared tokens |

Domain/application stay independent of React, Zod, persistence clients, fetch, Worker
bindings and Sentry. Application code uses ports; DI supplies concrete adapters.
Export the intended use cases/types/ports, not adapters or database schemas.

Use public package imports for declared cross-context dependencies. Reader ports can
refer to existing public domain contracts where the dependency graph permits it; do
not deep-import another context's internals or couple domain code to its application
implementation. Keep web/native presentation on view models and HTTP contracts.

EA network calls belong in `apps/api/src/adapters/game-data/ea-clubs/`; provider schemas
and pure mappers live in `@futrob/ea-clubs`. Other contexts use neutral vocabulary such
as `ProviderMatch`, not EA payloads. Web reaches EA data through the product API.

## Implement the behavior

1. **Define the observable outcome.** Identify the owner, trusted actor, scope, inputs,
   expected failures and state changes. For a narrow fix, preserve existing public
   contracts unless the requested behavior requires changing them.
2. **Reuse contracts before adding ports.** Search the owning BC and shared-kernel.
   Reuse `ClockPort`, `IdGeneratorPort`, `TransactionPort`, `EventPublisherPort` and
   `AuthorizationPort` where semantics match. Domain-specific reader/repository ports
   stay with their owner. Add operations for a concrete use-case need, not a generic CRUD layer.
3. **Implement policy and orchestration.** Put business invariants in domain policies
   and orchestration in the use case. Follow neighboring constructor/input conventions.
   Inject clock/IDs where deterministic; reuse shared time helpers from
   `packages/shared-kernel/src/time.ts` for offsets and ordering.
4. **Enforce access and ownership.** Protected product operations receive a trusted
   `ActorId` and enforce capabilities via the existing authorization contract and BC
   permission constants. Validate the organization → competition → team/encounter
   relationship where applicable. Tenant reads/writes remain organization-scoped;
   personal actor-owned data follows its own ownership boundary. UI visibility and
   Postgres RLS are not substitutes for application authorization.
5. **Represent expected failure explicitly.** Use the owning `TaggedError` classes
   and the existing `Result` convention. Keep stable typed `code` and structured props;
   use [ADR-0011](../../../docs/adr/0011-tagged-errors.md). Validation/HTTP/auth errors
   belong at their boundaries; `Panic` denotes a defect and is not wrapped in `Result.err`.
6. **Wire only the changed boundaries.** Export the public use case, implement required
   adapters and compose them in the existing API module factory. When HTTP changes,
   update wire schemas, mapper, handler, SDK and affected BFF/native consumers. Parse
   input at the boundary and preserve safe error mapping; routes do not own business rules.
7. **Handle effects deliberately.** Cross-context reads use public contracts through
   ports/bridges. Writes remain with the owning context. Reuse transaction/idempotency
   semantics and verify rollback behavior: returning an error value is not necessarily
   a rollback signal. For events, inspect the publisher, persistence and consumer before
   claiming delivery. See the official-result example for the current implementation.

Product persistence belongs to the API (Postgres, or process-local memory without
`DATABASE_URL`). D1 owns auth/actors and BFF rate limits. For a schema change, use the
[database-change workflow](../../commands/database-change.md) and the owning migrations.

## Verify the changed contract

Select checks by the boundaries changed:

- Domain/application: success, relevant expected failures, denied capabilities and
  ownership isolation using fake ports. Check deterministic time/IDs when observable.
- Persistence/bridges: mapping, tenant scope and the real adapter contract; include
  rollback and replay/concurrency checks when the change depends on those guarantees.
- HTTP/SDK: parsing, trusted identity, safe failure mapping and wire compatibility.
- Official results: approval gating and the existing transactional projection path.
  Sync alone must never officialize or update official competitive projections.

Use `vite-plus/test` and current workspace test scripts; consult `.cursor/rules/testing.mdc`.
Run relevant tests, `npm run check` and affected typechecks. For domain/API smoke tests,
use [futrob-cli](../futrob-cli/SKILL.md). Live UI proof belongs to
[verify-futrob](../verify-futrob/SKILL.md), not an in-memory unit test.

Update module boundaries/dependency graph only when ownership or dependencies change;
record material architectural decisions in an ADR. Keep the event catalog aligned
when changing event contracts, without importing app code into BC packages.

Finish with the behavior changed, owning context, boundaries touched and checks run.
Identify blocked integrations or delivery gaps explicitly. A fake adapter passing is
not evidence that Postgres, Workers, EA or durable events work end to end.
