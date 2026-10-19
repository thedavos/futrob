import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { EntryInviteeCandidateDto } from "@futrob/api-contracts";
import { buildEntryInvitationShareUrl, buildWhatsAppShareUrl } from "@futrob/sdk";
import { Button } from "@futrob/ui";
import { competitionPlatformLabel } from "../competition-draft-meta.ts";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import { entryInvitationShareText } from "./entry-invitation-copy.ts";
import { INVITE_TEAM_TAB, InviteTeamDialog, type InviteTeamTab } from "./invite-team-dialog.tsx";
import type { InviteTeamCaptainInput } from "./invite-team-futrob-tab.tsx";
import type { InvitationLinkState } from "./invite-team-link-tab.tsx";

const COMPETITION = "Liga Interclubes";
const ORIGIN = "https://futrob.app";

const condor: EntryInviteeCandidateDto = {
  actorId: "act-condor",
  gamertag: "condor10",
  platform: "nintendo-switch-2",
  gameEdition: "FC 26",
  club: { name: "Cóndor FC", imageUrl: null, platform: "nintendo-switch-2" },
  inCompetition: false,
  invitationPending: false,
};

const candidates: readonly EntryInviteeCandidateDto[] = [
  condor,
  {
    actorId: "act-condorito",
    gamertag: "condorito_7",
    platform: "playstation",
    gameEdition: "FC 26",
    club: null,
    inCompetition: false,
    invitationPending: true,
  },
  {
    actorId: "act-condesa",
    gamertag: "condesa",
    platform: "xbox",
    gameEdition: "FC 26",
    club: { name: "Las Condesas de Lima Metropolitana FC", imageUrl: null, platform: "xbox" },
    inCompetition: true,
    invitationPending: false,
  },
];

function linkFor(code: string): InvitationLinkState {
  const url = buildEntryInvitationShareUrl(ORIGIN, code);
  return {
    kind: "ready",
    url,
    whatsAppUrl: buildWhatsAppShareUrl(entryInvitationShareText(COMPETITION), url),
  };
}

type StoryArgs = {
  readonly initiallyOpen: boolean;
  readonly initialTab: InviteTeamTab;
  readonly link: InvitationLinkState;
  readonly searchPlayers: (query: string) => Promise<readonly EntryInviteeCandidateDto[]>;
  readonly onInvite: (input: InviteTeamCaptainInput) => Promise<void>;
  readonly onRegenerateLink: () => Promise<void>;
  readonly onRetryLink: () => void;
};

/** Owns open/tab state like the setup page does; server calls are story spies. */
function InviteTeamStory({
  initiallyOpen,
  initialTab,
  link: initialLink,
  searchPlayers,
  onInvite,
  onRegenerateLink,
  onRetryLink,
}: StoryArgs) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [open, setOpen] = useState(initiallyOpen);
  const [tab, setTab] = useState<InviteTeamTab>(initialTab);
  const [link, setLink] = useState(initialLink);
  return (
    <QueryClientProvider client={queryClient}>
      <Button onClick={() => setOpen(true)} type="button">
        Invitar equipo
      </Button>
      <InviteTeamDialog
        competitionName={COMPETITION}
        gameEdition="FC 26"
        link={link}
        onInvite={onInvite}
        onOpenChange={setOpen}
        onRegenerateLink={async () => {
          await onRegenerateLink();
          setLink(linkFor("Nuevo-Cod3Z"));
        }}
        onRetryLink={onRetryLink}
        onTabChange={setTab}
        open={open}
        platform="nintendo-switch-2"
        platformLabel={competitionPlatformLabel}
        searchPlayers={searchPlayers}
        tab={tab}
      />
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Competitions/Setup/Invite team",
  component: InviteTeamStory,
  parameters: { layout: "padded" },
  args: {
    initiallyOpen: true,
    initialTab: INVITE_TEAM_TAB.futrob,
    link: linkFor("liga-8K2Mabcd"),
    searchPlayers: fn(async (query: string) =>
      candidates.filter((candidate) =>
        candidate.gamertag.startsWith(query.toLocaleLowerCase("es")),
      ),
    ),
    onInvite: fn(async () => {}),
    onRegenerateLink: fn(async () => {}),
    onRetryLink: fn(),
  },
  argTypes: {
    initiallyOpen: { control: "boolean" },
    initialTab: { control: "inline-radio", options: Object.values(INVITE_TEAM_TAB) },
    link: { control: false },
  },
} satisfies Meta<typeof InviteTeamStory>;

export default meta;
type Story = StoryObj<typeof meta>;

function screen(canvasElement: HTMLElement) {
  return within(canvasElement.ownerDocument.body);
}

export const Playground: Story = {
  args: { initiallyOpen: false },
  play: async ({ canvasElement }) => {
    const body = screen(canvasElement);
    const trigger = body.getByRole("button", { name: "Invitar equipo" });
    await userEvent.click(trigger);
    const dialog = await body.findByRole("dialog", { name: "Invitar equipo" });
    await waitFor(() =>
      expect(within(dialog).getByText("FC 26 · Nintendo Switch 2")).toBeVisible(),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const FutrobInvite: Story = {
  name: "Equipo en Futrob: invitar",
  play: async ({ args, canvasElement }) => {
    const body = screen(canvasElement);
    await userEvent.type(await body.findByRole("searchbox", { name: "Buscar capitán" }), "Con");
    await userEvent.click(await body.findByRole("button", { name: /Cóndor FC/ }));
    await expect(body.getByText("1 jugador seleccionado")).toBeVisible();
    const messageField = body.getByRole("textbox", { name: "Mensaje" });
    await waitFor(() => expect(messageField).toHaveFocus());
    await userEvent.type(messageField, "¡Hola! Nos gustaría contar con Cóndor FC.");
    await userEvent.click(body.getByRole("button", { name: "Enviar invitación" }));
    await waitFor(() =>
      expect(args.onInvite).toHaveBeenCalledWith({
        inviteeActorId: "act-condor",
        inviteeLabel: "condor10",
        message: "¡Hola! Nos gustaría contar con Cóndor FC.",
      }),
    );
    await expect(await body.findByText(/Invitación enviada a condor10/)).toBeVisible();
    await expect(body.getByText("Ningún jugador seleccionado")).toBeVisible();
  },
};

export const FutrobUnavailablePlayers: Story = {
  name: "Equipo en Futrob: jugadores no disponibles",
  play: async ({ canvasElement }) => {
    const body = screen(canvasElement);
    await userEvent.type(await body.findByRole("searchbox", { name: "Buscar capitán" }), "cond");
    const pending = await body.findByRole("button", { name: /condorito_7/ });
    await expect(pending).toBeDisabled();
    await expect(within(pending).getByText("Invitación pendiente")).toBeVisible();
    const playing = body.getByRole("button", { name: /Las Condesas/ });
    await expect(playing).toBeDisabled();
    await expect(within(playing).getByText("Ya participa")).toBeVisible();
    await expect(body.getByRole("button", { name: /Cóndor FC/ })).toBeEnabled();
  },
};

export const FutrobSearchNeedsThreeCharacters: Story = {
  name: "Equipo en Futrob: mínimo 3 caracteres",
  play: async ({ args, canvasElement }) => {
    const body = screen(canvasElement);
    const search = await body.findByRole("searchbox", { name: "Buscar capitán" });
    await userEvent.type(search, "co");
    await new Promise((resolve) => setTimeout(resolve, 500));
    await expect(args.searchPlayers).not.toHaveBeenCalled();
    await userEvent.type(search, "n");
    await waitFor(() => expect(args.searchPlayers).toHaveBeenCalledWith("con"));
  },
};

export const FutrobNoResults: Story = {
  name: "Equipo en Futrob: sin resultados",
  args: {
    searchPlayers: fn(async (_query: string): Promise<EntryInviteeCandidateDto[]> => []),
  },
  play: async ({ canvasElement }) => {
    const body = screen(canvasElement);
    await userEvent.type(await body.findByRole("searchbox", { name: "Buscar capitán" }), "zzz");
    await expect(await body.findByText("Ningún jugador coincide con ese gamertag.")).toBeVisible();
    await expect(body.getByRole("button", { name: "Enviar invitación" })).toBeDisabled();
  },
};

export const FutrobSending: Story = {
  name: "Equipo en Futrob: enviando",
  args: { onInvite: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvasElement }) => {
    const body = screen(canvasElement);
    await userEvent.type(await body.findByRole("searchbox", { name: "Buscar capitán" }), "con");
    await userEvent.click(await body.findByRole("button", { name: /Cóndor FC/ }));
    await userEvent.click(body.getByRole("button", { name: "Enviar invitación" }));
    const sending = await body.findByRole("button", { name: "Enviando…" });
    await expect(sending).toBeDisabled();
    await expect(sending).toHaveAttribute("aria-busy", "true");
  },
};

export const FutrobPendingConflict: Story = {
  name: "Equipo en Futrob: ya invitado",
  args: {
    onInvite: fn(async () => {
      throw new CompetitionsClientError(409, "competitions.entry_invitation_pending_conflict");
    }),
  },
  play: async ({ canvasElement }) => {
    const body = screen(canvasElement);
    await userEvent.type(await body.findByRole("searchbox", { name: "Buscar capitán" }), "con");
    await userEvent.click(await body.findByRole("button", { name: /Cóndor FC/ }));
    await userEvent.click(body.getByRole("button", { name: "Enviar invitación" }));
    await expect(
      await body.findByText("Este jugador ya tiene una invitación pendiente a la competición."),
    ).toBeVisible();
    await expect(body.getByRole("group", { name: "Seleccionado: Cóndor FC" })).toBeVisible();
  },
};

export const LinkShare: Story = {
  name: "Por enlace: copiar y WhatsApp",
  args: { initialTab: INVITE_TEAM_TAB.futrob },
  play: async ({ canvasElement }) => {
    const writeText = fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const body = screen(canvasElement);
    const futrobTab = await body.findByRole("tab", { name: "Equipo en Futrob" });
    const linkTab = body.getByRole("tab", { name: "Por enlace" });
    futrobTab.focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(linkTab).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(linkTab).toHaveAttribute("aria-selected", "true"));
    await expect(body.getByRole("textbox", { name: "Enlace de invitación" })).toHaveValue(
      "https://futrob.app/entry-invitations/link/liga-8K2Mabcd",
    );
    await userEvent.click(body.getByRole("button", { name: "Copiar enlace" }));
    await expect(await body.findByRole("button", { name: "Copiado" })).toBeVisible();
    await expect(writeText).toHaveBeenCalledWith(
      "https://futrob.app/entry-invitations/link/liga-8K2Mabcd",
    );
    const whatsApp = body.getByRole("link", { name: "Compartir por WhatsApp" });
    await expect(whatsApp).toHaveAttribute(
      "href",
      "https://wa.me/?text=Te%20invito%20a%20inscribir%20tu%20equipo%20en%20Liga%20Interclubes%20en%20Futrob%3A%20https%3A%2F%2Ffutrob.app%2Fentry-invitations%2Flink%2Fliga-8K2Mabcd",
    );
    await expect(whatsApp).toHaveAttribute("target", "_blank");
    await expect(body.getByText("Enlace activo")).toBeVisible();
  },
};

export const LinkRegenerate: Story = {
  name: "Por enlace: regenerar",
  args: { initialTab: INVITE_TEAM_TAB.link },
  play: async ({ args, canvasElement }) => {
    const body = screen(canvasElement);
    await userEvent.click(await body.findByRole("button", { name: "Regenerar enlace" }));
    await expect(
      body.getByText("¿Regenerar? El enlace anterior dejará de funcionar."),
    ).toBeVisible();
    await expect(args.onRegenerateLink).not.toHaveBeenCalled();
    await userEvent.click(body.getByRole("button", { name: "Regenerar" }));
    await waitFor(() => expect(args.onRegenerateLink).toHaveBeenCalledTimes(1));
    await expect(body.getByRole("textbox", { name: "Enlace de invitación" })).toHaveValue(
      "https://futrob.app/entry-invitations/link/Nuevo-Cod3Z",
    );
  },
};

export const LinkLoading: Story = {
  name: "Por enlace: cargando",
  args: { initialTab: INVITE_TEAM_TAB.link, link: { kind: "loading" } },
  play: async ({ canvasElement }) => {
    const body = screen(canvasElement);
    await expect(await body.findByRole("status", { name: "Cargando enlace" })).toBeVisible();
    await expect(body.getByText("Preparando el enlace")).toBeVisible();
    await expect(body.queryByRole("button", { name: "Copiar enlace" })).toBeNull();
    await expect(body.queryByRole("button", { name: "Regenerar enlace" })).toBeNull();
    await expect(body.getByRole("button", { name: "Listo" })).toBeEnabled();
  },
};

export const LinkError: Story = {
  name: "Por enlace: error",
  args: {
    initialTab: INVITE_TEAM_TAB.link,
    link: {
      kind: "error",
      error: new CompetitionsClientError(409, "competitions.not_editable"),
    },
  },
  play: async ({ args, canvasElement }) => {
    const body = screen(canvasElement);
    await expect(
      await body.findByText(/La competición ya no admite equipos nuevos\./),
    ).toBeVisible();
    await userEvent.click(body.getByRole("button", { name: "Reintentar" }));
    await expect(args.onRetryLink).toHaveBeenCalledTimes(1);
  },
};

export const TouchTargets: Story = {
  name: "Objetivos táctiles",
  play: async ({ canvasElement }) => {
    const body = screen(canvasElement);
    for (const name of ["Enviar invitación", "Cancelar"]) {
      const button = await body.findByRole("button", { name });
      await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};
