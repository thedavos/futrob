"use client";

import { useId, useRef, useState } from "react";
import { FutrobApiError } from "@futrob/sdk";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  applyStyles,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@futrob/ui";
import { PlanUpsellAlert } from "@/modules/billing/presentation/plan-upsell-alert.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./competition-fixture-page.styles.ts";
import type { SwissFixtureView } from "./competition-fixture-view.ts";
import {
  swissCommandRecovery,
  swissRecoveryText,
  type SwissCommandRecovery,
  type SwissFixtureCommand,
  type SwissFixtureCommands,
} from "./swiss-fixture-commands.ts";
import type { FixtureNotice } from "./swiss-fixture-generate-form.tsx";

/** Organizer commands on the round being played. The server re-checks permission and round. */
export function SwissRoundActions({
  canClose,
  commands,
  onNotice,
  organizationId,
  roundNumber,
  swiss,
}: {
  readonly canClose: boolean;
  readonly commands: SwissFixtureCommands;
  readonly onNotice: (notice: FixtureNotice) => void;
  readonly organizationId: string;
  readonly roundNumber: number;
  readonly swiss: SwissFixtureView;
}) {
  const { t } = useI18n();
  return (
    <div {...applyStyles(styles.roundActions)}>
      {swiss.withdrawable.length > 0 ? (
        <SwissActionDialog
          command="withdraw"
          confirmLabel={t("fixture.withdraw.confirm")}
          description={t("fixture.withdraw.description")}
          onNotice={onNotice}
          organizationId={organizationId}
          run={async ({ reason, requestId, teamId }) => {
            await commands.withdraw(swiss.fixturePlanId, { teamId, reason, requestId });
            const name = swiss.withdrawable.find((team) => team.teamId === teamId)?.name;
            return t("fixture.withdraw.done", { team: name ?? t("fixture.side.unknownTeam") });
          }}
          teams={swiss.withdrawable}
          title={t("fixture.withdraw.title")}
          triggerLabel={t("fixture.withdraw.trigger")}
        />
      ) : null}
      {canClose ? (
        <SwissActionDialog
          command="close"
          confirmLabel={t("fixture.close.confirm")}
          description={t("fixture.close.description")}
          onNotice={onNotice}
          organizationId={organizationId}
          run={async ({ reason, requestId }) => {
            await commands.closeRound(swiss.fixturePlanId, roundNumber, { reason, requestId });
            return t("fixture.close.done", { number: roundNumber });
          }}
          title={t("fixture.close.title", { number: roundNumber })}
          triggerLabel={t("fixture.close.trigger")}
        />
      ) : null}
    </div>
  );
}

type ActionInput = {
  readonly reason: string;
  readonly requestId: string;
  readonly teamId: string;
};

type ActionProps = {
  readonly command: Exclude<SwissFixtureCommand, "generate">;
  readonly confirmLabel: string;
  readonly description: string;
  readonly onNotice: (notice: FixtureNotice) => void;
  readonly organizationId: string;
  /** Resolves with the sentence that confirms what was applied. */
  readonly run: (input: ActionInput) => Promise<string>;
  readonly teams?: SwissFixtureView["withdrawable"];
  readonly title: string;
  readonly triggerLabel: string;
};

function SwissActionDialog(props: ActionProps) {
  const [open, setOpen] = useState(false);
  const busy = useRef(false);
  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (next || !busy.current) setOpen(next);
      }}
      open={open}
    >
      <AlertDialogTrigger render={<Button variant="outline" />}>
        {props.triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        {/* The popup unmounts on close, so every open starts clean with its own request id. */}
        <SwissActionForm {...props} busy={busy} onClose={() => setOpen(false)} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SwissActionForm({
  busy,
  command,
  confirmLabel,
  description,
  onClose,
  onNotice,
  organizationId,
  run,
  teams,
  title,
}: ActionProps & {
  readonly busy: { current: boolean };
  readonly onClose: () => void;
}) {
  const { t } = useI18n();
  const id = useId();
  // One id per dialog open: a retry of this form replays instead of applying twice.
  const [requestId] = useState(() => crypto.randomUUID());
  const [reason, setReason] = useState("");
  const [teamId, setTeamId] = useState("");
  const [invalid, setInvalid] = useState<readonly ("reason" | "team")[]>([]);
  const [failure, setFailure] = useState<SwissCommandRecovery | null>(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);

  async function submit() {
    if (busy.current) return;
    setFailure(null);
    const trimmed = reason.trim();
    const missing = [
      ...(teams && !teamId ? (["team"] as const) : []),
      ...(trimmed ? [] : (["reason"] as const)),
    ];
    if (missing.length > 0) {
      setInvalid(missing);
      return;
    }
    setInvalid([]);
    busy.current = true;
    setPending(true);
    try {
      const done = await run({ reason: trimmed, requestId, teamId });
      busy.current = false;
      onNotice({ tone: "success", text: done });
      onClose();
    } catch (cause) {
      busy.current = false;
      const recovery = swissCommandRecovery(
        cause instanceof FutrobApiError ? cause : null,
        command,
      );
      if (recovery.draft === "close") {
        onNotice({ tone: "warning", text: swissRecoveryText(recovery, t) });
        onClose();
        return;
      }
      if (recovery.uncertain) setUncertain(true);
      setFailure(recovery);
    } finally {
      setPending(false);
    }
  }

  const teamInvalid = invalid.includes("team") || failure?.field === "team";
  const items = teams?.map((team) => ({
    value: team.teamId,
    label: team.name ?? t("fixture.side.unknownTeam"),
  }));
  return (
    <form
      aria-busy={pending}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <div {...applyStyles(styles.dialogFields)}>
        {failure && "upsell" in failure.message ? (
          <PlanUpsellAlert code={failure.message.upsell} organizationId={organizationId} />
        ) : failure ? (
          <Alert variant="destructive">
            <AlertDescription>{swissRecoveryText(failure, t)}</AlertDescription>
          </Alert>
        ) : null}
        {items ? (
          <Field disabled={pending || uncertain} invalid={teamInvalid}>
            <FieldLabel htmlFor={`${id}-team`}>{t("fixture.withdraw.team")}</FieldLabel>
            {/* After an unknown outcome the same request must carry the same Team to replay. */}
            <Select
              disabled={pending || uncertain}
              items={items}
              onValueChange={(value) => {
                if (typeof value !== "string") return;
                setTeamId(value);
                setInvalid((current) => current.filter((entry) => entry !== "team"));
              }}
              value={teamId || null}
            >
              <SelectTrigger aria-invalid={teamInvalid} id={`${id}-team`}>
                <SelectValue placeholder={t("fixture.withdraw.teamPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {invalid.includes("team") ? (
              <FieldError match>{t("fixture.withdraw.teamRequired")}</FieldError>
            ) : null}
          </Field>
        ) : null}
        <Field disabled={pending} invalid={invalid.includes("reason")}>
          <FieldLabel htmlFor={`${id}-reason`}>{t("fixture.action.reason")}</FieldLabel>
          <Textarea
            aria-invalid={invalid.includes("reason")}
            id={`${id}-reason`}
            maxLength={500}
            onChange={(event) => {
              setReason(event.target.value);
              setInvalid((current) => current.filter((entry) => entry !== "reason"));
            }}
            required
            rows={3}
            value={reason}
          />
          {invalid.includes("reason") ? (
            <FieldError match>{t("fixture.action.reasonRequired")}</FieldError>
          ) : null}
        </Field>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending} render={<Button variant="ghost" />}>
          {t("common.cancel")}
        </AlertDialogCancel>
        <Button disabled={pending} type="submit" variant="destructive">
          {confirmLabel}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
