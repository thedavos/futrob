// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  OrganizationNameAvailabilityResponse,
  OrganizationProfileDto,
  OrganizationSlugAvailabilityRequest,
  OrganizationSlugAvailabilityResponse,
  SetOrganizationLogoRequest,
} from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { OrganizationsClientError } from "./organizations-browser-client.ts";
import { CreateOrganizationProfileForm } from "./create-organization-profile-form.tsx";

type TestNavigateInput = {
  readonly to: string;
  readonly params?: Record<string, string>;
};

const mocks = vi.hoisted(() => ({
  checkName: vi.fn<() => Promise<OrganizationNameAvailabilityResponse>>(),
  checkSlug:
    vi.fn<
      (input: OrganizationSlugAvailabilityRequest) => Promise<OrganizationSlugAvailabilityResponse>
    >(),
  create: vi.fn<(input: CreateOrganizationRequest) => Promise<CreateOrganizationResponse>>(),
  uploadLogo:
    vi.fn<(organizationId: string, uploadKey: string, file: File) => Promise<{ key: string }>>(),
  setLogo:
    vi.fn<
      (organizationId: string, input: SetOrganizationLogoRequest) => Promise<OrganizationProfileDto>
    >(),
  navigate: vi.fn<(input: TestNavigateInput) => Promise<void>>(),
}));

vi.mock("./organizations-browser-client.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./organizations-browser-client.ts")>();
  return {
    ...actual,
    organizationsBrowserClient: {
      ...actual.organizationsBrowserClient,
      checkNameAvailability: () => mocks.checkName(),
      checkSlugAvailability: (input: OrganizationSlugAvailabilityRequest) => mocks.checkSlug(input),
      create: (input: CreateOrganizationRequest) => mocks.create(input),
      uploadLogo: (organizationId: string, uploadKey: string, file: File) =>
        mocks.uploadLogo(organizationId, uploadKey, file),
      setLogo: (organizationId: string, input: SetOrganizationLogoRequest) =>
        mocks.setLogo(organizationId, input),
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

const profileWithLogo = (key: string): OrganizationProfileDto => ({
  organizationId: "org-1",
  name: "Liga Norte",
  slug: "liga-norte",
  timeZone: "America/Lima",
  logo: { kind: "upload", key },
});

beforeEach(() => {
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...Intl.DateTimeFormat().resolvedOptions(),
    timeZone: "America/Lima",
  });
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  mocks.checkName.mockResolvedValue({ available: true });
  mocks.checkSlug.mockResolvedValue({ available: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  for (const mock of Object.values(mocks)) mock.mockReset();
});

function renderForm() {
  return render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <QueryTestProvider>
        <CreateOrganizationProfileForm />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

const nameField = () => screen.getByRole("textbox", { name: "Nombre de la organización" });
const slugField = () => screen.getByRole("textbox", { name: "Slug" });
const submitButton = () => screen.getByRole("button", { name: "Crear organización" });

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("file input not rendered");
  return input;
}

function pickFile(container: HTMLElement, file: File) {
  fireEvent.change(fileInput(container), { target: { files: [file] } });
}

function clientError(code: string, status = 409) {
  return new OrganizationsClientError({ status, code, message: code });
}

describe("CreateOrganizationProfileForm", () => {
  it("proposes a slug from the name until the user edits the slug", () => {
    renderForm();

    fireEvent.change(nameField(), { target: { value: "Liga Ñandú" } });
    expect(slugField()).toHaveValue("liga-nandu");

    fireEvent.change(slugField(), { target: { value: "norte-fc" } });
    fireEvent.change(nameField(), { target: { value: "Liga del Sur" } });
    expect(slugField()).toHaveValue("norte-fc");
  });

  it("creates the organization with its slug, the browser time zone and opens its competitions", async () => {
    mocks.create.mockResolvedValueOnce(created);
    renderForm();

    fireEvent.change(nameField(), { target: { value: "  Liga Norte " } });
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/orgs/$orgId/competitions",
        params: { orgId: "org-1" },
      }),
    );
    expect(mocks.create).toHaveBeenCalledWith({
      name: "Liga Norte",
      slug: "liga-norte",
      timeZone: "America/Lima",
      creationKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(mocks.checkSlug).toHaveBeenCalledWith({ slug: "liga-norte" });
    expect(mocks.uploadLogo).not.toHaveBeenCalled();
  });

  it("keeps the same creation key when a failed submit is retried", async () => {
    mocks.create.mockRejectedValueOnce(clientError("api.internal_error", 500));
    mocks.create.mockResolvedValueOnce(created);
    renderForm();
    fireEvent.change(nameField(), { target: { value: "Liga Norte" } });

    fireEvent.click(submitButton());
    expect(
      await screen.findByText("No pudimos crear la organización. Inténtalo nuevamente."),
    ).toBeVisible();
    fireEvent.click(submitButton());
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));

    const [first, second] = mocks.create.mock.calls.map(([input]) => input.creationKey);
    expect(first).toBeDefined();
    expect(second).toBe(first);
  });

  it("uses a new creation key when the data was edited after a failed attempt", async () => {
    mocks.create.mockRejectedValueOnce(clientError("api.internal_error", 500));
    mocks.create.mockResolvedValueOnce(created);
    renderForm();
    fireEvent.change(nameField(), { target: { value: "Liga Norte" } });

    fireEvent.click(submitButton());
    await screen.findByText("No pudimos crear la organización. Inténtalo nuevamente.");
    fireEvent.change(nameField(), { target: { value: "Liga del Norte" } });
    fireEvent.click(submitButton());
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));

    const [first, second] = mocks.create.mock.calls.map(([input]) => input);
    expect(first?.name).toBe("Liga Norte");
    expect(second?.name).toBe("Liga del Norte");
    expect(second?.creationKey).toBeDefined();
    expect(second?.creationKey).not.toBe(first?.creationKey);
  });

  it("rejects a taken name on the field without checking the slug or creating", async () => {
    mocks.checkName.mockResolvedValueOnce({ available: false });
    renderForm();

    fireEvent.change(nameField(), { target: { value: "Liga Norte" } });
    fireEvent.click(submitButton());

    expect(await screen.findByText("Ese nombre ya está en uso. Elige otro.")).toBeVisible();
    expect(mocks.checkSlug).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    await waitFor(() => expect(nameField()).toHaveFocus());
  });

  it("offers a free slug when the typed one is taken and creates with the suggestion", async () => {
    mocks.checkSlug.mockResolvedValueOnce({
      available: false,
      reason: "taken",
      suggestion: "liga-norte-2",
    });
    mocks.create.mockResolvedValueOnce({ ...created, slug: "liga-norte-2" });
    renderForm();
    fireEvent.change(nameField(), { target: { value: "Liga Norte" } });

    fireEvent.click(submitButton());
    expect(await screen.findByText("Ese slug ya está en uso.")).toBeVisible();
    expect(mocks.create).not.toHaveBeenCalled();
    await waitFor(() => expect(slugField()).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: "Usar «liga-norte-2»" }));
    expect(slugField()).toHaveValue("liga-norte-2");
    expect(screen.queryByText("Ese slug ya está en uso.")).toBeNull();
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ slug: "liga-norte-2" })),
    );
  });

  it("explains an invalid slug and checks availability when leaving the field", async () => {
    mocks.checkSlug.mockResolvedValueOnce({
      available: false,
      reason: "invalid",
      suggestion: "admin-2",
    });
    renderForm();

    fireEvent.change(slugField(), { target: { value: "admin" } });
    fireEvent.blur(slugField());

    expect(
      await screen.findByText(
        "Usa de 3 a 48 caracteres: minúsculas, números y guiones, sin palabras reservadas.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Usar «admin-2»" })).toBeVisible();
    expect(mocks.checkSlug).toHaveBeenCalledWith({ slug: "admin" });
  });

  it("shows a slug conflict raised by the server on the slug field", async () => {
    mocks.create.mockRejectedValueOnce(clientError("organizations.slug_conflict"));
    renderForm();

    fireEvent.change(nameField(), { target: { value: "Liga Norte" } });
    fireEvent.click(submitButton());

    expect(await screen.findByText("Ese slug ya está en uso.")).toBeVisible();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("uploads the chosen logo after creating, registers its key and then navigates", async () => {
    mocks.create.mockResolvedValueOnce(created);
    mocks.uploadLogo.mockResolvedValueOnce({ key: "organization-logos/org-1/up-1.png" });
    mocks.setLogo.mockResolvedValueOnce(profileWithLogo("organization-logos/org-1/up-1.png"));
    const { container } = renderForm();
    const file = new File(["png"], "crest.png", { type: "image/png" });

    fireEvent.change(nameField(), { target: { value: "Liga Norte" } });
    pickFile(container, file);
    fireEvent.click(submitButton());

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
    expect(mocks.uploadLogo).toHaveBeenCalledWith("org-1", expect.any(String), file);
    expect(mocks.setLogo).toHaveBeenCalledWith("org-1", {
      logo: { kind: "upload", key: "organization-logos/org-1/up-1.png" },
    });
    expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.uploadLogo.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("keeps the new organization when the logo upload fails and lets the user retry or continue", async () => {
    mocks.create.mockResolvedValueOnce(created);
    mocks.uploadLogo.mockRejectedValueOnce(clientError("media.upload_failed", 500));
    const { container } = renderForm();
    fireEvent.change(nameField(), { target: { value: "Liga Norte" } });
    pickFile(container, new File(["png"], "crest.png", { type: "image/png" }));

    fireEvent.click(submitButton());
    expect(
      await screen.findByText(
        "Creamos la organización, pero no pudimos subir el escudo. Puedes subirlo desde Ajustes.",
      ),
    ).toBeVisible();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Crear organización" })).toBeNull();

    mocks.uploadLogo.mockResolvedValueOnce({ key: "organization-logos/org-1/up-2.png" });
    mocks.setLogo.mockResolvedValueOnce(profileWithLogo("organization-logos/org-1/up-2.png"));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar subida" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("continues without a logo after a failed upload", async () => {
    mocks.create.mockResolvedValueOnce(created);
    mocks.uploadLogo.mockRejectedValueOnce(clientError("media.upload_failed", 500));
    const { container } = renderForm();
    fireEvent.change(nameField(), { target: { value: "Liga Norte" } });
    pickFile(container, new File(["png"], "crest.png", { type: "image/png" }));
    fireEvent.click(submitButton());

    fireEvent.click(await screen.findByRole("button", { name: "Continuar sin escudo" }));

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/orgs/$orgId/competitions",
        params: { orgId: "org-1" },
      }),
    );
  });

  it("refuses an unsupported or oversized logo before anything is uploaded", async () => {
    const { container } = renderForm();

    pickFile(container, new File(["gif"], "crest.gif", { type: "image/gif" }));
    expect(await screen.findByText("Usa una imagen PNG, JPEG o WebP.")).toBeVisible();

    pickFile(
      container,
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }),
    );
    expect(await screen.findByText("La imagen supera los 2 MB.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Subir escudo" })).toBeVisible();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("lets the user drop a picked logo and go back to the monogram", async () => {
    const { container } = renderForm();
    pickFile(container, new File(["png"], "crest.png", { type: "image/png" }));

    fireEvent.click(await screen.findByRole("button", { name: "Quitar escudo" }));

    expect(screen.getByRole("button", { name: "Subir escudo" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Quitar escudo" })).toBeNull();
  });
});
