import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { EA_SEARCH_PLATFORM } from "@futrob/api-contracts";
import clubFinderUrl from "@/assets/club-finder.svg";
import {
  ClubSearchResultItem,
  ClubSearchResultList,
  type ClubSearchResult,
} from "./club-search-result-item.tsx";

const feraEnjaulada: ClubSearchResult = {
  name: "Fera Enjaulada",
  imageUrl: clubFinderUrl,
  platform: EA_SEARCH_PLATFORM.CROSS_GEN,
  gameEdition: "fc26",
  externalClubId: "22110",
};

const nightOwls: ClubSearchResult = {
  name: "Fera Night Owls",
  imageUrl: null,
  platform: EA_SEARCH_PLATFORM.CROSS_GEN,
  gameEdition: "fc26",
  externalClubId: "10754",
};

const longName: ClubSearchResult = {
  name: "Fera Enjaulada Night Owls Barranco Unidos",
  imageUrl: null,
  platform: EA_SEARCH_PLATFORM.PS5,
  gameEdition: "fc26",
  externalClubId: "33021",
};

const styles = stylex.create({
  frame: {
    marginInline: "auto",
    width: "min(42rem, calc(100vw - 2rem))",
    backgroundColor: colors.muted,
    padding: "1.25rem",
  },
  list: {
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
});

const meta = {
  title: "Product/Game data/Club search result",
  component: ClubSearchResultItem,
  parameters: { layout: "centered" },
  args: feraEnjaulada,
  argTypes: {
    name: { control: "text" },
    imageUrl: { control: "text" },
    platform: {
      control: "select",
      options: [
        EA_SEARCH_PLATFORM.CROSS_GEN,
        EA_SEARCH_PLATFORM.PS5,
        EA_SEARCH_PLATFORM.XBOX,
        EA_SEARCH_PLATFORM.NINTENDO,
      ],
    },
    gameEdition: { control: "text" },
    externalClubId: { control: "text" },
  },
  decorators: [
    (Story) => (
      <div {...applyProps(undefined, undefined, styles.frame)}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ClubSearchResultItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <ul {...applyProps(undefined, undefined, styles.list)}>
      <ClubSearchResultItem {...args} />
    </ul>
  ),
};

export const WithCrest: Story = {
  name: "With crest",
  args: feraEnjaulada,
  render: Playground.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Fera Enjaulada")).toBeVisible();
    await expect(canvas.getByText("Cross-gen · fc26")).toBeVisible();
    await expect(canvas.getByText("22110")).toBeVisible();
    const crest = canvasElement.querySelector("[data-slot='club-crest-avatar']");
    await expect(crest).not.toBeNull();
    const crestImage = canvasElement.querySelector("[data-slot='club-crest-image']");
    await expect(crestImage).not.toBeNull();
    await expect(crestImage).toHaveAttribute("data-outline", "none");
    await expect(getComputedStyle(crest!).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  },
};

export const Fallback: Story = {
  args: nightOwls,
  render: Playground.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Fera Night Owls")).toBeVisible();
    await expect(canvas.getByText("FN")).toBeVisible();
    await expect(canvas.queryByRole("img")).toBeNull();
    const crest = canvasElement.querySelector("[data-slot='club-crest-avatar']");
    await expect(crest).not.toBeNull();
    await expect(getComputedStyle(crest!).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  },
};

export const LongName: Story = {
  name: "Long name",
  args: longName,
  render: Playground.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Fera Enjaulada Night Owls Barranco Unidos")).toBeVisible();
    await expect(canvas.getByText("PlayStation 5 · fc26")).toBeVisible();
  },
};

export const ResultList: Story = {
  name: "Result list",
  render: () => <ClubSearchResultList clubs={[feraEnjaulada, nightOwls, longName]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("list")).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await expect(canvas.getByText("Fera Enjaulada")).toBeVisible();
    await expect(canvas.getByText("Fera Night Owls")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /Fera Enjaulada/ })).toBeNull();
  },
};

export const Selected: Story = {
  args: { ...feraEnjaulada, selected: true },
  render: Playground.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Fera Enjaulada")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /Fera Enjaulada/ })).toBeNull();
  },
};

export const SelectableList: Story = {
  name: "Selectable list",
  render: function SelectableListStory() {
    const [selectedId, setSelectedId] = useState(feraEnjaulada.externalClubId);
    return (
      <ClubSearchResultList
        aria-label="Resultados de clubs EA"
        clubs={[feraEnjaulada, nightOwls, longName]}
        onSelect={(club) => setSelectedId(club.externalClubId)}
        selectedExternalClubId={selectedId}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fera = canvas.getByRole("button", { name: /Fera Enjaulada Cross-gen/ });
    await expect(fera).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", { name: /Fera Night Owls/ }));
    await expect(canvas.getByRole("button", { name: /Fera Night Owls/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(fera).toHaveAttribute("aria-pressed", "false");
  },
};
