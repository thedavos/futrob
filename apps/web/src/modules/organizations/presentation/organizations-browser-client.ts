import {
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  acceptInvitationRequestSchema,
  acceptCompetitionInvitationResponseSchema,
  resolvePostAuthDestinationResponseSchema,
  listMyMembershipsResponseSchema,
  type CreateOrganizationRequest,
  type CreateOrganizationResponse,
  type AcceptInvitationRequest,
  type AcceptCompetitionInvitationResponse,
  type ResolvePostAuthDestinationResponse,
  type ListMyMembershipsResponse,
  type PostAuthDestinationDto,
} from "@futrob/api-contracts";

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export class OrganizationsClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(input: { status: number; code: string; message: string }) {
    super(input.message);
    this.name = "OrganizationsClientError";
    this.status = input.status;
    this.code = input.code;
  }
}

async function requestJson<T>(input: {
  readonly path: string;
  readonly method: "GET" | "POST";
  readonly body?: unknown;
  readonly parse: (data: unknown) => T;
}): Promise<T> {
  const response = await fetch(input.path, {
    method: input.method,
    credentials: "include",
    headers:
      input.body === undefined
        ? { Accept: "application/json" }
        : { Accept: "application/json", "Content-Type": "application/json" },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });

  const raw = await parseJson(response);
  if (!response.ok) {
    const code =
      raw && typeof raw === "object" && "code" in raw && typeof raw.code === "string"
        ? raw.code
        : "organizations.client_error";
    throw new OrganizationsClientError({
      status: response.status,
      code,
      message: code,
    });
  }

  return input.parse(raw);
}

/** Browser client for same-origin organizations BFF (session cookies). */
export const organizationsBrowserClient = {
  listMine(): Promise<ListMyMembershipsResponse> {
    return requestJson({
      path: "/api/v1/organizations/mine",
      method: "GET",
      parse: (data) => listMyMembershipsResponseSchema.parse(data),
    });
  },

  resolvePostAuthDestination(): Promise<ResolvePostAuthDestinationResponse> {
    return requestJson({
      path: "/api/v1/organizations/post-auth-destination",
      method: "GET",
      parse: (data) => resolvePostAuthDestinationResponseSchema.parse(data),
    });
  },

  create(input: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
    const body = createOrganizationRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/organizations/",
      method: "POST",
      body,
      parse: (data) => createOrganizationResponseSchema.parse(data),
    });
  },

  acceptInvitation(input: AcceptInvitationRequest): Promise<AcceptCompetitionInvitationResponse> {
    const body = acceptInvitationRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/competitions/invitations/accept",
      method: "POST",
      body,
      parse: (data) => acceptCompetitionInvitationResponseSchema.parse(data),
    });
  },
};

export function pathForPostAuthDestination(destination: PostAuthDestinationDto): string {
  switch (destination.kind) {
    case "onboarding":
      return "/onboarding";
    case "personal":
      return "/player";
    case "organization":
      return `/orgs/${destination.organizationId}`;
    case "organizationPicker":
      return "/orgs";
  }
}
