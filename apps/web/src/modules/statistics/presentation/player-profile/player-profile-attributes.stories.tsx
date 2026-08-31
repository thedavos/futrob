import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { PlayerProfileAttributes } from "./player-profile-attributes.tsx";
import { gameProfileReadyFixture } from "./player-statistics-page.fixtures.ts";

const styles = stylex.create({
  frame: {
    maxWidth: "72rem",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

const t = createTranslator("es");
const numberFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat("es-ES", {
  style: "percent",
  maximumFractionDigits: 0,
});

function AttributesShell() {
  return (
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame)}>
        <PlayerProfileAttributes
          numberFormat={numberFormat}
          percentFormat={percentFormat}
          profile={gameProfileReadyFixture()}
          t={t}
        />
      </div>
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Player/Statistics/Attributes",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => <AttributesShell />,
};

export const SelectedCategory: Story = {
  name: "Selected category",
  render: () => <AttributesShell />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Disciplina · 88" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Pase 68" }));
    await expect(canvas.getByRole("heading", { name: "Pase · 68" })).toBeVisible();
    await expect(canvas.getByText("Punto fuerte")).toBeVisible();
    await expect(canvas.getByText("A mejorar")).toBeVisible();
  },
};
