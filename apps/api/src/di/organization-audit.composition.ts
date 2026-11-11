import { GAME_DATA_AUDIT_SQL } from "@/adapters/game-data/game-data-audit.source.ts";
import { InMemoryProviderSyncJobRepository } from "@/adapters/game-data/jobs/in-memory-provider-sync-job.repository.ts";
import {
  ListOrganizationAuditUseCase,
  type OrganizationAuditEntry,
  type OrganizationAuditReadQuery,
  type OrganizationAuditSourcePort,
} from "@futrob/organizations";
import type {
  AuthorizationPort,
  AuthorizationBatchPort,
  ClockPort,
  IdGeneratorPort,
  TransactionPort,
} from "@futrob/shared-kernel";
import { asCompetitionId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { redactOptionalAuditReason } from "@futrob/results";
import { InMemoryOfficialMatchSelectionRepository } from "@/adapters/results/official-result.repository.ts";
import { InMemoryFixtureAuditPort } from "@/adapters/scheduling/fixture-editing.adapters.ts";
import { InMemorySwissRoundActionLog } from "@/adapters/scheduling/swiss-round-actions.ts";
import { PostgresAuditSource } from "@/adapters/persistence/postgres-audit-source.ts";
import {
  InMemoryOperationAuditRepository,
  PostgresOperationAuditRepository,
} from "@/adapters/organizations/operation-audit.repository.ts";
import { ORGANIZATION_AUDIT_SQL } from "@/adapters/organizations/organization-audit.source.ts";
import { AUTHORIZATION_AUDIT_SQL } from "@/adapters/authorization/authorization-audit.source.ts";
import { COMPETITION_AUDIT_SQL } from "@/adapters/competitions/competition-audit.source.ts";
import { TEAM_AUDIT_SQL } from "@/adapters/teams/team-audit.source.ts";
import { SCHEDULING_AUDIT_SQL } from "@/adapters/scheduling/scheduling-audit.source.ts";
import { ResultsAuditSource } from "@/adapters/results/results-audit.source.ts";
import { BILLING_AUDIT_SQL } from "@/adapters/billing/billing-audit.source.ts";
import { NOTIFICATION_AUDIT_SQL } from "@/adapters/notifications/notification-audit.source.ts";
import {
  UnifiedOrganizationAuditReader,
  filterAuditEntries,
} from "@/application/organizations/unified-organization-audit.reader.ts";
import { auditObjectHref } from "@/application/organizations/audit-object-href.ts";
import type { IdentityModule } from "./identity.module.ts";
import type { OrganizationsModule } from "./organizations.module.ts";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { TeamsModule } from "./teams.module.ts";
import type { SchedulingModule } from "./scheduling.module.ts";
import type { ResultsModule } from "./results.module.ts";
import type { BillingModule } from "./billing.module.ts";
import type { ActivityCommands, NotificationsModule } from "./notifications.module.ts";
import { createAuditCommands } from "./organization-audit.commands.ts";
import type { GameDataModule } from "./game-data.module.ts";

type AuditModules = {
  readonly identity: IdentityModule;
  readonly organizations: OrganizationsModule;
  readonly competitions: CompetitionsModule;
  readonly teams: TeamsModule;
  readonly scheduling: SchedulingModule;
  readonly results: ResultsModule;
  readonly billing: BillingModule;
  readonly notifications: NotificationsModule;
  readonly activityCommands: ActivityCommands;
  readonly gameData: GameDataModule;
};

export function createOrganizationAudit(
  ports: {
    readonly pool: Pool | undefined;
    readonly authorization: AuthorizationPort & AuthorizationBatchPort;
    readonly clock: ClockPort;
    readonly ids: IdGeneratorPort;
    readonly transaction: TransactionPort;
  },
  modules: AuditModules,
) {
  const memoryOperations = new InMemoryOperationAuditRepository();
  const operations = ports.pool
    ? new PostgresOperationAuditRepository(ports.pool)
    : memoryOperations;
  const pool = ports.pool;
  const sources: readonly OrganizationAuditSourcePort[] = pool
    ? [
        ...[
          ORGANIZATION_AUDIT_SQL,
          AUTHORIZATION_AUDIT_SQL,
          COMPETITION_AUDIT_SQL,
          TEAM_AUDIT_SQL,
          SCHEDULING_AUDIT_SQL,
          BILLING_AUDIT_SQL,
          NOTIFICATION_AUDIT_SQL,
          GAME_DATA_AUDIT_SQL,
        ].map((sql) => new PostgresAuditSource(pool, sql)),
        new ResultsAuditSource(pool),
      ]
    : [memoryOperations, { read: (query) => readMemorySources(query, modules) }];
  return {
    list: new ListOrganizationAuditUseCase({
      authorization: ports.authorization,
      competitions: {
        listIdsByOrganization: async (organizationId) =>
          (await modules.competitions.repository.listByOrganization(organizationId)).map(
            (competition) => competition.id,
          ),
      },
      audit: new UnifiedOrganizationAuditReader(sources, modules.identity.contacts),
    }),
    operations,
    commands: createAuditCommands({ ...ports, operations }, modules),
  };
}

async function readMemorySources(query: OrganizationAuditReadQuery, modules: AuditModules) {
  const rows: OrganizationAuditEntry[] = [];
  function add(
    fact: Omit<
      OrganizationAuditEntry,
      "organizationId" | "actorName" | "reason" | "requestId" | "competitionId"
    > &
      Partial<Pick<OrganizationAuditEntry, "reason" | "requestId" | "competitionId">>,
  ) {
    const entry = {
      organizationId: query.organizationId,
      actorName: null,
      reason: null,
      requestId: null,
      competitionId: null,
      ...fact,
    };
    rows.push({ ...entry, object: { ...entry.object, href: auditObjectHref(entry) } });
  }
  const object = (type: string, id: string, label: string | null = null) => ({
    type,
    id,
    label,
    href: null,
  });
  const organization = await modules.organizations.repositories.organizations.getById(
    query.organizationId,
  );
  if (organization)
    add({
      id: `01:organization:${organization.id}`,
      actorId: organization.createdByActorId,
      action: "organizations.created",
      occurredAt: organization.createdAt,
      object: object("organization", organization.id, organization.name),
    });
  for (const row of await modules.organizations.repositories.audit.listByOrganization(
    query.organizationId,
    Number.MAX_SAFE_INTEGER,
  )) {
    add({
      id: `90:authorization:${row.id}`,
      competitionId: row.scopeType === "competition" ? asCompetitionId(row.scopeId) : null,
      actorId: row.actorId,
      action: row.action,
      reason: row.reason,
      occurredAt: row.createdAt,
      object: object("actor", row.targetActorId),
    });
  }
  for (const row of await modules.billing.audit.listForOrganization(
    query.organizationId,
    Number.MAX_SAFE_INTEGER,
  )) {
    add({
      id: `93:billing:${row.id}`,
      actorId: row.changedByActorId,
      action: "billing.plan_changed",
      reason: row.reason,
      occurredAt: row.occurredAt,
      object: object("billing", query.organizationId, row.after.planKey),
    });
  }
  const competitions = await modules.competitions.repository.listByOrganization(
    query.organizationId,
  );
  const teams =
    (await modules.teams.repositories.teams.listByOrganization?.(query.organizationId)) ?? [];
  for (const team of teams)
    add({
      id: `03:team:${team.id}`,
      actorId: team.createdByActorId,
      action: "teams.created",
      occurredAt: team.createdAt,
      object: object("team", team.id, team.name),
    });
  for (const competition of competitions) {
    add({
      id: `02:competition:${competition.id}`,
      competitionId: competition.id,
      actorId: competition.createdByActorId,
      action: "competitions.created",
      occurredAt: competition.createdAt,
      object: object("competition", competition.id, competition.name),
    });
    for (const sanction of await modules.competitions.sanctionRepository.listByCompetition(
      query.organizationId,
      competition.id,
    )) {
      add({
        id: `91:sanction:${sanction.id}`,
        competitionId: competition.id,
        actorId: sanction.imposedByActorId,
        action: "sanctions.imposed",
        reason: sanction.reason,
        occurredAt: sanction.imposedAt,
        requestId: sanction.requestId,
        object: object("sanction", sanction.id),
      });
      if (sanction.revocation)
        add({
          id: `92:sanction:${sanction.id}`,
          competitionId: competition.id,
          actorId: sanction.revocation.actorId,
          action: "sanctions.revoked",
          reason: sanction.revocation.reason,
          occurredAt: sanction.revocation.at,
          requestId: sanction.revocation.requestId,
          object: object("sanction", sanction.id),
        });
    }
  }
  const selections = modules.results.selections;
  if (selections instanceof InMemoryOfficialMatchSelectionRepository)
    selections.actions.forEach((row, index) => {
      if (row.organizationId === query.organizationId)
        add({
          id: `70:result:${String(index + 1).padStart(20, "0")}:${row.id}`,
          competitionId: row.competitionId,
          actorId: row.actorId,
          action: `results.${row.type}`,
          reason: redactOptionalAuditReason(row.reason),
          occurredAt: row.occurredAt,
          requestId: row.commandKey,
          object: object("encounter", row.encounterId),
        });
    });
  const edits = modules.scheduling.fixtureAudit;
  if (edits instanceof InMemoryFixtureAuditPort)
    edits.rows.forEach((row, index) => {
      if (row.organizationId === query.organizationId)
        add({
          id: `61:fixture-edit:${String(index + 1).padStart(20, "0")}`,
          competitionId: row.competitionId,
          actorId: row.actorId,
          action: "scheduling.encounter_edited",
          reason: row.reason,
          occurredAt: row.occurredAt,
          requestId: row.requestId,
          object: object("encounter", row.encounterId),
        });
    });
  const swiss = modules.scheduling.swissActions;
  if (swiss instanceof InMemorySwissRoundActionLog)
    swiss.rows.forEach((row, index) => {
      if (row.organizationId === query.organizationId)
        add({
          id: `62:swiss:${index}`,
          competitionId: row.competitionId,
          actorId: row.actorId,
          action: row.kind === "withdraw" ? "scheduling.team_withdrawn" : "scheduling.round_closed",
          reason: row.reason,
          occurredAt: row.occurredAt,
          requestId: row.requestId,
          object:
            row.kind === "withdraw"
              ? object("team", row.teamId)
              : object("fixture", row.fixturePlanId),
        });
    });
  for (const row of await modules.notifications.activities.list({
    audiences: [{ audience: "organization", audienceId: query.organizationId }],
    organizationId: query.organizationId,
    limit: Number.MAX_SAFE_INTEGER,
    now: new Date(0),
  })) {
    if (row.kind === "competition_published")
      add({
        id: `06:publication:${row.id}`,
        competitionId: row.competitionId,
        actorId: row.actorId,
        action: "competitions.published",
        occurredAt: row.openedAt,
        object: object("competition", row.resourceId, row.subject.competitionName),
      });
    if (row.kind === "competition_entry")
      add({
        id: `04:entry:${row.sourceId}`,
        competitionId: row.competitionId,
        actorId: row.actorId,
        action: "competitions.entry_registered",
        occurredAt: row.openedAt,
        object: object("competition", row.resourceId, row.subject.teamName ?? null),
      });
    if (
      row.kind === "organizer_decision" &&
      (row.subject.outcome === "entry_approved" || row.subject.outcome === "entry_rejected")
    )
      add({
        id: `05:entry-decision:${row.sourceId}`,
        competitionId: row.competitionId,
        actorId: row.actorId,
        action: `competitions.${row.subject.outcome}`,
        occurredAt: row.openedAt,
        object: object("competition", row.resourceId, row.subject.teamName ?? null),
      });
  }
  const jobs = modules.gameData.jobs;
  if (jobs instanceof InMemoryProviderSyncJobRepository)
    for (const job of jobs.auditSnapshot(query.organizationId)) {
      add({
        id: `07:sync-queued:${job.id}`,
        actorId: null,
        action: "game_data.sync_queued",
        occurredAt: job.createdAt,
        requestId: job.requestId,
        object: object("sync_job", job.id),
      });
      if (job.status === "succeeded")
        add({
          id: `08:sync-completed:${job.id}`,
          actorId: null,
          action: "game_data.sync_completed",
          occurredAt: job.completedAt,
          requestId: job.requestId,
          object: object("sync_job", job.id),
        });
    }
  return filterAuditEntries(rows, query);
}
