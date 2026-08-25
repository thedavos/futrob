import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, colors, typography } from "@futrob/ui";
import { CommandBarIdentityMark } from "./command-bar-identity-mark.tsx";
import type { CommandBarIdentity } from "./command-bar-identity.ts";

const styles = stylex.create({
  chrome: {
    display: "flex",
    height: "3.5rem",
    alignItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingInline: "1.25rem",
  },
  slot: {
    display: "flex",
    minWidth: 0,
    flex: 1,
    alignItems: "center",
  },
  states: {
    display: "flex",
    maxWidth: "36rem",
    flexDirection: "column",
    gap: "1.5rem",
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  muted: { color: colors.mutedForeground },
});

type StoryArgs = CommandBarIdentity & {
  readonly emptyLabel: string;
  readonly ready: boolean;
};

const meta = {
  title: "Product/Shell/CommandBarIdentity",
  parameters: { layout: "padded" },
  args: {
    gamertag: "davos282",
    clubName: "Fera Enjaulada",
    imageUrl: null,
    emptyLabel: "Espacio personal",
    ready: true,
  },
  argTypes: {
    gamertag: { control: "text" },
    clubName: { control: "text" },
    imageUrl: { control: "text" },
    emptyLabel: { control: "text" },
    ready: { control: "boolean" },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

function Chrome({ children }: { readonly children: ReactNode }) {
  return (
    <header {...applyHost(undefined, undefined, styles.chrome)}>
      <div {...applyHost(undefined, undefined, styles.slot)}>{children}</div>
    </header>
  );
}

function identityFromArgs(args: StoryArgs): CommandBarIdentity {
  return {
    gamertag: args.gamertag?.trim() || null,
    clubName: args.clubName?.trim() || null,
    imageUrl: args.imageUrl?.trim() || null,
  };
}

export const Playground: Story = {
  render: (args) => (
    <Chrome>
      <CommandBarIdentityMark
        emptyLabel={args.emptyLabel}
        identity={identityFromArgs(args)}
        ready={args.ready}
      />
    </Chrome>
  ),
};

export const States: Story = {
  name: "States",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.states)}>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>Cuenta y club</p>
        <Chrome>
          <CommandBarIdentityMark
            emptyLabel="Espacio personal"
            identity={{
              gamertag: "davos282",
              clubName: "Fera Enjaulada",
              imageUrl: null,
            }}
          />
        </Chrome>
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
          Solo identificador
        </p>
        <Chrome>
          <CommandBarIdentityMark
            emptyLabel="Espacio personal"
            identity={{ gamertag: "davos282", clubName: null, imageUrl: null }}
          />
        </Chrome>
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>Solo club</p>
        <Chrome>
          <CommandBarIdentityMark
            emptyLabel="Espacio personal"
            identity={{ gamertag: null, clubName: "Fera Enjaulada", imageUrl: null }}
          />
        </Chrome>
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>Sin datos</p>
        <Chrome>
          <CommandBarIdentityMark
            emptyLabel="Espacio personal"
            identity={{ gamertag: null, clubName: null, imageUrl: null }}
          />
        </Chrome>
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>Cargando</p>
        <Chrome>
          <CommandBarIdentityMark
            emptyLabel="Espacio personal"
            identity={{ gamertag: null, clubName: null, imageUrl: null }}
            ready={false}
          />
        </Chrome>
      </div>
    </div>
  ),
};
