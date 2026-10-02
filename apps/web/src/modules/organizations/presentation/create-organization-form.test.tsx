// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  OrganizationNameAvailabilityRequest,
  OrganizationNameAvailabilityResponse,
} from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { OrganizationsClientError } from "./organizations-browser-client.ts";
import { CreateOrganizationForm } from "./create-organization-form.tsx";

type TestNavigateInput = {
  readonly to: string;
  readonly params?: Record<string, string>;
};

const mocks = vi.hoisted(() => ({
  checkNameAvailability:
    vi.fn<
      (input: OrganizationNameAvailabilityRequest) => Promise<OrganizationNameAvailabilityResponse>
    >(),
  create: vi.fn<(input: CreateOrganizationRequest) => Promise<CreateOrganizationResponse>>(),
  navigate: vi.fn<(input: TestNavigateInput) => Promise<void>>(),
}));

vi.mock("./organizations-browser-client.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./organizations-browser-client.ts")>();
  return {
    ...actual,
    organizationsBrowserClient: {
      ...actual.organizationsBrowserClient,
      checkNameAvailability: (input: OrganizationNameAvailabilityRequest) =>
        mocks.checkNameAvailability(input),
      create: (input: CreateOrganizationRequest) => mocks.create(input),
    },
  };
});

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }));

const created: CreateOrganizationResponse = {
  organizationId: "org-1",
  name: "Liga Norte",
  slug: "liga-norte",
  timeZone: "America/Lima",
  logo: { kind: "monogram" },
  role: "organizer",
};

function renderForm(
  onCreated?: NonNullable<Parameters<typeof CreateOrganizationForm>[0]>["onCreated"],
) {
  return render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <QueryTestProvider>
        <CreateOrganizationForm onCreated={onCreated} />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

function nameInput(): HTMLInputElement {
  return screen.getByRole("textbox", { name: "Nombre de la organización" });
}

function submit(name: string) {
  fireEvent.change(nameInput(), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "Crear organización" }));
}

function clientError(code: string, status = 409) {
  return new OrganizationsClientError({ status, code, message: code });
}

beforeEach(() => {
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...Intl.DateTimeFormat().resolvedOptions(),
    timeZone: "America/Lima",
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  mocks.checkNameAvailability.mockReset();
  mocks.create.mockReset();
  mocks.navigate.mockReset();
});

describe("CreateOrganizationForm", () => {
  it("rejects an empty name without calling the API", async () => {
    renderForm();

    submit("   ");

    expect(await screen.findByText("Escribe el nombre de la organización.")).toBeVisible();
    expect(mocks.checkNameAvailability).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("limits the name to 120 characters and rejects a longer one", async () => {
    renderForm();

    expect(nameInput().maxLength).toBe(120);
    submit("a".repeat(121));

    expect(
      await screen.findByText("El nombre debe tener como máximo 120 caracteres."),
    ).toBeVisible();
    expect(mocks.checkNameAvailability).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("shows a taken name on the field and never creates the organization", async () => {
    mocks.checkNameAvailability.mockResolvedValueOnce({ available: false });
    renderForm();

    submit("  Liga Norte  ");

    expect(await screen.findByText("Ese nombre ya está en uso. Elige otro.")).toBeVisible();
    expect(mocks.checkNameAvailability).toHaveBeenCalledWith({ name: "Liga Norte" });
    expect(mocks.create).not.toHaveBeenCalled();
    await waitFor(() => expect(nameInput()).toHaveFocus());
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a name conflict raised by the server after the availability check passed", async () => {
    mocks.checkNameAvailability.mockResolvedValueOnce({ available: true });
    mocks.create.mockRejectedValueOnce(clientError("organizations.name_conflict"));
    renderForm();

    submit("Liga Norte");

    expect(await screen.findByText("Ese nombre ya está en uso. Elige otro.")).toBeVisible();
    expect(
      screen.queryByText("No pudimos crear la organización. Inténtalo nuevamente."),
    ).toBeNull();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("maps an invalid name rejection to the field", async () => {
    mocks.checkNameAvailability.mockResolvedValueOnce({ available: true });
    mocks.create.mockRejectedValueOnce(clientError("organizations.invalid_name", 400));
    renderForm();

    submit("Liga Norte");

    expect(await screen.findByText("El nombre no es válido.")).toBeVisible();
  });

  it("does not create when the availability check fails", async () => {
    mocks.checkNameAvailability.mockRejectedValueOnce(
      new OrganizationsClientError({
        status: 500,
        code: "organizations.client_error",
        message: "organizations.client_error",
        requestId: "2170e2f6-a47e-4338-83c3-27c054630810",
      }),
    );
    renderForm();

    submit("Liga Norte");

    expect(
      await screen.findByText("No pudimos verificar el nombre. Inténtalo nuevamente."),
    ).toBeVisible();
    expect(screen.getByText("2170e2f6-a47e-4338-83c3-27c054630810")).toBeVisible();
    expect(nameInput()).toHaveValue("Liga Norte");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("shows a form-level alert for an unexpected create failure", async () => {
    mocks.checkNameAvailability.mockResolvedValueOnce({ available: true });
    mocks.create.mockRejectedValueOnce(clientError("api.internal_error", 500));
    renderForm();

    submit("Liga Norte");

    expect(
      await screen.findByText("No pudimos crear la organización. Inténtalo nuevamente."),
    ).toBeVisible();
    expect(nameInput()).toHaveValue("Liga Norte");
    expect(nameInput()).not.toHaveAttribute("aria-invalid", "true");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("creates the organization and opens its competitions", async () => {
    mocks.checkNameAvailability.mockResolvedValueOnce({ available: true });
    mocks.create.mockResolvedValueOnce(created);
    renderForm();

    submit("  Liga Norte ");

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/orgs/$orgId/competitions",
        params: { orgId: "org-1" },
      }),
    );
    expect(mocks.create).toHaveBeenCalledWith({ name: "Liga Norte", timeZone: "America/Lima" });
  });

  it("hands the created organization to onCreated instead of navigating", async () => {
    mocks.checkNameAvailability.mockResolvedValueOnce({ available: true });
    mocks.create.mockResolvedValueOnce(created);
    const onCreated = vi.fn();
    renderForm(onCreated);

    submit("Liga Norte");

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith({ organizationId: "org-1", name: "Liga Norte" }),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("disables the form while submitting", async () => {
    mocks.checkNameAvailability.mockResolvedValueOnce({ available: true });
    mocks.create.mockReturnValueOnce(new Promise(() => undefined));
    const { container } = renderForm();

    submit("Liga Norte");

    const pending = await screen.findByRole("button", { name: "Creando…" });
    expect(pending).toBeDisabled();
    expect(container.querySelector("form")).toHaveAttribute("aria-busy", "true");
  });
});
