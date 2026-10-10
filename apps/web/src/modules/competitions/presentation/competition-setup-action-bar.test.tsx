// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { cleanup, render, screen } from "@testing-library/react";
import { ActionBar, ActionBarEnd, ActionBarStart } from "@futrob/ui";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  ShellActionBarProvider,
  useShellActionBar,
} from "@/shared/presentation/shell/shell-action-bar.tsx";
import {
  CompetitionSetupActionBarRegistration,
  type CompetitionSetupActionBarProps,
} from "./competition-setup-action-bar.tsx";

afterEach(() => {
  cleanup();
});

const noop = () => undefined;

function props(
  overrides: Partial<CompetitionSetupActionBarProps> = {},
): CompetitionSetupActionBarProps {
  return {
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
    ...overrides,
  };
}

function RegisteredBar({ value }: { readonly value: CompetitionSetupActionBarProps }) {
  const { actions } = useShellActionBar();
  const start = actions.filter((action) => action.placement === "start");
  const end = actions.filter((action) => action.placement === "end");
  return (
    <>
      <CompetitionSetupActionBarRegistration {...value} />
      <ActionBar>
        <ActionBarStart>
          {start.map((action) => (
            <span key={action.id}>{action.node}</span>
          ))}
        </ActionBarStart>
        <ActionBarEnd>
          {end.map((action) => (
            <span key={action.id}>{action.node}</span>
          ))}
        </ActionBarEnd>
      </ActionBar>
    </>
  );
}

function renderBar(value: CompetitionSetupActionBarProps) {
  return render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <ShellActionBarProvider>
        <RegisteredBar value={value} />
      </ShellActionBarProvider>
    </I18nProvider>,
  );
}

describe("Competition setup action bar", () => {
  it("disables back on the first step and keeps continue available", async () => {
    renderBar(props());

    expect(await screen.findByText("Paso 1 de 5")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Anterior" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Guardar borrador" }).hasAttribute("disabled")).toBe(
      false,
    );
    expect(screen.getByRole("button", { name: "Continuar" }).hasAttribute("disabled")).toBe(false);
  });

  it("disables continue on the last step and keeps back available", async () => {
    renderBar(props({ step: 5, canGoBack: true, canContinue: false }));

    expect(await screen.findByText("Paso 5 de 5")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Anterior" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Continuar" }).hasAttribute("disabled")).toBe(true);
  });

  it("saves the draft from the outline action", async () => {
    const onSave = vi.fn<() => void>();
    renderBar(props({ onSave }));

    const save = await screen.findByRole("button", { name: "Guardar borrador" });
    save.click();
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
