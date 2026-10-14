import type { EntryInvitation, EntryInvitationRepository } from "@futrob/competitions";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { PostgresPlayerDirectoryReader } from "@/adapters/teams/player-directory.reader.ts";
import {
  InMemoryEntryInvitationRepository,
  PostgresEntryInvitationRepository,
} from "./entry-invitation.repositories.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const ORG = asOrganizationId("org-entry");
const CMP = asCompetitionId("cmp-entry");
const OTHER_CMP = asCompetitionId("cmp-other");
const ORGANIZER = asActorId("act-organizer");
const CONDOR = asActorId("act-condor");
const RICARDO = asActorId("act-ricardo");

function at(minute: number): Date {
  return new Date(Date.UTC(2026, 9, 13, 12, minute));
}

function directed(id: string, overrides: Partial<EntryInvitation> = {}): EntryInvitation {
  return {
    id,
    organizationId: ORG,
    competitionId: CMP,
    channel: "directed",
    inviteeActorId: CONDOR,
    inviteeLabel: "condor10",
    code: null,
    message: "¡Hola!",
    status: "pending",
    invitedByActorId: ORGANIZER,
    createdAt: at(0),
    expiresAt: at(60),
    respondedAt: null,
    acceptedEntryId: null,
    ...overrides,
  };
}

function link(id: string, code: string, overrides: Partial<EntryInvitation> = {}): EntryInvitation {
  return {
    ...directed(id),
    channel: "link",
    inviteeActorId: null,
    inviteeLabel: null,
    code,
    message: null,
    expiresAt: null,
    ...overrides,
  };
}

function contract(name: string, repository: () => EntryInvitationRepository) {
  describe(name, () => {
    let invitations: EntryInvitationRepository;

    beforeEach(() => {
      invitations = repository();
    });

    it("round-trips a directed invitation and lists it for its competition and invitee", async () => {
      await invitations.create(directed("inv-old", { status: "declined", createdAt: at(0) }));
      await invitations.create(directed("inv-new", { createdAt: at(5) }));
      await invitations.create(
        directed("inv-elsewhere", { competitionId: OTHER_CMP, inviteeActorId: RICARDO }),
      );

      expect(await invitations.findById("inv-new")).toEqual(
        directed("inv-new", { createdAt: at(5) }),
      );
      expect((await invitations.listDirectedByCompetition(ORG, CMP)).map((row) => row.id)).toEqual([
        "inv-new",
        "inv-old",
      ]);
      expect((await invitations.listByInvitee(CONDOR)).map((row) => row.id)).toEqual([
        "inv-new",
        "inv-old",
      ]);
      expect((await invitations.findPendingDirected(ORG, CMP, CONDOR))?.id).toBe("inv-new");
      expect(await invitations.findPendingDirected(ORG, CMP, RICARDO)).toBeNull();
    });

    it("answers a pending invitation once", async () => {
      await invitations.create(directed("inv-1"));

      const accepted = await invitations.updatePending(
        directed("inv-1", { status: "accepted", respondedAt: at(10), acceptedEntryId: null }),
      );
      const revokedLater = await invitations.updatePending(
        directed("inv-1", { status: "revoked", respondedAt: at(20) }),
      );

      expect(accepted?.status).toBe("accepted");
      expect(accepted?.respondedAt).toEqual(at(10));
      expect(revokedLater).toBeNull();
      expect((await invitations.findById("inv-1"))?.status).toBe("accepted");
    });

    it("finds the active link and still finds a revoked code", async () => {
      await invitations.create(link("link-1", "code-old"));
      await invitations.updatePending(link("link-1", "code-old", { status: "revoked" }));
      await invitations.create(link("link-2", "code-new", { createdAt: at(1) }));

      expect((await invitations.findActiveLink(ORG, CMP))?.code).toBe("code-new");
      expect((await invitations.findLinkByCode("code-old"))?.status).toBe("revoked");
      expect(await invitations.findLinkByCode("missing")).toBeNull();
      expect(await invitations.findActiveLink(ORG, OTHER_CMP)).toBeNull();
    });
  });
}

contract("in-memory entry invitation repository", () => new InMemoryEntryInvitationRepository());

describe.skipIf(!databaseUrl)("postgres entry invitations", () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "entry_invitations");
    await migrateIsolatedSchema(isolated.pool);
  }, 180_000);

  afterAll(async () => {
    await isolated?.drop();
  }, 180_000);

  beforeEach(async () => {
    const schema = `"${isolated.schema}"`;
    await isolated.pool.query(
      `TRUNCATE ${schema}.competition_entry_invitations, ${schema}.player_profiles,
                ${schema}.organizations, ${schema}.actors CASCADE`,
    );
    await seedActors(isolated.pool, ORGANIZER, CONDOR, RICARDO);
    await isolated.pool.query(
      `INSERT INTO organizations (
         id, name, normalized_name, slug, time_zone, created_at, created_by_actor_id
       ) VALUES ($1, $1, $1, $1, 'UTC', NOW(), $2)`,
      [ORG, ORGANIZER],
    );
    for (const competition of [CMP, OTHER_CMP]) {
      await isolated.pool.query(
        `INSERT INTO competitions (
           id, organization_id, name, status, modality, game_edition, platform,
           region, time_zone, format, created_by_actor_id, created_at, updated_at
         ) VALUES ($1, $2, 'Liga', 'draft', 'fc-clubs', 'FC 26', 'playstation',
                   'south-america', 'UTC', 'league', $3, NOW(), NOW())`,
        [competition, ORG, ORGANIZER],
      );
    }
  });

  contract("postgres", () => new PostgresEntryInvitationRepository(isolated.pool));

  it("allows a single active link per competition", async () => {
    const invitations = new PostgresEntryInvitationRepository(isolated.pool);
    await invitations.create(link("link-a", "code-a"));

    await expect(invitations.create(link("link-b", "code-b"))).rejects.toThrow();
  });

  it("finds players by gamertag prefix with their latest declared club", async () => {
    for (const [profile, actor, gamertag] of [
      ["pp-condor", CONDOR, "Condor10"],
      ["pp-ricardo", RICARDO, "ricardo_9"],
    ] as const) {
      await isolated.pool.query(
        `INSERT INTO player_profiles (id, actor_id, created_at) VALUES ($1, $2, NOW())`,
        [profile, actor],
      );
      await isolated.pool.query(
        `INSERT INTO player_game_accounts (
           id, player_profile_id, identifier, normalized_identifier, platform, game_edition,
           created_at
         ) VALUES ($1, $2, $3, lower($3), 'playstation', 'FC 26', NOW())`,
        [`acc-${profile}`, profile, gamertag],
      );
    }
    await isolated.pool.query(
      `INSERT INTO player_external_club_associations (
         player_profile_id, provider_key, external_club_id, external_club_name, platform,
         game_edition, image_url, associated_at
       ) VALUES ('pp-condor', 'ea', 'club-1', 'Cóndor FC', 'playstation', 'FC 26', NULL, NOW())`,
    );
    const directory = new PostgresPlayerDirectoryReader(isolated.pool);

    expect(await directory.searchByGamertagPrefix("con", 10)).toEqual([
      {
        actorId: CONDOR,
        gamertag: "Condor10",
        platform: "playstation",
        gameEdition: "FC 26",
        club: { name: "Cóndor FC", imageUrl: null, platform: "playstation" },
      },
    ]);
    expect(await directory.searchByGamertagPrefix("ric_", 10)).toEqual([]);
    expect((await directory.searchByGamertagPrefix("ricardo_", 10)).map((p) => p.gamertag)).toEqual(
      ["ricardo_9"],
    );
  });
});
