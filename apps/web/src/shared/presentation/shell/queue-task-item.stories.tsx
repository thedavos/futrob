import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ArrowsClockwiseIcon,
  ArrowsLeftRightIcon,
  CheckSquareIcon,
  CircleDashedIcon,
  EnvelopeSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlugsIcon,
  PlusIcon,
  SealWarningIcon,
  SquaresFourIcon,
  UserPlusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  applyHost,
  Button,
  colors,
  motion,
  typography,
} from "@futrob/ui";
import type { ComponentProps, ReactNode } from "react";

import { QueueTaskItem } from "./queue-task-item.tsx";

const styles = stylex.create({
  states: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  density: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1.5rem",
  },
  panel: {
    display: "flex",
    width: "18rem",
    flexDirection: "column",
    gap: "1rem",
    borderRadius: "var(--corner-2xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "0.75rem",
  },
  heading: {
    paddingInline: "0.625rem",
    fontWeight: 600,
    textWrap: "pretty",
    color: colors.mutedForeground,
  },
  emptyBox: {
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    paddingInline: "0.75rem",
    paddingBlock: "1rem",
    textAlign: "center",
  },
  emptyCopy: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  emptyTitle: {
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    textWrap: "pretty",
    color: colors.foreground,
  },
  emptyHint: {
    fontWeight: 500,
    textWrap: "pretty",
    color: colors.mutedForeground,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  skeleton: {
    height: "2.5rem",
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
  },
  alert: {
    rowGap: "0.75rem",
  },
  alertTitle: {
    fontWeight: 700,
  },
  alertBody: {
    display: "grid",
    gap: "1rem",
  },
  alertHint: {
    fontWeight: 500,
    textWrap: "pretty",
  },
  railWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  rail: {
    width: "fit-content",
    borderRadius: "var(--corner-2xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "0.5rem",
  },
});

type StoryArgs = ComponentProps<typeof QueueTaskItem>;

const meta = {
  title: "Product/Shell/QueueTaskItem",
  component: QueueTaskItem,
  parameters: { layout: "padded" },
  args: {
    icon: CheckSquareIcon,
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
      <QueuePanel label="Tareas">
        <Story />
      </QueuePanel>
    ),
  ],
};

export const States: Story = {
  name: "States",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.states)}>
      <QueuePanel label="default / active / disabled / resolved">
        <QueueTaskItem
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          active
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          disabled
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          disabled
          icon={CheckSquareIcon}
          meta="hecha"
          subtitle="Esta tarea ya no está pendiente"
          title="Confirmar selección"
          tone="resolved"
        />
      </QueuePanel>
      <QueuePanel label="tone">
        <QueueTaskItem
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="default"
          tone="default"
        />
        <QueueTaskItem
          icon={WarningCircleIcon}
          meta="urg"
          subtitle="Nova FC vs Atlas · J4"
          title="urgent"
          tone="urgent"
        />
        <QueueTaskItem
          icon={CircleDashedIcon}
          meta="18h"
          subtitle="Nova FC vs Atlas · J4"
          title="waiting"
          tone="waiting"
        />
        <QueueTaskItem
          disabled
          icon={CheckSquareIcon}
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
    <div {...applyHost(undefined, undefined, styles.density)}>
      <QueuePanel label="dense (default shell)">
        <QueueTaskItem
          dense
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
      </QueuePanel>
      <QueuePanel label="default control height">
        <QueueTaskItem
          dense={false}
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
      </QueuePanel>
      <QueuePanel label="compact / icon rail" rail>
        <QueueTaskItem
          compact
          icon={CheckSquareIcon}
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          compact
          icon={ArrowsClockwiseIcon}
          subtitle="Titans vs Orion · P1"
          title="Responder reprogramación"
        />
        <QueueTaskItem
          compact
          icon={WarningCircleIcon}
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
    icon: CheckSquareIcon,
  },
  decorators: [
    (Story) => (
      <QueuePanel label="Tareas">
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
        icon={EnvelopeSimpleIcon}
        meta="3d"
        subtitle="Liga Nocturna · Nova FC"
        title="Aceptar invitación"
      />
      <QueueTaskItem
        icon={PlugsIcon}
        meta="·"
        subtitle="EA Sports FC · Clubs"
        title="Vincular cuenta de juego"
      />
      <QueueTaskItem
        icon={PencilSimpleIcon}
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
        icon={PlusIcon}
        meta="·"
        subtitle="Copa Primavera"
        title="Completar competición borrador"
      />
      <QueueTaskItem
        icon={UserPlusIcon}
        meta="2d"
        subtitle="marco@ejemplo.com · staff"
        title="Aprobar membresía"
      />
      <QueueTaskItem
        icon={EnvelopeSimpleIcon}
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
        icon={SquaresFourIcon}
        meta="·"
        subtitle="Nova FC vs Atlas · J4"
        title="Elegir partidos oficiales"
      />
      <QueueTaskItem
        icon={CircleDashedIcon}
        meta="18h"
        subtitle="Nova FC vs Atlas · J4"
        title="Esperando confirmación rival"
        tone="waiting"
      />
      <QueueTaskItem
        icon={CheckSquareIcon}
        meta="14h"
        subtitle="Nova FC vs Atlas · J4"
        title="Confirmar selección"
      />
      <QueueTaskItem
        icon={ArrowsLeftRightIcon}
        meta="9h"
        subtitle="Nova FC vs Atlas · J4"
        title="Revisar contrapropuesta"
      />
      <QueueTaskItem
        icon={ArrowsClockwiseIcon}
        meta="6h"
        subtitle="Nova FC vs Atlas · partido 2"
        title="Responder reprogramación"
      />
      <QueueTaskItem
        icon={CircleDashedIcon}
        meta="20h"
        subtitle="Titans vs Orion · encuentro"
        title="Esperando rival (horario)"
        tone="waiting"
      />
      <QueueTaskItem
        icon={WarningCircleIcon}
        meta="·"
        subtitle="Titans vs Orion · J5"
        title="Disputa en revisión"
        tone="urgent"
      />
      <QueueTaskItem
        icon={MagnifyingGlassIcon}
        meta="·"
        subtitle="Nova FC vs Atlas · selección"
        title="Ver decisión del organizador"
      />
      <QueueTaskItem
        icon={SealWarningIcon}
        meta="·"
        subtitle="Plantilla · jugador inelegible"
        title="Revisar sanción"
        tone="urgent"
      />
      <QueueTaskItem
        icon={CircleDashedIcon}
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
        icon={WarningCircleIcon}
        meta="urg"
        subtitle="Nova FC vs Atlas · J4"
        title="Resolver desacuerdo"
        tone="urgent"
      />
      <QueueTaskItem
        icon={WarningCircleIcon}
        meta="urg"
        subtitle="Titans vs Orion · J5"
        title="Revisar disputa"
        tone="urgent"
      />
      <QueueTaskItem
        icon={CheckSquareIcon}
        meta="2d"
        subtitle="Rivals United · club EA"
        title="Aprobar inscripción equipo"
      />
      <QueueTaskItem
        icon={ArrowsClockwiseIcon}
        meta="1d"
        subtitle="Nova FC vs Atlas · P1"
        title="Resolver reprogramación"
      />
      <QueueTaskItem
        icon={PlugsIcon}
        meta="·"
        subtitle="Fallos recientes · Clubs"
        title="Revisar sync EA"
      />
      <QueueTaskItem
        icon={SquaresFourIcon}
        meta="·"
        subtitle="4 enfrentamientos · J3"
        title="Revisar candidatos sin asignar"
      />
      <QueueTaskItem
        icon={SealWarningIcon}
        meta="·"
        subtitle="Orion FC · walkover"
        title="Aplicar sanción"
        tone="urgent"
      />
      <QueueTaskItem
        icon={PencilSimpleIcon}
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
    <div {...applyHost(undefined, undefined, styles.panel)}>
      <p {...applyHost(undefined, undefined, typography.label, styles.heading)}>Tareas</p>
      <div {...applyHost(undefined, undefined, styles.emptyBox)}>
        <div {...applyHost(undefined, undefined, styles.emptyCopy)}>
          <p {...applyHost(undefined, undefined, styles.emptyTitle)}>Sin tareas pendientes</p>
          <p {...applyHost(undefined, undefined, typography.caption, styles.emptyHint)}>
            Las tareas del espacio activo aparecerán aquí.
          </p>
        </div>
      </div>
    </div>
  ),
};

export const Loading: Story = {
  name: "Loading",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.panel)}>
      <p {...applyHost(undefined, undefined, typography.label, styles.heading)}>Tareas</p>
      <ul
        aria-busy="true"
        aria-label="Cargando tareas"
        role="status"
        {...applyHost(undefined, undefined, styles.list)}
      >
        <li {...applyHost(undefined, undefined, motion.pulse, styles.skeleton)} />
        <li {...applyHost(undefined, undefined, motion.pulse, styles.skeleton)} />
        <li {...applyHost(undefined, undefined, motion.pulse, styles.skeleton)} />
      </ul>
    </div>
  ),
};

export const ErrorState: Story = {
  name: "Error",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.panel)}>
      <p {...applyHost(undefined, undefined, typography.label, styles.heading)}>Tareas</p>
      <Alert variant="destructive" {...applyHost(undefined, undefined, styles.alert)}>
        <WarningCircleIcon aria-hidden="true" />
        <AlertTitle {...applyHost(undefined, undefined, styles.alertTitle)}>
          No se pudieron cargar las tareas
        </AlertTitle>
        <AlertDescription {...applyHost(undefined, undefined, styles.alertBody)}>
          <span {...applyHost(undefined, undefined, typography.caption, styles.alertHint)}>
            Conservamos el espacio activo para que puedas reintentar.
          </span>
          <Button dense type="button" variant="outline">
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  ),
};

function QueuePanel({
  children,
  className,
  label,
  rail = false,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly label: string;
  readonly rail?: boolean;
}) {
  const heading = (
    <p {...applyHost(undefined, undefined, typography.label, styles.heading)}>{label}</p>
  );
  const list = <ul {...applyHost(undefined, undefined, styles.list)}>{children}</ul>;

  if (rail) {
    return (
      <div {...applyHost(className, undefined, styles.railWrap)}>
        {heading}
        <div {...applyHost(undefined, undefined, styles.rail)}>{list}</div>
      </div>
    );
  }

  return (
    <div {...applyHost(className, undefined, styles.panel)}>
      <p {...applyHost(undefined, undefined, typography.label, styles.heading)}>{label}</p>
      {list}
    </div>
  );
}
