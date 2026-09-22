# Worked examples from Futrob

Read the example that matches the change. Paths are links to the current source;
inspect that source before adapting the pattern. These examples explain boundaries,
not a requirement to reproduce every file or convention of an existing feature.

## 1. Add behavior inside an existing context

Request: “Allow an organizer to create a team idempotently.”

Ownership is `teams`: creating a team is neither competition registration nor roster
membership. Trace the existing implementation:

1. [CreateTeamUseCase](../../../../packages/teams/src/application/create-team/create-team.use-case.ts)
   receives the trusted actor and organization plus business inputs. Its dependencies
   are a repository, authorization, clock and ID generator.
2. [TeamRepository](../../../../packages/teams/src/domain/ports/team.repository.ts)
   describes persistence needs without mentioning SQL. Reuse it when semantics match.
3. [Team errors](../../../../packages/teams/src/domain/errors/team.errors.ts) define
   typed expected outcomes. The authorization helper uses the context's permission
   constant and returns a typed forbidden outcome.
4. [Teams DI](../../../../apps/api/src/di/teams.module.ts) provides implementations.
   [HTTP routes](../../../../apps/api/src/http/routes/teams.ts) parse wire input, pass
   the middleware actor to the use case and map its result to a validated response.
5. [Use-case tests](../../../../packages/teams/src/application/team-roster.use-cases.test.ts)
   demonstrate fake ports and idempotent team creation. Inspect the API adapter and
   persistence tests separately before claiming concurrent requests are deduplicated.

A shortened outline of the current sequence (not standalone implementation code):

```text
check teams.create for actor + organization
→ validate team name
→ look up creationKey when present
→ reject an existing key owned by another organization
→ return an existing team for a valid replay
→ create with injected ID/time and save
```

The current creation-key lookup is global. Its explicit ownership check matters;
copying the lookup without that check would leak another organization's result.
A read-before-write in memory alone does not guarantee concurrency safety in Postgres.

The existing business error syntax is:

```ts
import { TaggedError } from "@futrob/shared-kernel";

export class InvalidTeamName extends TaggedError("InvalidTeamName")<{
  code: "teams.invalid_name";
  message: string;
}> {}
```

Reuse this exported error when applicable instead of declaring it again. Expected
business failure can return `err(new InvalidTeamName({ code: "teams.invalid_name",
message: "Invalid team name" }))`; the HTTP boundary maps it and UI localizes its code.

## 2. Read another context through a bridge

Request: “Show provider matches that could fill an Encounter's official slots.”

Candidate selection belongs to `results`; provider observations belong to `game-data`.
Scheduling provides the Encounter context. Reuse the existing contract:

```text
results use case
  → ProviderMatchReaderPort (consumer-owned contract)
  → RepositoryProviderMatchReader (API adapter)
  → public game-data / teams ports supplied by API DI
```

- [ProviderMatchReaderPort](../../../../packages/results/src/domain/ports/provider-match-reader.port.ts)
  defines the query and `ready`, `clubs_not_connected`, `provider_mismatch` outcomes.
  It uses public `@futrob/game-data` types; this is an existing declared dependency,
  not permission to import internal provider adapters.
- [Bridges](../../../../apps/api/src/adapters/results/bridges.ts) implement the contract
  with public repository ports. They map the data to the consumer's needs without
  querying foreign tables directly from `results` or reaching EA HTTP from a use case.
- [Results DI](../../../../apps/api/src/di/results.module.ts) injects the reader into
  the relevant use cases. [Bridge tests](../../../../apps/api/src/adapters/results/bridges.test.ts)
  and [scheduling-reader tests](../../../../apps/api/src/adapters/results/scheduling-encounter-reader.test.ts)
  exercise the mappings.

Choose a consumer-owned port when the consumer needs a specific vocabulary or read
shape. Reuse an existing public contract when it already means exactly the same thing.
Do not introduce a general-purpose shared reader merely because two contexts both read data.

Verify missing links, provider mismatch, relevant candidate boundaries and scope.
The existence of a bridge does not itself authorize an actor; trace the calling use
case and its authorization decision too.

## 3. Change official-result projection safely

Request: “Update standings when an official selection is confirmed.”

Inspect [create-modules.ts](../../../../apps/api/src/di/create-modules.ts),
[confirmation](../../../../packages/results/src/application/confirm-official-selection/confirm-official-selection.use-case.ts)
and [the transaction adapter](../../../../apps/api/src/adapters/persistence/pg-transaction.ts).

The current API composes the operation as:

```text
transaction.runInTransaction
  → encounter mutation lock
  → results.confirmOfficialSelection.execute
  → return the expected failure if confirmation fails
  → statistics.projectOfficialResult.execute for the confirmed result
  → throw a projection failure to trigger rollback
  → return the confirmed result
```

`TransactionPort.runInTransaction<T>` returns the callback value. A `Result.err` is
still a returned value; inspect the adapter before assuming it rolls back. The current
composition throws a projection failure after confirmation so it cannot commit a
result while losing its statistics update. Preserve the adapter's behavior and
boundary error handling rather than copying a generic transaction wrapper.

The same composition file currently installs `NoopEventPublisher`. The event
`results.official-result-approved` expresses the approval transition, but emitting it
is not evidence of persisted outbox delivery or a running consumer. Keep official
statistics behind approval and the actual projection path. The provider sync Queue
is a separate integration, not the domain outbox.

If the task explicitly introduces durable events, trace persistence, commit ordering,
consumer wiring and replay handling as part of that change. Do not silently replace
the existing transaction with an unconnected publish call.

Verify approval gating, projection failure/rollback and replay behavior at the relevant
use-case and adapter boundaries. Tests must distinguish in-memory behavior from a
real database transaction. [Transaction tests](../../../../apps/api/src/adapters/persistence/pg-transaction.test.ts)
are a starting reference, not proof of every cross-context atomicity guarantee.
