import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { CommandBarIdentityMark } from "./command-bar-identity-mark.tsx";
import type { CommandBarIdentity } from "./command-bar-identity.ts";

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
    <header className="flex h-14 items-center gap-3 rounded-lg border border-border bg-surface px-4">
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
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
    <div className="flex max-w-xl flex-col gap-6">
      <div className="space-y-2">
        <p className="typo-caption text-muted-foreground">Cuenta y club</p>
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
      <div className="space-y-2">
        <p className="typo-caption text-muted-foreground">Solo identificador</p>
        <Chrome>
          <CommandBarIdentityMark
            emptyLabel="Espacio personal"
            identity={{ gamertag: "davos282", clubName: null, imageUrl: null }}
          />
        </Chrome>
      </div>
      <div className="space-y-2">
        <p className="typo-caption text-muted-foreground">Solo club</p>
        <Chrome>
          <CommandBarIdentityMark
            emptyLabel="Espacio personal"
            identity={{ gamertag: null, clubName: "Fera Enjaulada", imageUrl: null }}
          />
        </Chrome>
      </div>
      <div className="space-y-2">
        <p className="typo-caption text-muted-foreground">Sin datos</p>
        <Chrome>
          <CommandBarIdentityMark
            emptyLabel="Espacio personal"
            identity={{ gamertag: null, clubName: null, imageUrl: null }}
          />
        </Chrome>
      </div>
      <div className="space-y-2">
        <p className="typo-caption text-muted-foreground">Cargando</p>
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
