import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Link } from "@tanstack/react-router";
import {
  applyStyles,
  Button,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  colors,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  media,
  typography,
} from "@futrob/ui";
import type { PlayerGameAccountDto, PlayerTeamMembershipDto } from "@futrob/api-contracts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  useMyPlayerProfileQuery,
  useMyTeamsQuery,
  useSetActiveTeamMutation,
} from "./player-queries.ts";

const styles = stylex.create({
  main: {
    width: "100%",
  },
  intro: {
    marginBottom: "2rem",
    maxWidth: "42rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  muted: {
    color: colors.mutedForeground,
  },
  title: {
    fontSize: {
      default: "var(--text-3xl)",
      [media.sm]: "var(--text-4xl)",
    },
  },
  panel: {
    overflow: "hidden",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shortcut: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    paddingInline: "1.25rem",
    paddingBlock: "1rem",
    borderTopWidth: {
      default: 1,
      ":first-child": 0,
    },
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  shortcutCopy: {
    maxWidth: "42rem",
  },
  shortcutTitle: {
    fontWeight: 600,
  },
  shortcutHint: {
    marginTop: "0.25rem",
    color: colors.mutedForeground,
  },
  card: {
    marginTop: "2rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: {
      default: "1.25rem",
      [media.sm]: "1.5rem",
    },
  },
  cardHeader: {
    marginBottom: "1rem",
  },
  cardTitle: {
    fontSize: "1rem",
    lineHeight: "1.5rem",
    fontWeight: 600,
  },
  cardHint: {
    marginTop: "0.375rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  teamGrid: {
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  teamItem: {
    display: "flex",
    width: "100%",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  teamCopy: {
    display: "grid",
    gap: "0.25rem",
    textAlign: "left",
  },
  teamName: {
    fontWeight: 600,
  },
  error: {
    marginTop: "0.75rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.destructive,
  },
  gameHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "1rem",
  },
  accounts: {
    marginTop: "0.5rem",
    display: "grid",
    gap: "0.5rem",
  },
  account: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  },
  orgHint: {
    marginTop: "0.375rem",
    maxWidth: "42rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  orgActions: {
    marginTop: "1.25rem",
    justifyContent: "flex-start",
  },
});

const teamGrid = applyStyles(styles.teamGrid);
const orgActions = applyStyles(styles.orgActions);

export function PlayerWorkspacePage() {
  const { t } = useI18n();
  const [activeError, setActiveError] = useState<string | null>(null);
  const profileQuery = useMyPlayerProfileQuery();
  const teamsQuery = useMyTeamsQuery();
  const setActiveTeam = useSetActiveTeamMutation();

  const accounts = profileQuery.data?.gameAccounts ?? [];
  const teams = teamsQuery.data?.teams ?? [];
  const activeId = teamsQuery.data?.activeRosterMembershipId ?? "";
  const savingActive = setActiveTeam.isPending;

  async function handleActiveChange(value: string | null) {
    if (!value || value === activeId || savingActive) return;
    setActiveError(null);
    try {
      await setActiveTeam.mutateAsync({ rosterMembershipId: value });
    } catch {
      setActiveError("No se pudo guardar el equipo activo. Inténtalo de nuevo.");
    }
  }

  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.intro)}>
        <p {...applyStyles(typography.label, styles.muted)}>Espacio personal</p>
        <h1 {...applyStyles(typography.heading, styles.title)}>Tu espacio de jugador</h1>
        <p {...applyStyles(typography.body, styles.muted)}>
          Consulta tus partidos y estadísticas individuales sin pertenecer todavía a una
          organización.
        </p>
      </div>

      <section {...applyStyles(styles.panel)}>
        <div {...applyStyles(styles.shortcut)}>
          <div {...applyStyles(styles.shortcutCopy)}>
            <h2 {...applyStyles(styles.shortcutTitle)}>{t("player.matches.title")}</h2>
            <p {...applyStyles(typography.caption, styles.shortcutHint)}>
              {t("player.matches.description")}
            </p>
          </div>
          <Button
            render={<Link to="/player/matches" search={{ view: "all" }} />}
            variant="secondary"
          >
            {t("player.matches.open")}
          </Button>
        </div>
        <div {...applyStyles(styles.shortcut)}>
          <div {...applyStyles(styles.shortcutCopy)}>
            <h2 {...applyStyles(styles.shortcutTitle)}>{t("player.statistics.title")}</h2>
            <p {...applyStyles(typography.caption, styles.shortcutHint)}>
              {t("player.statistics.description")}
            </p>
          </div>
          <Button render={<Link to="/player/statistics" />} variant="secondary">
            {t("player.statistics.open")}
          </Button>
        </div>
      </section>

      <section {...applyStyles(styles.card)}>
        <div {...applyStyles(styles.cardHeader)}>
          <h2 {...applyStyles(styles.cardTitle)}>Mis equipos</h2>
          <p {...applyStyles(styles.cardHint)}>
            Puedes pertenecer a varios equipos en competiciones distintas. Elige uno como activo
            para tu espacio personal.
          </p>
        </div>
        {teams.length === 0 ? (
          <EmptyState>
            <EmptyStateTitle>Sin plantillas todavía</EmptyStateTitle>
            <EmptyStateDescription>
              Cuando un organizador te añada a la plantilla de un equipo, aparecerá aquí.
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <ChoiceGroup<string>
            aria-label="Equipo activo"
            className={teamGrid.className}
            disabled={savingActive}
            onValueChange={(value) => void handleActiveChange(value)}
            style={teamGrid.style}
            value={activeId}
          >
            {teams.map((item) => (
              <ChoiceGroupItem
                appearance="tile"
                key={item.membership.id}
                value={item.membership.id}
              >
                <span {...applyStyles(styles.teamItem)}>
                  <span {...applyStyles(styles.teamCopy)}>
                    <span {...applyStyles(styles.teamName)}>{item.team.name}</span>
                    <span {...applyStyles(typography.caption, styles.muted)}>
                      Competición {item.membership.competitionId} · Rol{" "}
                      {rosterRoleLabel(item.membership.role)}
                    </span>
                  </span>
                  <ChoiceGroupIndicator />
                </span>
              </ChoiceGroupItem>
            ))}
          </ChoiceGroup>
        )}
        {activeError ? (
          <p role="alert" {...applyStyles(styles.error)}>
            {activeError}
          </p>
        ) : null}
      </section>

      <section {...applyStyles(styles.card)}>
        <div {...applyStyles(styles.gameHeader)}>
          <div>
            <h2 {...applyStyles(styles.cardTitle)}>Datos de juego</h2>
            {accounts.length > 0 ? (
              <div {...applyStyles(styles.accounts)}>
                {accounts.map((account) => (
                  <div key={account.id} {...applyStyles(styles.account)}>
                    <span>
                      {account.identifier} · {platformLabel(account.platform)} ·{" "}
                      {account.gameEdition}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p {...applyStyles(styles.cardHint)}>
                Vincula un identificador para preparar la asociación con tus partidos oficiales.
              </p>
            )}
          </div>
          <Button render={<Link to="/player/game-accounts" />} variant="secondary">
            {accounts.length > 0 ? "Administrar cuentas" : "Vincular cuenta"}
          </Button>
        </div>
      </section>

      <section {...applyStyles(styles.card)}>
        <h2 {...applyStyles(styles.cardTitle)}>¿Quieres competir en una organización?</h2>
        <p {...applyStyles(styles.orgHint)}>
          Puedes aceptar una invitación o crear una organización más adelante. Tu espacio personal y
          tu historial se conservarán.
        </p>
        <EmptyStateActions className={orgActions.className} style={orgActions.style}>
          <Button render={<Link to="/invitations/accept" />}>Aceptar invitación</Button>
          <Button render={<Link to="/orgs/new" />} variant="secondary">
            Crear organización
          </Button>
        </EmptyStateActions>
      </section>
    </main>
  );
}

function platformLabel(platform: PlayerGameAccountDto["platform"]): string {
  return {
    playstation: "PlayStation",
    xbox: "Xbox",
    pc: "PC",
    "nintendo-switch-1": "Nintendo Switch 1",
    "nintendo-switch-2": "Nintendo Switch 2",
  }[platform];
}

function rosterRoleLabel(role: PlayerTeamMembershipDto["membership"]["role"]): string {
  return {
    player: "Jugador",
    captain: "Capitán",
    vice_captain: "Subcapitán",
  }[role];
}
