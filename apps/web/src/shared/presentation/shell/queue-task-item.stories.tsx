import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ArrowsClockwise,
  ArrowsLeftRight,
  CheckSquare,
  CircleDashed,
  EnvelopeSimple,
  MagnifyingGlass,
  PencilSimple,
  Plugs,
  Plus,
  SealWarning,
  SquaresFour,
  UserPlus,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@futrob/ui";
import type { ComponentProps, ReactNode } from "react";

import { QueueTaskItem } from "./queue-task-item.tsx";

type StoryArgs = ComponentProps<typeof QueueTaskItem>;

const meta = {
  title: "Product/Shell/QueueTaskItem",
  component: QueueTaskItem,
  parameters: { layout: "padded" },
  args: {
    icon: CheckSquare,
    title: "Confirmar selección",
    subtitle: "Nova FC vs Atlas · J4",
    meta: "14h",
    tone: "default",
    dense: true,
    compact: false,
    active: false,
    disabled: false,
  },
  argTypes: {
    icon: { control: false },
    tone: {
      control: "select",
      options: ["default", "urgent", "waiting", "resolved"],
    },
    href: { control: "text" },
    onClick: { action: "click" },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  decorators: [
    (Story) => (
      <QueuePanel label="Cola">
        <Story />
      </QueuePanel>
    ),
  ],
};

export const States: Story = {
  name: "States",
  render: () => (
    <div className="flex flex-col gap-6">
      <QueuePanel label="default / active / disabled / resolved">
        <QueueTaskItem
          icon={CheckSquare}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          active
          icon={CheckSquare}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          disabled
          icon={CheckSquare}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          disabled
          icon={CheckSquare}
          meta="hecha"
          subtitle="Esta tarea ya no está pendiente"
          title="Confirmar selección"
          tone="resolved"
        />
      </QueuePanel>
      <QueuePanel label="tone">
        <QueueTaskItem
          icon={CheckSquare}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="default"
          tone="default"
        />
        <QueueTaskItem
          icon={WarningCircle}
          meta="urg"
          subtitle="Nova FC vs Atlas · J4"
          title="urgent"
          tone="urgent"
        />
        <QueueTaskItem
          icon={CircleDashed}
          meta="18h"
          subtitle="Nova FC vs Atlas · J4"
          title="waiting"
          tone="waiting"
        />
        <QueueTaskItem
          disabled
          icon={CheckSquare}
          meta="hecha"
          subtitle="Nova FC vs Atlas · J4"
          title="resolved"
          tone="resolved"
        />
      </QueuePanel>
    </div>
  ),
};

export const Density: Story = {
  name: "Density",
  render: () => (
    <div className="flex flex-wrap gap-6">
      <QueuePanel label="dense (default shell)">
        <QueueTaskItem
          dense
          icon={CheckSquare}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
      </QueuePanel>
      <QueuePanel label="default control height">
        <QueueTaskItem
          dense={false}
          icon={CheckSquare}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
      </QueuePanel>
      <QueuePanel className="w-14" label="compact / icon rail">
        <QueueTaskItem
          compact
          icon={CheckSquare}
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          compact
          icon={ArrowsClockwise}
          subtitle="Titans vs Orion · P1"
          title="Responder reprogramación"
        />
        <QueueTaskItem
          compact
          icon={WarningCircle}
          subtitle="Nova FC vs Atlas · J4"
          title="Resolver desacuerdo"
          tone="urgent"
        />
      </QueuePanel>
    </div>
  ),
};

export const AsLink: Story = {
  name: "As link",
  args: {
    href: "/orgs/org_1/competitions/cmp_1/encounters/enc_1/selection",
    title: "Confirmar selección",
    subtitle: "Nova FC vs Atlas · J4",
    meta: "14h",
    icon: CheckSquare,
  },
  decorators: [
    (Story) => (
      <QueuePanel label="Cola">
        <Story />
      </QueuePanel>
    ),
  ],
};

export const PersonalContext: Story = {
  name: "Context / Personal",
  render: () => (
    <QueuePanel label="Espacio personal">
      <QueueTaskItem
        icon={EnvelopeSimple}
        meta="3d"
        subtitle="Liga Nocturna · Nova FC"
        title="Aceptar invitación"
      />
      <QueueTaskItem
        icon={Plugs}
        meta="·"
        subtitle="EA Sports FC · Clubs"
        title="Vincular cuenta de juego"
      />
      <QueueTaskItem
        icon={PencilSimple}
        meta="·"
        subtitle="Falta nombre público"
        title="Completar perfil de jugador"
      />
    </QueuePanel>
  ),
};

export const OrganizationContext: Story = {
  name: "Context / Organization",
  render: () => (
    <QueuePanel label="Organización">
      <QueueTaskItem
        icon={Plus}
        meta="·"
        subtitle="Copa Primavera"
        title="Completar competición borrador"
      />
      <QueueTaskItem
        icon={UserPlus}
        meta="2d"
        subtitle="marco@ejemplo.com · staff"
        title="Aprobar membresía"
      />
      <QueueTaskItem
        icon={EnvelopeSimple}
        meta="·"
        subtitle="3 pendientes de aceptación"
        title="Revisar invitaciones enviadas"
      />
    </QueuePanel>
  ),
};

export const CaptainContext: Story = {
  name: "Context / Competition captain",
  render: () => (
    <QueuePanel label="Competición · capitán">
      <QueueTaskItem
        icon={SquaresFour}
        meta="·"
        subtitle="Nova FC vs Atlas · J4"
        title="Elegir partidos oficiales"
      />
      <QueueTaskItem
        icon={CircleDashed}
        meta="18h"
        subtitle="Nova FC vs Atlas · J4"
        title="Esperando confirmación rival"
        tone="waiting"
      />
      <QueueTaskItem
        icon={CheckSquare}
        meta="14h"
        subtitle="Nova FC vs Atlas · J4"
        title="Confirmar selección"
      />
      <QueueTaskItem
        icon={ArrowsLeftRight}
        meta="9h"
        subtitle="Nova FC vs Atlas · J4"
        title="Revisar contrapropuesta"
      />
      <QueueTaskItem
        icon={ArrowsClockwise}
        meta="6h"
        subtitle="Nova FC vs Atlas · partido 2"
        title="Responder reprogramación"
      />
      <QueueTaskItem
        icon={CircleDashed}
        meta="20h"
        subtitle="Titans vs Orion · encuentro"
        title="Esperando rival (horario)"
        tone="waiting"
      />
      <QueueTaskItem
        icon={WarningCircle}
        meta="·"
        subtitle="Titans vs Orion · J5"
        title="Disputa en revisión"
        tone="urgent"
      />
      <QueueTaskItem
        icon={MagnifyingGlass}
        meta="·"
        subtitle="Nova FC vs Atlas · selección"
        title="Ver decisión del organizador"
      />
      <QueueTaskItem
        icon={SealWarning}
        meta="·"
        subtitle="Plantilla · jugador inelegible"
        title="Revisar sanción"
        tone="urgent"
      />
      <QueueTaskItem
        icon={CircleDashed}
        meta="·"
        subtitle="Club EA · verificación"
        title="Inscripción pendiente de org"
        tone="waiting"
      />
    </QueuePanel>
  ),
};

export const OrganizerContext: Story = {
  name: "Context / Competition organizer",
  render: () => (
    <QueuePanel label="Competición · organizador">
      <QueueTaskItem
        icon={WarningCircle}
        meta="urg"
        subtitle="Nova FC vs Atlas · J4"
        title="Resolver desacuerdo"
        tone="urgent"
      />
      <QueueTaskItem
        icon={WarningCircle}
        meta="urg"
        subtitle="Titans vs Orion · J5"
        title="Revisar disputa"
        tone="urgent"
      />
      <QueueTaskItem
        icon={CheckSquare}
        meta="2d"
        subtitle="Rivals United · club EA"
        title="Aprobar inscripción equipo"
      />
      <QueueTaskItem
        icon={ArrowsClockwise}
        meta="1d"
        subtitle="Nova FC vs Atlas · P1"
        title="Resolver reprogramación"
      />
      <QueueTaskItem
        icon={Plugs}
        meta="·"
        subtitle="Fallos recientes · Clubs"
        title="Revisar sync EA"
      />
      <QueueTaskItem
        icon={SquaresFour}
        meta="·"
        subtitle="4 enfrentamientos · J3"
        title="Revisar candidatos sin asignar"
      />
      <QueueTaskItem
        icon={SealWarning}
        meta="·"
        subtitle="Orion FC · walkover"
        title="Aplicar sanción"
        tone="urgent"
      />
      <QueueTaskItem
        icon={PencilSimple}
        meta="·"
        subtitle="Sigue en borrador"
        title="Publicar competición"
      />
    </QueuePanel>
  ),
};

export const Empty: Story = {
  name: "Empty queue",
  render: () => (
    <div className="w-72 rounded-xl border border-border bg-surface p-3">
      <p className="mb-2 px-2.5 typo-label text-muted-foreground">Cola</p>
      <div className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center">
        <p className="text-sm font-medium text-foreground">Sin tareas pendientes</p>
        <p className="typo-caption text-muted-foreground">
          Las tareas del espacio activo aparecerán aquí.
        </p>
      </div>
    </div>
  ),
};

export const Loading: Story = {
  name: "Loading",
  render: () => (
    <div className="w-72 rounded-xl border border-border bg-surface p-3">
      <p className="mb-2 px-2.5 typo-label text-muted-foreground">Cola</p>
      <ul aria-busy="true" aria-label="Cargando cola" className="flex flex-col gap-2">
        <li className="h-10 animate-pulse rounded-lg bg-muted" />
        <li className="h-10 animate-pulse rounded-lg bg-muted" />
        <li className="h-10 animate-pulse rounded-lg bg-muted" />
      </ul>
    </div>
  ),
};

export const ErrorState: Story = {
  name: "Error",
  render: () => (
    <div className="w-72 rounded-xl border border-border bg-surface p-3">
      <p className="mb-2 px-2.5 typo-label text-muted-foreground">Cola</p>
      <div className="rounded-lg border border-border px-3 py-4 text-center" role="alert">
        <p className="text-sm font-medium text-foreground">No se pudo cargar la cola</p>
        <p className="typo-caption text-muted-foreground">Reintentar</p>
      </div>
    </div>
  ),
};

function QueuePanel({
  children,
  className,
  label,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly label: string;
}) {
  return (
    <div className={cn("w-72 rounded-xl border border-border bg-surface p-3", className)}>
      <p className="mb-2 px-2.5 typo-caption text-muted-foreground">{label}</p>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}
