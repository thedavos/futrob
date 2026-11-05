import { asActorId } from "@futrob/shared-kernel";
import type { DemoAccount } from "./accounts.ts";
import { attempt, type SeedContext } from "./context.ts";
import { HOURS, type PlayerRecord } from "./engine.ts";
import type { LigaAndina } from "./liga-andina.ts";
import { EA_PLATFORM, GAME_EDITION, GAME_PLATFORM, type People } from "./people.ts";

const DAY_MS = 24 * HOURS;

type OnboardPlayer = (
  account: DemoAccount,
  options: { gamertag?: string; clubId?: string },
) => Promise<PlayerRecord>;

/** Staff memberships, invitations in every state and the invitation onboarding. */
export async function seedInvitations(
  context: SeedContext,
  people: People,
  liga: LigaAndina,
  onboardPlayer: OnboardPlayer,
): Promise<{ onboardingToken: string | null; staffToken: string | null }> {
  context.log("• Invitaciones y staff");
  const organizer = context.as(liga.org.organizer);
  let onboardingToken: string | null = null;
  let staffToken: string | null = null;

  // staff@ joins through the invitation onboarding path with a competition staff invite,
  // then becomes organization staff.
  await attempt(context, "staff@: invitación de staff", async () => {
    const competitionInvite = await organizer.organizations.createCompetitionInvitation(
      liga.org.id,
      liga.clausura.id,
      { role: "staff", email: people.named.staff.email },
    );
    await context.as(people.named.staff).identity.completeInvitationOnboarding({
      token: competitionInvite.token,
      gameAccount: {
        identifier: people.gamertagOf(people.named.staff),
        platform: GAME_PLATFORM,
        gameEdition: GAME_EDITION,
      },
    });
    const orgInvite = await organizer.organizations.createInvitation(liga.org.id, {
      role: "staff",
      email: people.named.staff.email,
    });
    await context.as(people.named.staff).organizations.acceptInvitation({ token: orgInvite.token });
  });

  await attempt(context, "multi-rol@: staff de Liga Andina", async () => {
    const invite = await organizer.organizations.createInvitation(liga.org.id, {
      role: "staff",
      email: people.named.multiRol.email,
    });
    await context.as(people.named.multiRol).organizations.acceptInvitation({ token: invite.token });
  });

  // onb-invitacion@ stopped on the invitation step with a pending player invitation.
  await attempt(context, "onb-invitacion@: onboarding detenido en invitación", async () => {
    const invite = await organizer.organizations.createCompetitionInvitation(
      liga.org.id,
      liga.clausura.id,
      { role: "player", email: people.named.onbInvitacion.email },
    );
    onboardingToken = invite.token;
    const client = context.as(people.named.onbInvitacion);
    await client.identity.saveOnboardingProgress({ path: "invitation", currentStep: "intention" });
    await client.identity.saveOnboardingProgress({ path: "invitation", currentStep: "invitation" });
  });

  // A reusable staff link the superadmin or organizer can open in the browser.
  await attempt(context, "enlace de invitación de staff multiuso", async () => {
    const invite = await organizer.organizations.createInvitation(liga.org.id, {
      role: "staff",
      redeemPolicy: "multi",
      maxRedemptions: 5,
    });
    staffToken = invite.token;
  });

  await onboardPlayer(people.named.invitado, {
    gamertag: people.gamertagOf(people.named.invitado),
  });
  await onboardPlayer(people.named.invitVencida, {
    gamertag: people.gamertagOf(people.named.invitVencida),
  });
  const condores = liga.teams[0]!;
  const pumas = liga.teams[1]!;

  await attempt(context, "invitado@: invitación de plantilla pendiente", () =>
    context
      .as(liga.org.organizer)
      .teams.createRosterInvitation(liga.org.id, liga.clausura.id, condores.id, {
        role: "player",
        inviteeIdentifier: people.gamertagOf(people.named.invitado),
        message: "¡Te queremos en Cóndores para la segunda vuelta!",
        invitedByDisplayName: liga.org.organizer.name,
      }),
  );
  await attempt(context, "invit-vencida@: invitación de plantilla vencida", async () => {
    await context
      .as(liga.org.organizer)
      .teams.createRosterInvitation(liga.org.id, liga.clausura.id, pumas.id, {
        role: "player",
        inviteeIdentifier: people.gamertagOf(people.named.invitVencida),
        expiresInMs: 2 * DAY_MS,
        message: "Prueba con Atlético Pumas",
        invitedByDisplayName: liga.org.organizer.name,
      });
    // The teams module reads the system clock, so the invitation is aged in place.
    await context.pool.query(
      `UPDATE roster_invitations
       SET created_at = $3::timestamptz - INTERVAL '10 days',
           expires_at = $3::timestamptz - INTERVAL '8 days'
       WHERE organization_id = $1 AND invitee_identifier = $2`,
      [liga.org.id, people.gamertagOf(people.named.invitVencida), context.now],
    );
  });

  await attempt(context, "invitado@: invitación de inscripción en Apertura", () =>
    organizer.entryInvitations.invite(liga.org.id, liga.apertura.id, {
      inviteeActorId: people.named.invitado.actorId,
      inviteeLabel: people.named.invitado.name,
      message: "Inscribe a tu equipo en la Apertura.",
    }),
  );
  await attempt(context, "invit-vencida@: invitación de inscripción revocada", async () => {
    const sent = await organizer.entryInvitations.invite(liga.org.id, liga.apertura.id, {
      inviteeActorId: people.named.invitVencida.actorId,
      inviteeLabel: people.named.invitVencida.name,
      message: null,
    });
    await organizer.entryInvitations.revoke(liga.org.id, liga.apertura.id, sent.id);
  });

  return { onboardingToken, staffToken };
}

/** jugador-solo@: two associated clubs and a varied personal match history. */
export async function seedPersonalSpace(
  context: SeedContext,
  people: People,
  onboardPlayer: OnboardPlayer,
): Promise<void> {
  context.log("• Espacio personal (jugador-solo, premium, sin club, espectador)");
  const me = people.gamertagOf(people.named.jugadorSolo);
  const solitarios = context.ea.addClub({
    number: 201,
    name: "Los Solitarios FC",
    squad: [
      { gamertag: me, position: "forward" },
      { gamertag: "Socio_Ramiro", position: "midfielder" },
      { gamertag: "Socio_Lucas", position: "defender" },
      { gamertag: "Arquero_Sol", position: "goalkeeper" },
    ],
  });
  const parque = context.ea.addClub({
    number: 202,
    name: "Parque Unido",
    squad: [
      { gamertag: me, position: "midfielder" },
      { gamertag: "Parque_Tino", position: "forward" },
      { gamertag: "Parque_Edu", position: "defender" },
      { gamertag: "Parque_Gol", position: "goalkeeper" },
    ],
  });
  const rivales = context.ea.addClub({
    number: 203,
    name: "Rivales del Parque",
    squad: [
      { gamertag: "Rival_Uno", position: "forward" },
      { gamertag: "Rival_Dos", position: "midfielder" },
      { gamertag: "Rival_Tres", position: "defender" },
      { gamertag: "Rival_Arquero", position: "goalkeeper" },
    ],
  });
  const ago = (days: number, hour = 1) => {
    const date = new Date(context.now.getTime() - days * DAY_MS);
    date.setUTCHours(hour, 0, 0, 0);
    return date;
  };
  const match = (
    clubId: string,
    days: number,
    score: readonly [number, number],
    extras: {
      scorers?: Record<string, number>;
      absent?: string[];
      cards?: Record<string, { yellow?: number; red?: number }>;
      matchType?: "leagueMatch" | "playoffMatch" | "friendlyMatch";
      hour?: number;
    } = {},
  ) =>
    context.ea.addMatch({
      homeClubId: clubId,
      awayClubId: rivales.clubId,
      occurredAt: ago(days, extras.hour),
      homeGoals: score[0],
      awayGoals: score[1],
      matchType: extras.matchType,
      scorers: extras.scorers,
      absent: extras.absent,
      cards: extras.cards,
    });
  // Recientes (last 7 days)
  match(solitarios.clubId, 1, [3, 1], { scorers: { [me]: 3 } }); // hat-trick
  match(solitarios.clubId, 2, [4, 2], { scorers: { [me]: 4 }, matchType: "playoffMatch" }); // póker
  match(parque.clubId, 3, [1, 2], { cards: { [me]: { yellow: 1 } }, matchType: "friendlyMatch" });
  match(solitarios.clubId, 4, [0, 1], { absent: [me] }); // not played
  match(parque.clubId, 5, [6, 0], { scorers: { [me]: 5 } }); // repóker
  match(solitarios.clubId, 6, [1, 1], { cards: { [me]: { yellow: 1, red: 1 } } });
  // Todos (older than a week)
  match(parque.clubId, 9, [2, 0], { scorers: { [me]: 1 } });
  match(solitarios.clubId, 11, [0, 3], { matchType: "friendlyMatch" });
  match(parque.clubId, 13, [2, 2], { absent: [me] });
  match(solitarios.clubId, 16, [5, 1], { scorers: { [me]: 2 } });

  await onboardPlayer(people.named.jugadorSolo, { gamertag: me, clubId: solitarios.clubId });
  await context.as(people.named.jugadorSolo).players.associateExternalClub({
    providerKey: "ea-clubs",
    externalClubId: parque.clubId,
    platform: EA_PLATFORM,
    gameEdition: GAME_EDITION,
    name: parque.name,
    imageUrl: null,
  });

  await onboardPlayer(people.named.premium, {
    gamertag: people.gamertagOf(people.named.premium),
    clubId: solitarios.clubId,
  });
  await context.pool.query(
    `INSERT INTO billing_subscriptions (id, subject_type, actor_id, plan_key, status, created_at, updated_at)
     VALUES ($1, 'actor', $2, 'player_premium', 'active', $3, $3)`,
    [`demo-premium-${people.named.premium.actorId}`, people.named.premium.actorId, context.now],
  );
  await onboardPlayer(people.named.jugadorSinClub, {});
  await onboardPlayer(people.named.espectador, {});
}

/** Onboarding states that stop before completion, plus the platform superuser. */
export async function seedAccessStates(context: SeedContext, people: People): Promise<void> {
  context.log("• Superusuario y onboardings incompletos");
  await context.modules.authorization.bootstrapInitialSuperuser(
    asActorId(people.named.superadmin.actorId),
  );
  await context.as(people.named.superadmin).identity.completePlayerOnboarding({
    gameAccount: null,
    externalClub: null,
  });
  const paused = context.as(people.named.onbOrgPausado);
  await paused.identity.saveOnboardingProgress({ path: "organization", currentStep: "intention" });
  await paused.identity.saveOnboardingProgress({
    path: "organization",
    currentStep: "organization",
  });
  await paused.identity.saveOnboardingProgress({
    path: "organization",
    currentStep: "game-account",
  });
}
