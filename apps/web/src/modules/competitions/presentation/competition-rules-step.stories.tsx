import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type {
  CompetitionMatchRulesDto,
  UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { RulesStep } from "./competition-rules-step.tsx";

const regularStage: CompetitionMatchRulesDto = {
  officialMatchesPerEncounter: 1,
  resolutionMode: "independent_matches",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowRescheduling: true,
  maxReschedulesPerTeam: 2,
  minimumRescheduleNoticeHours: 24,
  rescheduleProposalExpiryHours: 12,
  rescheduleRequiresOpponentApproval: true,
  rescheduleRequiresOrganizerApproval: false,
};

const form: UpdateCompetitionDraftRequest = {
  name: "Copa Interclubes",
  gameEdition: "FC 26",
  platform: "pc",
  region: "south-america",
  timeZone: "America/Lima",
  format: "league-playoffs",
  rules: {
    regularStage,
    knockoutStage: {
      ...regularStage,
      officialMatchesPerEncounter: 2,
      resolutionMode: "aggregate_score",
      rescheduleProposalExpiryHours: 6,
    },
    maxRosterSize: 11,
  },
};

function RulesPreview(props: ComponentProps<typeof RulesStep>) {
  const [rules, setRules] = useState(props.form.rules);
  return (
    <RulesStep
      {...props}
      form={{ ...props.form, rules }}
      onChange={(next) => {
        setRules(next);
        props.onChange(next);
      }}
    />
  );
}

const meta = {
  title: "Product/Organizer/Competition setup/Rules step",
  component: RulesStep,
  parameters: { layout: "padded" },
  decorators: [
    (Story, context) => (
      <I18nProvider initialLocale={context.parameters.locale === "en" ? "en" : "es"}>
        <Story />
      </I18nProvider>
    ),
  ],
  render: (args) => <RulesPreview {...args} />,
  args: { form, disabled: false, onChange: fn() },
} satisfies Meta<typeof RulesStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const expiry = canvas.getAllByRole("spinbutton", {
      name: "Plazo de respuesta de la propuesta (horas)",
    });
    await expect(expiry[0]).toHaveValue(12);
    await expect(expiry[1]).toHaveValue(6);
    await expect(
      canvas.getAllByRole("spinbutton", { name: "Aviso mínimo (horas)" })[0],
    ).toHaveValue(24);
    await userEvent.clear(expiry[0]!);
    await userEvent.type(expiry[0]!, "36");
    await expect(expiry[0]).toHaveValue(36);
    await expect(expiry[1]).toHaveValue(6);
    await expect(
      canvas.getAllByRole("spinbutton", { name: "Aviso mínimo (horas)" })[0],
    ).toHaveValue(24);
    await userEvent.tab();
    await expect(
      canvas.getAllByRole("checkbox", { name: "Requiere aprobación del rival" })[0],
    ).toHaveFocus();
  },
};

export const InvalidExpiry: Story = {
  args: {
    form: {
      ...form,
      rules: { ...form.rules, regularStage: { ...regularStage, rescheduleProposalExpiryHours: 0 } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Introduce horas enteras entre 1 y 72.")).toBeVisible();
    await expect(
      canvas.getAllByRole("spinbutton", { name: "Plazo de respuesta de la propuesta (horas)" })[0],
    ).toHaveAttribute("aria-invalid", "true");
  },
};

export const PublishedRules: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const input of canvas.getAllByRole("spinbutton", {
      name: "Plazo de respuesta de la propuesta (horas)",
    })) {
      await expect(input).toBeDisabled();
    }
  },
};

export const ReschedulingDisabled: Story = {
  args: {
    form: {
      ...form,
      format: "league",
      rules: {
        ...form.rules,
        knockoutStage: null,
        regularStage: { ...regularStage, allowRescheduling: false },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("spinbutton", {
        name: "Plazo de respuesta de la propuesta (horas)",
      }),
    ).toBeDisabled();
  },
};

export const EnglishExpiry: Story = {
  parameters: { locale: "en" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByRole("spinbutton", { name: "Proposal response window (hours)" })[0],
    ).toHaveValue(12);
    await expect(
      canvas.getAllByText(
        "Between 1 and 72 hours from each proposal. Once it expires, the organizer resolves the request.",
      )[0],
    ).toBeVisible();
  },
};
