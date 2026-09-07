import {
  type ClaimPendingOptions,
  type RosterInvitationRepository,
  ROSTER_INVITATION_STATUS,
  type RosterInvitation,
} from "@futrob/teams";
import { compareByTime, TIME_SORT_DIRECTION, type ActorId } from "@futrob/shared-kernel";

type RedemptionKey = `${string}:${string}`;

function redemptionKey(invitationId: string, actorId: ActorId): RedemptionKey {
  return `${invitationId}:${actorId}`;
}

export class InMemoryRosterInvitationRepository implements RosterInvitationRepository {
  readonly byHash = new Map<string, RosterInvitation>();
  readonly redemptions = new Map<RedemptionKey, Date>();
  rosterMemberCount: ((invitation: RosterInvitation) => number) | null = null;

  async create(invitation: RosterInvitation): Promise<void> {
    this.byHash.set(invitation.tokenHash, invitation);
  }

  async findByTokenHash(tokenHash: string): Promise<RosterInvitation | null> {
    return this.byHash.get(tokenHash) ?? null;
  }

  async findById(invitationId: string): Promise<RosterInvitation | null> {
    return [...this.byHash.values()].find((invitation) => invitation.id === invitationId) ?? null;
  }

  async listByInvitee(inviteeActorId: ActorId): Promise<RosterInvitation[]> {
    return [...this.byHash.values()]
      .filter((invitation) => invitation.inviteeActorId === inviteeActorId)
      .sort(compareByTime((item) => item.createdAt, TIME_SORT_DIRECTION.desc));
  }

  async findRedemption(invitationId: string, actorId: ActorId): Promise<Date | null> {
    return this.redemptions.get(redemptionKey(invitationId, actorId)) ?? null;
  }

  async deleteRedemption(invitationId: string, actorId: ActorId): Promise<void> {
    this.redemptions.delete(redemptionKey(invitationId, actorId));
  }

  async claimPending(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
    options: ClaimPendingOptions,
  ): Promise<RosterInvitation | null> {
    const current = this.byHash.get(tokenHash);
    if (!current) return null;
    if (current.status !== ROSTER_INVITATION_STATUS.pending) return null;
    if (current.expiresAt.getTime() <= now.getTime()) return null;

    if (current.redeemPolicy === "multi") {
      const key = redemptionKey(current.id, actorId);
      if (this.redemptions.has(key)) {
        return current;
      }

      const memberCount = this.rosterMemberCount?.(current) ?? 0;
      const redemptionCount = [...this.redemptions.keys()].filter((entry) =>
        entry.startsWith(`${current.id}:`),
      ).length;
      const freeSlots = options.maxRosterSize - memberCount;
      if (freeSlots <= 0 || redemptionCount >= freeSlots || !options.hasFreeSlot) {
        return null;
      }

      this.redemptions.set(key, now);
      return current;
    }

    const accepted: RosterInvitation = {
      ...current,
      status: ROSTER_INVITATION_STATUS.accepted,
      acceptedByActorId: actorId,
      respondedAt: now,
    };
    this.byHash.set(tokenHash, accepted);
    return accepted;
  }

  async declinePending(
    invitationId: string,
    inviteeActorId: ActorId,
    now: Date,
  ): Promise<RosterInvitation | null> {
    const current = await this.findById(invitationId);
    if (!current) return null;
    if (current.status !== ROSTER_INVITATION_STATUS.pending) return null;
    if (current.inviteeActorId !== inviteeActorId) return null;
    if (current.expiresAt.getTime() <= now.getTime()) return null;
    const declined: RosterInvitation = {
      ...current,
      status: ROSTER_INVITATION_STATUS.declined,
      respondedAt: now,
    };
    this.byHash.set(current.tokenHash, declined);
    return declined;
  }

  async acceptPendingById(
    invitationId: string,
    actorId: ActorId,
    now: Date,
  ): Promise<RosterInvitation | null> {
    const current = await this.findById(invitationId);
    if (!current) return null;
    if (current.status !== ROSTER_INVITATION_STATUS.pending) return null;
    if (current.expiresAt.getTime() <= now.getTime()) return null;
    const accepted: RosterInvitation = {
      ...current,
      status: ROSTER_INVITATION_STATUS.accepted,
      acceptedByActorId: actorId,
      respondedAt: now,
    };
    this.byHash.set(current.tokenHash, accepted);
    return accepted;
  }
}
