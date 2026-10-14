import { randomBytes } from "node:crypto";
import {
  ENTRY_INVITATION_CHANNEL,
  ENTRY_INVITATION_STATUS,
  type EntryInvitation,
  type EntryInvitationChannel,
  type EntryInvitationCodePort,
  type EntryInvitationRepository,
  type EntryInvitationStatus,
} from "@futrob/competitions";
import {
  Panic,
  TIME_SORT_DIRECTION,
  asActorId,
  asCompetitionId,
  asOrganizationId,
  compareByTime,
  type ActorId,
  type CompetitionId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

/** 9 random bytes → 12 base64url characters (72 bits): short enough to share, unguessable. */
export class RandomEntryInvitationCodePort implements EntryInvitationCodePort {
  generateCode(): string {
    return randomBytes(9).toString("base64url");
  }
}

const newestFirst = compareByTime<EntryInvitation>(
  (invitation) => invitation.createdAt,
  TIME_SORT_DIRECTION.desc,
);

export class InMemoryEntryInvitationRepository implements EntryInvitationRepository {
  readonly rows = new Map<string, EntryInvitation>();

  async create(invitation: EntryInvitation): Promise<EntryInvitation> {
    this.rows.set(invitation.id, invitation);
    return invitation;
  }

  async findById(invitationId: string): Promise<EntryInvitation | null> {
    return this.rows.get(invitationId) ?? null;
  }

  async findLinkByCode(code: string): Promise<EntryInvitation | null> {
    return this.all().find((row) => row.code === code) ?? null;
  }

  async findActiveLink(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<EntryInvitation | null> {
    return (
      this.all().find(
        (row) =>
          row.organizationId === organizationId &&
          row.competitionId === competitionId &&
          row.channel === ENTRY_INVITATION_CHANNEL.link &&
          row.status === ENTRY_INVITATION_STATUS.pending,
      ) ?? null
    );
  }

  async findPendingDirected(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    inviteeActorId: ActorId,
  ): Promise<EntryInvitation | null> {
    return (
      this.all().find(
        (row) =>
          row.organizationId === organizationId &&
          row.competitionId === competitionId &&
          row.inviteeActorId === inviteeActorId &&
          row.status === ENTRY_INVITATION_STATUS.pending,
      ) ?? null
    );
  }

  async listDirectedByCompetition(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<readonly EntryInvitation[]> {
    return this.all()
      .filter(
        (row) =>
          row.organizationId === organizationId &&
          row.competitionId === competitionId &&
          row.channel === ENTRY_INVITATION_CHANNEL.directed,
      )
      .sort(newestFirst);
  }

  async listByInvitee(inviteeActorId: ActorId): Promise<readonly EntryInvitation[]> {
    return this.all()
      .filter((row) => row.inviteeActorId === inviteeActorId)
      .sort(newestFirst);
  }

  async updatePending(next: EntryInvitation): Promise<EntryInvitation | null> {
    if (this.rows.get(next.id)?.status !== ENTRY_INVITATION_STATUS.pending) return null;
    this.rows.set(next.id, next);
    return next;
  }

  private all(): EntryInvitation[] {
    return [...this.rows.values()];
  }
}

const COLUMNS = `id, organization_id, competition_id, channel, invitee_actor_id, invitee_label,
  code, message, status, invited_by_actor_id, created_at, expires_at, responded_at,
  accepted_entry_id`;

interface EntryInvitationRow {
  id: string;
  organization_id: string;
  competition_id: string;
  channel: string;
  invitee_actor_id: string | null;
  invitee_label: string | null;
  code: string | null;
  message: string | null;
  status: string;
  invited_by_actor_id: string;
  created_at: Date | string;
  expires_at: Date | string | null;
  responded_at: Date | string | null;
  accepted_entry_id: string | null;
}

export class PostgresEntryInvitationRepository implements EntryInvitationRepository {
  constructor(private readonly pool: Pool) {}

  async create(invitation: EntryInvitation): Promise<EntryInvitation> {
    const result = await getPgExecutor(this.pool).query<EntryInvitationRow>(
      `INSERT INTO competition_entry_invitations (${COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING ${COLUMNS}`,
      [
        invitation.id,
        invitation.organizationId,
        invitation.competitionId,
        invitation.channel,
        invitation.inviteeActorId,
        invitation.inviteeLabel,
        invitation.code,
        invitation.message,
        invitation.status,
        invitation.invitedByActorId,
        invitation.createdAt.toISOString(),
        invitation.expiresAt?.toISOString() ?? null,
        invitation.respondedAt?.toISOString() ?? null,
        invitation.acceptedEntryId,
      ],
    );
    return rehydrate(requiredRow(result.rows[0]));
  }

  async findById(invitationId: string): Promise<EntryInvitation | null> {
    return this.one(`SELECT ${COLUMNS} FROM competition_entry_invitations WHERE id = $1`, [
      invitationId,
    ]);
  }

  async findLinkByCode(code: string): Promise<EntryInvitation | null> {
    return this.one(
      `SELECT ${COLUMNS} FROM competition_entry_invitations
       WHERE code = $1 AND channel = 'link'`,
      [code],
    );
  }

  async findActiveLink(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<EntryInvitation | null> {
    return this.one(
      `SELECT ${COLUMNS} FROM competition_entry_invitations
       WHERE organization_id = $1 AND competition_id = $2
         AND channel = 'link' AND status = 'pending'`,
      [organizationId, competitionId],
    );
  }

  async findPendingDirected(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    inviteeActorId: ActorId,
  ): Promise<EntryInvitation | null> {
    return this.one(
      `SELECT ${COLUMNS} FROM competition_entry_invitations
       WHERE organization_id = $1 AND competition_id = $2 AND invitee_actor_id = $3
         AND channel = 'directed' AND status = 'pending'`,
      [organizationId, competitionId, inviteeActorId],
    );
  }

  async listDirectedByCompetition(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<readonly EntryInvitation[]> {
    const result = await getPgExecutor(this.pool).query<EntryInvitationRow>(
      `SELECT ${COLUMNS} FROM competition_entry_invitations
       WHERE organization_id = $1 AND competition_id = $2 AND channel = 'directed'
       ORDER BY created_at DESC, id DESC`,
      [organizationId, competitionId],
    );
    return result.rows.map(rehydrate);
  }

  async listByInvitee(inviteeActorId: ActorId): Promise<readonly EntryInvitation[]> {
    const result = await getPgExecutor(this.pool).query<EntryInvitationRow>(
      `SELECT ${COLUMNS} FROM competition_entry_invitations
       WHERE invitee_actor_id = $1
       ORDER BY created_at DESC, id DESC`,
      [inviteeActorId],
    );
    return result.rows.map(rehydrate);
  }

  async updatePending(next: EntryInvitation): Promise<EntryInvitation | null> {
    return this.one(
      `UPDATE competition_entry_invitations
       SET status = $2, responded_at = $3, accepted_entry_id = $4
       WHERE id = $1 AND status = 'pending'
       RETURNING ${COLUMNS}`,
      [next.id, next.status, next.respondedAt?.toISOString() ?? null, next.acceptedEntryId],
    );
  }

  private async one(text: string, values: unknown[]): Promise<EntryInvitation | null> {
    const result = await getPgExecutor(this.pool).query<EntryInvitationRow>(text, values);
    const row = result.rows[0];
    return row ? rehydrate(row) : null;
  }
}

function requiredRow(row: EntryInvitationRow | undefined): EntryInvitationRow {
  if (!row) throw new Panic("Entry invitation insert returned no row");
  return row;
}

const CHANNELS: ReadonlySet<string> = new Set(Object.values(ENTRY_INVITATION_CHANNEL));
const STATUSES: ReadonlySet<string> = new Set(Object.values(ENTRY_INVITATION_STATUS));

function isChannel(value: string): value is EntryInvitationChannel {
  return CHANNELS.has(value);
}

function isStatus(value: string): value is EntryInvitationStatus {
  return STATUSES.has(value);
}

function optionalDate(value: Date | string | null): Date | null {
  return value === null ? null : new Date(value);
}

function rehydrate(row: EntryInvitationRow): EntryInvitation {
  if (!isChannel(row.channel) || !isStatus(row.status)) {
    throw new Panic(`Unknown entry invitation channel/status: ${row.channel}/${row.status}`);
  }
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    channel: row.channel,
    inviteeActorId: row.invitee_actor_id === null ? null : asActorId(row.invitee_actor_id),
    inviteeLabel: row.invitee_label,
    code: row.code,
    message: row.message,
    status: row.status,
    invitedByActorId: asActorId(row.invited_by_actor_id),
    createdAt: new Date(row.created_at),
    expiresAt: optionalDate(row.expires_at),
    respondedAt: optionalDate(row.responded_at),
    acceptedEntryId: row.accepted_entry_id,
  };
}
