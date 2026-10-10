import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ActionBar, ActionBarEnd, ActionBarStart } from "@futrob/ui";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  CompetitionSetupActionBarEnd,
  CompetitionSetupActionBarStart,
  type CompetitionSetupActionBarProps,
} from "./competition-setup-action-bar.tsx";

const noop = () => undefined;

const firstStep: CompetitionSetupActionBarProps = {
  step: 1,
  total: 5,
  canGoBack: false,
  canContinue: true,
  canSave: true,
  saving: false,
  busy: false,
  onBack: noop,
  onSave: noop,
  onContinue: noop,
};

const lastStep: CompetitionSetupActionBarProps = {
  ...firstStep,
  step: 5,
  canGoBack: true,
  canContinue: false,
};

function SetupBar(props: CompetitionSetupActionBarProps) {
  return (
    <I18nProvider initialLocale="es">
      <ActionBar>
        <ActionBarStart>
          <CompetitionSetupActionBarStart
            busy={props.busy}
            canGoBack={props.canGoBack}
            onBack={props.onBack}
            step={props.step}
            total={props.total}
          />
        </ActionBarStart>
        <ActionBarEnd>
          <CompetitionSetupActionBarEnd
            busy={props.busy}
            canContinue={props.canContinue}
            canSave={props.canSave}
            onContinue={props.onContinue}
            onSave={props.onSave}
            review={props.review}
            saving={props.saving}
          />
        </ActionBarEnd>
      </ActionBar>
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Organizer/Competition setup action bar",
  component: CompetitionSetupActionBarStart,
  args: {
    step: 1,
    total: 5,
    canGoBack: false,
    busy: false,
    onBack: noop,
  },
} satisfies Meta<typeof CompetitionSetupActionBarStart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {
  render: () => <SetupBar {...firstStep} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText("Paso 1 de 5")).resolves.toBeTruthy();
    await expect(canvas.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Guardar borrador" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Continuar" })).toBeEnabled();
  },
};

export const LastStep: Story = {
  render: () => <SetupBar {...lastStep} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText("Paso 5 de 5")).resolves.toBeTruthy();
    await expect(canvas.getByRole("button", { name: "Anterior" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Continuar" })).toBeDisabled();
  },
};
