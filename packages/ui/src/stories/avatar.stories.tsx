import type { Meta, StoryObj } from "@storybook/react-vite";

import { Avatar, AvatarFallback, AvatarImage } from "../components/avatar";

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
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <Avatar className="size-8">
        <AvatarImage
          alt="Fera Enjaulada"
          src="https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png"
        />
        <AvatarFallback>FE</AvatarFallback>
      </Avatar>
      <div className="grid min-w-0 gap-0.5">
        <span className="font-semibold">Fera Enjaulada</span>
        <span className="typo-caption text-muted-foreground">Cross-gen · fc26</span>
      </div>
    </div>
  ),
};
