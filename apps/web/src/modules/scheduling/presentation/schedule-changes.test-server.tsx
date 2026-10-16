import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { vi } from "vite-plus/test";
import type {
  ApiErrorDetails,
  ScheduleChangeCreationOptionsDto,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { encounterView } from "@/modules/results/presentation/encounter-page.fixtures.ts";
import { ScheduleChangesSection } from "./schedule-changes-section.tsx";
import { useScheduleChanges } from "./schedule-change-queries.ts";

export const PATH = "/api/v1/encounters/encounter-1/schedule-change-requests";
export const command = (action: "accept" | "reject" | "counter", proposalId = "proposal-1") =>
  `${PATH}/request-1/proposals/${proposalId}/${action}`;

type Handler = () => Response | Promise<Response>;

/** The BFF as the browser sees it: the list, plus POST handlers the test installs. */
export function scheduleChangeServer(initial: {
  readonly requests: readonly ScheduleChangeRequestDto[];
  readonly creation: ScheduleChangeCreationOptionsDto;
}) {
  const state = { ...initial };
  const sent: { readonly path: string; readonly body: unknown }[] = [];
  const handlers = new Map<string, Handler>();
  let reads = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = input instanceof Request ? input.url : input.toString();
      if (path === PATH && init?.method === "GET") {
        reads += 1;
        return Response.json({ requests: state.requests, creation: state.creation });
      }
      const handler = handlers.get(path);
      if (init?.method === "POST" && handler) {
        const body: unknown = await new Response(init.body).json();
        sent.push({ path, body });
        return handler();
      }
      return Response.json(
        { code: "api.not_found", messageKey: "errors.fallback" },
        { status: 404 },
      );
    }),
  );
  return {
    state,
    sent,
    reads: () => reads,
    on: (path: string, handler: Handler) => handlers.set(path, handler),
  };
}

export const apiError = (status: number, code: string, details?: ApiErrorDetails) =>
  Response.json({ code, messageKey: `errors.${code}`, details }, { status });

export const view = encounterView();

function Harness() {
  return <ScheduleChangesSection state={useScheduleChanges("encounter-1", true)} view={view} />;
}

export function mountSection(locale: "es" | "en" = "es") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={locale}>
        <Harness />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return client;
}
