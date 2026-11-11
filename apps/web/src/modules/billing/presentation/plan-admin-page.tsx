import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { organizationPlanKeySchema } from "@futrob/api-contracts";
import type { ListPlanRequestsResponse, OrganizationPlanKey } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  Card,
  CardContent,
  CardHeader,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Heading,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  typography,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useIsSuperuser } from "@/shared/presentation/permissions/index.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { BillingClientError } from "./billing-browser-client.ts";
import { useAssignPlanMutation, usePlanRequestsQuery } from "./billing-queries.ts";
import { styles } from "./plan-admin.styles.ts";
import { formatPlanDate, isOrganizationPlanKey, planNameKey } from "./plan-copy.ts";

const PLAN_KEYS = ["free", "pro", "league"] as const satisfies readonly OrganizationPlanKey[];

type PlanRequests = ListPlanRequestsResponse["requests"];
type QueueRequest = PlanRequests[number];

export type PlanAdminState =
  | { readonly kind: "checking" }
  | { readonly kind: "accessError" }
  | { readonly kind: "denied" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly requests: PlanRequests;
      /** A background refresh failed; the last queue stays on screen. */
      readonly refreshRetry?: () => void;
    };

/** Superuser panel: the queue of plan requests and the manual plan assignment. */
export function PlanAdminRoute() {
  const access = useIsSuperuser();
  const query = usePlanRequestsQuery(access.allowed);

  const state: PlanAdminState = (() => {
    if (access.loading) return { kind: "checking" };
    if (access.unavailable) return { kind: "accessError" };
    if (!access.allowed) return { kind: "denied" };
    const read = query.data;
    if (read?.outcome === "refused") {
      return read.status === 401
        ? { kind: "error", retry: () => void query.refetch() }
        : { kind: "denied" };
    }
    if (read) {
      return {
        kind: "ready",
        requests: read.value.requests,
        refreshRetry: query.isRefetchError ? () => void query.refetch() : undefined,
      };
    }
    if (query.isError) return { kind: "error", retry: () => void query.refetch() };
    return { kind: "loading" };
  })();

  return <PlanAdminPageView state={state} />;
}

export function PlanAdminPageView({ state }: { readonly state: PlanAdminState }) {
  const { t } = useI18n();
  let body: ReactNode;
  switch (state.kind) {
    case "checking":
      body = (
        <p role="status" {...applyStyles(styles.pending)}>
          {t("billing.admin.checkingAccess")}
        </p>
      );
      break;
    case "accessError":
      body = (
        <Alert variant="destructive">
          <AlertDescription>{t("billing.admin.accessUnavailable")}</AlertDescription>
        </Alert>
      );
      break;
    case "denied":
      body = (
        <EmptyState>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("billing.admin.denied.title")}</EmptyStateTitle>
            <EmptyStateDescription>{t("billing.admin.denied.description")}</EmptyStateDescription>
          </EmptyStateCopy>
        </EmptyState>
      );
      break;
    case "loading":
      body = (
        <div
          aria-busy="true"
          aria-label={t("billing.admin.loading")}
          role="status"
          {...applyStyles(styles.skeletonStack)}
        >
          <Skeleton {...applyStyles(styles.skeletonRow)} />
          <Skeleton {...applyStyles(styles.skeletonRow)} />
        </div>
      );
      break;
    case "error":
      body = <RetryAlert message={t("billing.admin.error")} retry={state.retry} t={t} />;
      break;
    case "ready":
      body = <PlanAdminContent refreshRetry={state.refreshRetry} requests={state.requests} />;
      break;
  }
  return (
    <PageScaffold page="admin.billing">
      <div {...applyStyles(styles.body)}>{body}</div>
    </PageScaffold>
  );
}

interface AssignDraft {
  readonly organizationId: string;
  readonly planKey: OrganizationPlanKey;
  readonly reason: string;
}

const EMPTY_DRAFT: AssignDraft = { organizationId: "", planKey: "pro", reason: "" };

function PlanAdminContent({
  requests,
  refreshRetry,
}: {
  readonly requests: PlanRequests;
  readonly refreshRetry?: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<AssignDraft>(EMPTY_DRAFT);
  const reasonRef = useRef<HTMLInputElement>(null);
  const assign = useAssignPlanMutation();

  const fillFrom = (request: QueueRequest) => {
    assign.reset();
    setDraft({ organizationId: request.organizationId, planKey: request.planKey, reason: "" });
    reasonRef.current?.focus();
  };

  return (
    <>
      {refreshRetry ? (
        <RetryAlert
          message={t("billing.admin.error")}
          retry={refreshRetry}
          t={t}
          variant="warning"
        />
      ) : null}
      <AssignPlanCard assign={assign} draft={draft} onDraft={setDraft} reasonRef={reasonRef} />
      <RequestQueueCard onAssign={fillFrom} requests={requests} />
    </>
  );
}

function AssignPlanCard({
  assign,
  draft,
  onDraft,
  reasonRef,
}: {
  readonly assign: ReturnType<typeof useAssignPlanMutation>;
  readonly draft: AssignDraft;
  readonly onDraft: (draft: AssignDraft) => void;
  readonly reasonRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useI18n();
  const headingId = useId();
  const organizationFieldId = useId();
  const reasonFieldId = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    assign.mutate(
      {
        organizationId: draft.organizationId.trim(),
        planKey: draft.planKey,
        state: { status: "active" },
        reason: draft.reason.trim(),
      },
      { onSuccess: () => onDraft({ ...EMPTY_DRAFT, planKey: draft.planKey }) },
    );
  };

  const failure = (() => {
    if (!assign.isError) return null;
    const status = assign.error instanceof BillingClientError ? assign.error.status : 0;
    if (status === 403) return t("billing.admin.form.forbidden");
    if (status === 404) return t("billing.admin.form.notFound");
    return t("billing.admin.form.error");
  })();

  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.panel)}>
      <CardHeader className={styles.header}>
        <Heading className={typography.title} id={headingId}>
          {t("billing.admin.form.title")}
        </Heading>
        <Caption>{t("billing.admin.form.description")}</Caption>
      </CardHeader>
      <CardContent className={styles.content}>
        <form {...applyStyles(styles.form)} onSubmit={submit}>
          <Field>
            <FieldLabel htmlFor={organizationFieldId}>
              {t("billing.admin.form.organizationId")}
            </FieldLabel>
            <Input
              autoComplete="off"
              id={organizationFieldId}
              onChange={(event) => onDraft({ ...draft, organizationId: event.target.value })}
              required
              value={draft.organizationId}
            />
          </Field>
          <fieldset {...applyStyles(styles.choices)}>
            <legend {...applyStyles(styles.legend)}>{t("billing.admin.form.plan")}</legend>
            <ChoiceGroup
              onValueChange={(value) => {
                const parsed = organizationPlanKeySchema.safeParse(value);
                if (parsed.success) onDraft({ ...draft, planKey: parsed.data });
              }}
              value={draft.planKey}
            >
              {PLAN_KEYS.map((planKey) => (
                <ChoiceGroupItem appearance="pill" key={planKey} value={planKey}>
                  <ChoiceGroupIndicator />
                  {t(planNameKey(planKey))}
                </ChoiceGroupItem>
              ))}
            </ChoiceGroup>
          </fieldset>
          <Field>
            <FieldLabel htmlFor={reasonFieldId}>{t("billing.admin.form.reason")}</FieldLabel>
            <Input
              autoComplete="off"
              id={reasonFieldId}
              maxLength={500}
              onChange={(event) => onDraft({ ...draft, reason: event.target.value })}
              ref={reasonRef}
              required
              value={draft.reason}
            />
            <FieldDescription>{t("billing.admin.form.reasonHint")}</FieldDescription>
          </Field>
          {failure ? (
            <Alert variant="destructive">
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}
          {assign.isSuccess ? (
            <Alert variant="success">
              <AlertDescription>
                {t("billing.admin.form.success", {
                  plan: t(
                    isOrganizationPlanKey(assign.data.subscription.planKey)
                      ? planNameKey(assign.data.subscription.planKey)
                      : "billing.plan.name.free",
                  ),
                  organizationId: assign.data.organizationId,
                })}
              </AlertDescription>
            </Alert>
          ) : null}
          <div {...applyStyles(styles.actions)}>
            <Button disabled={assign.isPending} type="submit">
              {t(assign.isPending ? "billing.admin.form.submitting" : "billing.admin.form.submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RequestQueueCard({
  requests,
  onAssign,
}: {
  readonly requests: PlanRequests;
  readonly onAssign: (request: QueueRequest) => void;
}) {
  const { t, locale } = useI18n();
  const headingId = useId();
  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.panel)}>
      <CardHeader className={styles.header}>
        <Heading className={typography.title} id={headingId}>
          {t("billing.admin.queue.title")}
        </Heading>
      </CardHeader>
      <CardContent className={styles.content}>
        {requests.length === 0 ? (
          <Caption {...applyStyles(styles.muted)}>{t("billing.admin.queue.empty")}</Caption>
        ) : (
          <Table containerLabelledBy={headingId} dense>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{t("billing.admin.queue.organization")}</TableHead>
                <TableHead scope="col">{t("billing.admin.queue.plan")}</TableHead>
                <TableHead scope="col">{t("billing.admin.queue.date")}</TableHead>
                <TableHead scope="col">{t("billing.admin.queue.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => {
                const plan = t(planNameKey(request.planKey));
                return (
                  <TableRow key={request.organizationId}>
                    <TableCell>
                      <Link
                        params={{ orgId: request.organizationId }}
                        to="/orgs/$orgId/settings/plan"
                      >
                        {request.organizationName}
                      </Link>
                    </TableCell>
                    <TableCell>{plan}</TableCell>
                    <TableCell>{formatPlanDate(request.requestedAt, locale)}</TableCell>
                    <TableCell>
                      <Button
                        aria-label={t("billing.admin.queue.assign", {
                          plan,
                          organization: request.organizationName,
                        })}
                        onClick={() => onAssign(request)}
                        type="button"
                        variant="outline"
                      >
                        {t("billing.admin.queue.assignLabel")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
