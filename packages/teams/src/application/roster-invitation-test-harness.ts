import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type ActorId,
  type ClockPort,
  type IdGeneratorPort,
} from "@futrob/shared-kernel";
import type { RosterInvitation } from "../domain/entities/roster-invitation.ts";
import { ROSTER_INVITATION_STATUS } from "../domain/entities/roster-invitation.ts";
import type {
  ClaimPendingOptions,
  RosterInvitationRepository,
} from "../domain/ports/roster-invitation.repository.ts";
import type { RosterInvitationTokenPort } from "../domain/ports/roster-invitation-token.port.ts";

export class FakeClock implements ClockPort {
  constructor(private current: Date = new Date("2026-01-15T12:00:00.000Z")) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class FakeIds implements IdGeneratorPort {
  private sequence = 0;

  generate(): string {
    this.sequence += 1;
    return `id-${this.sequence}`;
  }
}

export class FakeRosterInvitationTokens implements RosterInvitationTokenPort {
  private seq = 0;

  generateToken(): string {
    this.seq += 1;
    return `plain-token-${this.seq}`;
  }

  hashToken(token: string): string {
    return `hash:${token}`;
  }
}

type RedemptionKey = `${string}:${string}`;

export class FakeRosterInvitationRepository implements RosterInvitationRepository {
  readonly byHash = new Map<string, RosterInvitation>();
  readonly redemptions = new Map<RedemptionKey, Date>();
  /** Optional roster member count for multi slot races in tests. */
  rosterMemberCount: ((invitation: RosterInvitation) => number) | null = null;
  /** Yields before CAS so tests can overlap two accept calls that both saw pending. */
  beforeClaim: (() => Promise<void>) | null = null;

  async create(invitation: RosterInvitation): Promise<void> {
    this.byHash.set(invitation.tokenHash, invitation);
  }

  async findByTokenHash(tokenHash: string): Promise<RosterInvitation | null> {
    return this.byHash.get(tokenHash) ?? null;
  }

  async findRedemption(invitationId: string, actorId: ActorId): Promise<Date | null> {
    return this.redemptions.get(`${invitationId}:${actorId}`) ?? null;
  }

  async deleteRedemption(invitationId: string, actorId: ActorId): Promise<void> {
    this.redemptions.delete(`${invitationId}:${actorId}`);
  }

  async claimPending(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
    options: ClaimPendingOptions,
  ): Promise<RosterInvitation | null> {
    if (this.beforeClaim) {
      await this.beforeClaim();
    }
    const current = this.byHash.get(tokenHash);
    if (!current) return null;
    if (current.status !== ROSTER_INVITATION_STATUS.pending) return null;
    if (current.expiresAt.getTime() <= now.getTime()) return null;

    if (current.redeemPolicy === "multi") {
      const redemptionKey = `${current.id}:${actorId}` as RedemptionKey;
      const existingRedemption = this.redemptions.get(redemptionKey);
      if (existingRedemption) {
        return current;
      }

      const memberCount = this.rosterMemberCount?.(current) ?? 0;
      const redemptionCount = [...this.redemptions.keys()].filter((key) =>
        key.startsWith(`${current.id}:`),
      ).length;
      const freeSlots = options.maxRosterSize - memberCount;
      if (freeSlots <= 0 || redemptionCount >= freeSlots || !options.hasFreeSlot) {
        return null;
      }

      this.redemptions.set(redemptionKey, now);
      return current;
    }

    const accepted: RosterInvitation = {
      ...current,
      status: ROSTER_INVITATION_STATUS.accepted,
      acceptedByActorId: actorId,
    };
    this.byHash.set(tokenHash, accepted);
    return accepted;
  }
}

export function createRosterInvitationTestHarness() {
  const clock = new FakeClock();
  const ids = new FakeIds();
  const tokens = new FakeRosterInvitationTokens();
  const invitations = new FakeRosterInvitationRepository();

  return {
    clock,
    ids,
    tokens,
    invitations,
    actor: (value: string) => asActorId(value),
    org: (value: string) => asOrganizationId(value),
    competition: (value: string) => asCompetitionId(value),
    team: (value: string) => asTeamId(value),
  };
}
