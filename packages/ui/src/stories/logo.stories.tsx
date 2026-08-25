import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyHost, applyStyles, colors, typography } from "@futrob/ui";

import { Logo } from "../logo";

const styles = stylex.create({
  playgroundLogo: {
    height: "3rem",
    width: "auto",
    maxWidth: "none",
  },
  brandLogo: {
    height: "4rem",
    width: "auto",
  },
  logoMd: {
    height: "3rem",
    width: "auto",
  },
  logoSm: {
    height: "2.25rem",
    width: "auto",
  },
  logoLg: {
    height: "4rem",
    width: "auto",
  },
  panel: {
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "2rem",
    color: colors.foreground,
  },
  monoRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "2rem",
  },
  monoOnSurface: {
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
    color: colors.foreground,
  },
  monoOnDark: {
    borderRadius: "var(--corner-xl)",
    backgroundColor: colors.foreground,
    padding: "1.5rem",
    color: colors.background,
  },
  caption: {
    marginBottom: "0.75rem",
    color: colors.mutedForeground,
  },
  captionOnDark: {
    marginBottom: "0.75rem",
    color: "color-mix(in oklab, var(--background) 70%, transparent)",
  },
  muted: { color: colors.mutedForeground },
  sizes: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "1.5rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  group: {
    display: "grid",
    gap: "0.5rem",
  },
  wordmark: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingInline: "1.25rem",
    paddingBlock: "1rem",
  },
  heading: {
    letterSpacing: "0.025em",
  },
  decorative: {
    display: "grid",
    maxWidth: "24rem",
    gap: "0.75rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  code: {
    fontSize: "var(--text-xs)",
  },
  inlineRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
});

const playgroundLogo = applyStyles(styles.playgroundLogo);
const brandLogo = applyStyles(styles.brandLogo);

const meta = {
  title: "Primitives/Logo",
  component: Logo,
  parameters: {
    layout: "centered",
  },
  args: {
    className: playgroundLogo.className,
    style: playgroundLogo.style,
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
    <div {...applyHost(undefined, undefined, styles.panel)}>
      <Logo {...args} />
    </div>
  ),
};

export const Brand: Story = {
  name: "Brand green",
  args: {
    monochrome: false,
    title: "Futrob",
    className: brandLogo.className,
    style: brandLogo.style,
  },
};

export const Monochrome: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.monoRow)}>
      <div {...applyHost(undefined, undefined, styles.monoOnSurface)}>
        <p {...applyHost(undefined, undefined, typography.caption, styles.caption)}>On surface</p>
        <Logo monochrome title="Futrob" {...applyHost(undefined, undefined, styles.logoMd)} />
      </div>
      <div {...applyHost(undefined, undefined, styles.monoOnDark)}>
        <p {...applyHost(undefined, undefined, typography.caption, styles.captionOnDark)}>
          On dark / print
        </p>
        <Logo monochrome title="Futrob" {...applyHost(undefined, undefined, styles.logoMd)} />
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.sizes)}>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>Header · 36 px</p>
        <Logo title="Futrob" {...applyHost(undefined, undefined, styles.logoSm)} />
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>Auth · 48 px</p>
        <Logo title="Futrob" {...applyHost(undefined, undefined, styles.logoMd)} />
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>Hero · 64 px</p>
        <Logo title="Futrob" {...applyHost(undefined, undefined, styles.logoLg)} />
      </div>
    </div>
  ),
};

export const WithWordmark: Story = {
  name: "With wordmark",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.wordmark)}>
      <Logo aria-hidden="true" {...applyHost(undefined, undefined, styles.logoSm)} />
      <span {...applyHost(undefined, undefined, typography.heading, styles.heading)}>Futrob</span>
    </div>
  ),
};

export const Decorative: Story = {
  name: "Decorative (no title)",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.decorative)}>
      <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
        Sin <code {...applyHost(undefined, undefined, styles.code)}>title</code> el SVG es decorativo
        (<code {...applyHost(undefined, undefined, styles.code)}>aria-hidden</code>) cuando el
        wordmark visible ya dice Futrob.
      </p>
      <div {...applyHost(undefined, undefined, styles.inlineRow)}>
        <Logo {...applyHost(undefined, undefined, styles.logoSm)} />
        <span {...applyHost(undefined, undefined, typography.heading, styles.heading)}>Futrob</span>
      </div>
    </div>
  ),
};
