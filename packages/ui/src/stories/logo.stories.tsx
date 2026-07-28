import type { Meta, StoryObj } from "@storybook/react-vite";

import { Logo } from "../logo";

const meta = {
  title: "Primitives/Logo",
  component: Logo,
  parameters: {
    layout: "centered",
  },
  args: {
    className: "h-12 w-auto max-w-none",
    monochrome: false,
    title: "Futrob",
  },
  argTypes: {
    monochrome: { control: "boolean" },
    title: { control: "text" },
    className: { control: "text" },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="rounded-xl border border-border bg-surface p-8 text-foreground">
      <Logo {...args} />
    </div>
  ),
};

export const Brand: Story = {
  name: "Brand green",
  args: {
    monochrome: false,
    title: "Futrob",
    className: "h-16 w-auto",
  },
};

export const Monochrome: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-8">
      <div className="rounded-xl border border-border bg-surface p-6 text-foreground">
        <p className="typo-caption mb-3 text-muted-foreground">On surface</p>
        <Logo className="h-12 w-auto" monochrome title="Futrob" />
      </div>
      <div className="rounded-xl bg-foreground p-6 text-background">
        <p className="typo-caption mb-3 text-background/70">On dark / print</p>
        <Logo className="h-12 w-auto" monochrome title="Futrob" />
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-6 rounded-xl border border-border bg-surface p-6">
      <div className="grid gap-2">
        <p className="typo-caption text-muted-foreground">Header · 36 px</p>
        <Logo className="h-9 w-auto" title="Futrob" />
      </div>
      <div className="grid gap-2">
        <p className="typo-caption text-muted-foreground">Auth · 48 px</p>
        <Logo className="h-12 w-auto" title="Futrob" />
      </div>
      <div className="grid gap-2">
        <p className="typo-caption text-muted-foreground">Hero · 64 px</p>
        <Logo className="h-16 w-auto" title="Futrob" />
      </div>
    </div>
  ),
};

export const WithWordmark: Story = {
  name: "With wordmark",
  render: () => (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4">
      <Logo aria-hidden="true" className="h-9 w-auto" />
      <span className="typo-heading tracking-wide">Futrob</span>
    </div>
  ),
};

export const Decorative: Story = {
  name: "Decorative (no title)",
  render: () => (
    <div className="grid max-w-sm gap-3 rounded-xl border border-border bg-surface p-6">
      <p className="typo-caption text-muted-foreground">
        Sin <code className="text-xs">title</code> el SVG es decorativo (
        <code className="text-xs">aria-hidden</code>) cuando el wordmark visible ya dice Futrob.
      </p>
      <div className="flex items-center gap-3">
        <Logo className="h-9 w-auto" />
        <span className="typo-heading tracking-wide">Futrob</span>
      </div>
    </div>
  ),
};
