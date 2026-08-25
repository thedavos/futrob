import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyHost, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import { Avatar, AvatarFallback, AvatarImage } from "../components/avatar";

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingInline: "0.75rem",
    paddingBlock: "0.5rem",
  },
  avatar: {
    width: "2rem",
    height: "2rem",
  },
  copy: {
    display: "grid",
    minWidth: 0,
    gap: "0.125rem",
  },
  name: { fontWeight: 600 },
  muted: { color: colors.mutedForeground },
});

const meta = {
  title: "Primitives/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage
        alt="Fera Enjaulada"
        src="https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png"
      />
      <AvatarFallback>FE</AvatarFallback>
    </Avatar>
  ),
};

export const FallbackOnly: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>NO</AvatarFallback>
    </Avatar>
  ),
};

export const ImageErrorFallsBack: Story = {
  render: () => (
    <Avatar>
      <AvatarImage alt="Broken crest" src="https://example.invalid/crest.png" />
      <AvatarFallback>BC</AvatarFallback>
    </Avatar>
  ),
};

export const DenseRow: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.row)}>
      <Avatar {...applyHost(undefined, undefined, styles.avatar)}>
        <AvatarImage
          alt="Fera Enjaulada"
          src="https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png"
        />
        <AvatarFallback>FE</AvatarFallback>
      </Avatar>
      <div {...applyHost(undefined, undefined, styles.copy)}>
        <span {...applyHost(undefined, undefined, styles.name)}>Fera Enjaulada</span>
        <span {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
          Cross-gen · fc26
        </span>
      </div>
    </div>
  ),
};
