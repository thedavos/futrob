"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ImposeSanctionRequest, SanctionTypeDto } from "@futrob/api-contracts";
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
  Input,
  Textarea,
} from "@futrob/ui";
import { PlusIcon } from "@phosphor-icons/react";
import { useCompetitionEncountersQuery } from "@/modules/results/presentation/encounter-queries.ts";
import {
  listEveryCompetitionManagementPage,
  useCompetitionTeamManagementDetailQuery,
} from "@/modules/teams/presentation/competition-team-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { sanctionFailureText } from "./sanction-queries.ts";
import { PLAYER_SANCTION_TYPES, SANCTION_TYPES, sanctionTypeLabel } from "./sanction-view.ts";
import { SanctionSelectField } from "./sanction-select-field.tsx";
import { styles } from "./sanctions.styles.ts";

type Scope = { readonly organizationId: string; readonly competitionId: string };

/** Teams with an approved entry: the only ones a sanction can fall on. */
function useSanctionableTeams({ organizationId, competitionId }: Scope, enabled: boolean) {
  return useQuery({
    queryKey: [
      ...queryKeys.teams.competitionManagement(organizationId, competitionId),
      "sanctionable",
    ],
    queryFn: async () =>
      (await listEveryCompetitionManagementPage(organizationId, competitionId, 50))
        .filter((item) => item.entry.status === "approved")
        .map((item) => ({ teamId: item.team.id, name: item.team.name })),
    enabled,
  });
}

/** Opens the form to record a new sanction. The server re-checks permission and target. */
export function ImposeSanctionDialog({
  onImpose,
  ...scope
}: Scope & {
  readonly onImpose: (input: ImposeSanctionRequest) => Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger render={<Button />}>
        <PlusIcon aria-hidden="true" /> {t("sanctions.impose.trigger")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        {/* The popup unmounts on close, so every open starts with an empty form. */}
        <ImposeSanctionForm {...scope} onClose={() => setOpen(false)} onImpose={onImpose} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

type Missing = "team" | "player" | "points" | "matches" | "encounter" | "reason";

function ImposeSanctionForm({
  competitionId,
  onClose,
  onImpose,
  organizationId,
}: Scope & {
  readonly onClose: () => void;
  readonly onImpose: (input: ImposeSanctionRequest) => Promise<void>;
}) {
  const { t } = useI18n();
  const id = useId();
  const [targetType, setTargetType] = useState<"team" | "player">("team");
  const [teamId, setTeamId] = useState("");
  const [playerProfileId, setPlayerProfileId] = useState("");
  const [type, setType] = useState<SanctionTypeDto>("warning");
  const [amount, setAmount] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState<readonly Missing[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const teams = useSanctionableTeams({ organizationId, competitionId }, true);
  const roster = useCompetitionTeamManagementDetailQuery(
    organizationId,
    competitionId,
    targetType === "player" && teamId ? teamId : null,
  );
  const encounters = useCompetitionEncountersQuery(organizationId, competitionId);
  const teamEncounters =
    encounters.data?.encounters.filter(
      (encounter) => encounter.home.teamId === teamId || encounter.away.teamId === teamId,
    ) ?? [];

  const types = targetType === "player" ? PLAYER_SANCTION_TYPES : SANCTION_TYPES;
  const needsAmount = type === "points_deduction" || type === "match_suspension";
  const amountValue = Number(amount);

  function clear(field: Missing) {
    setInvalid((current) => current.filter((entry) => entry !== field));
  }

  async function submit() {
    if (pending) return;
    setFailure(null);
    const trimmed = reason.trim();
    const missing: Missing[] = [];
    if (!teamId) missing.push("team");
    if (targetType === "player" && !playerProfileId) missing.push("player");
    if (
      type === "points_deduction" &&
      !(Number.isInteger(amountValue) && amountValue >= 1 && amountValue <= 100)
    ) {
      missing.push("points");
    }
    if (
      type === "match_suspension" &&
      !(Number.isInteger(amountValue) && amountValue >= 1 && amountValue <= 20)
    ) {
      missing.push("matches");
    }
    if (type === "administrative_defeat" && !encounterId) missing.push("encounter");
    if (trimmed.length < 3) missing.push("reason");
    if (missing.length > 0) {
      setInvalid(missing);
      return;
    }
    setInvalid([]);
    setPending(true);
    try {
      await onImpose({
        target:
          targetType === "team" ? { type: "team", teamId } : { type: "player", playerProfileId },
        type,
        reason: trimmed,
        pointsDeducted: type === "points_deduction" ? amountValue : null,
        suspensionMatches: type === "match_suspension" ? amountValue : null,
        encounterId: type === "administrative_defeat" ? encounterId : null,
      });
      onClose();
    } catch (cause) {
      setFailure(sanctionFailureText(cause instanceof Error ? cause : null, t));
    } finally {
      setPending(false);
    }
  }

  const teamItems = (teams.data ?? []).map((team) => ({ value: team.teamId, label: team.name }));
  const playerItems = (roster.data?.members ?? []).map((member) => ({
    value: member.membership.playerProfileId,
    label: member.presentation.displayName,
  }));
  const encounterItems = teamEncounters.map((encounter) => ({
    value: encounter.encounterId,
    label: t("sanctions.impose.encounterOption", {
      round: encounter.round.number,
      home: encounter.home.name,
      away: encounter.away.name,
    }),
  }));
  const targetItems = [
    { value: "team", label: t("sanctions.target.team") },
    { value: "player", label: t("sanctions.target.player") },
  ];
  const typeItems = types.map((value) => ({ value, label: sanctionTypeLabel(value, t) }));

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
        <AlertDialogTitle>{t("sanctions.impose.title")}</AlertDialogTitle>
        <AlertDialogDescription>{t("sanctions.impose.description")}</AlertDialogDescription>
      </AlertDialogHeader>
      <div {...applyStyles(styles.dialogFields)}>
        {failure ? (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        {teams.isError ? (
          <RetryAlert
            message={t("sanctions.impose.teamsError")}
            retry={() => void teams.refetch()}
            t={t}
          />
        ) : null}
        {targetType === "player" && roster.isError ? (
          <RetryAlert
            message={t("sanctions.impose.playersError")}
            retry={() => void roster.refetch()}
            t={t}
          />
        ) : null}
        {type === "administrative_defeat" && encounters.isError ? (
          <RetryAlert
            message={t("sanctions.impose.encountersError")}
            retry={() => void encounters.refetch()}
            t={t}
          />
        ) : null}
        <div {...applyStyles(styles.fieldRow)}>
          <SanctionSelectField
            disabled={pending}
            id={`${id}-target`}
            items={targetItems}
            label={t("sanctions.impose.target")}
            onChange={(value) => {
              if (value !== "team" && value !== "player") return;
              setTargetType(value);
              setPlayerProfileId("");
              if (value === "player" && !PLAYER_SANCTION_TYPES.includes(type)) setType("warning");
            }}
            value={targetType}
          />
          <SanctionSelectField
            disabled={pending}
            id={`${id}-type`}
            items={typeItems}
            label={t("sanctions.impose.type")}
            onChange={(value) => {
              const next = types.find((candidate) => candidate === value);
              if (!next) return;
              setType(next);
              setAmount("");
              setInvalid([]);
            }}
            value={type}
          />
        </div>
        <SanctionSelectField
          disabled={pending || teams.isPending}
          error={invalid.includes("team") ? t("sanctions.impose.teamRequired") : null}
          id={`${id}-team`}
          items={teamItems}
          label={t("sanctions.impose.team")}
          onChange={(value) => {
            setTeamId(value);
            setPlayerProfileId("");
            setEncounterId("");
            clear("team");
          }}
          placeholder={
            teams.isError
              ? t("sanctions.impose.teamsError")
              : teams.data?.length === 0
                ? t("sanctions.impose.noTeams")
                : t("sanctions.impose.teamPlaceholder")
          }
          value={teamId}
        />
        {targetType === "player" ? (
          <SanctionSelectField
            disabled={pending || !teamId || roster.isPending}
            error={invalid.includes("player") ? t("sanctions.impose.playerRequired") : null}
            id={`${id}-player`}
            items={playerItems}
            label={t("sanctions.impose.player")}
            onChange={(value) => {
              setPlayerProfileId(value);
              clear("player");
            }}
            placeholder={
              teamId
                ? t("sanctions.impose.playerPlaceholder")
                : t("sanctions.impose.playerNeedsTeam")
            }
            value={playerProfileId}
          />
        ) : null}
        {needsAmount ? (
          <Field
            disabled={pending}
            invalid={invalid.includes("points") || invalid.includes("matches")}
          >
            <FieldLabel htmlFor={`${id}-amount`}>
              {type === "points_deduction"
                ? t("sanctions.impose.points")
                : t("sanctions.impose.matches")}
            </FieldLabel>
            <Input
              aria-invalid={invalid.includes("points") || invalid.includes("matches")}
              id={`${id}-amount`}
              inputMode="numeric"
              max={type === "points_deduction" ? 100 : 20}
              min={1}
              onChange={(event) => {
                setAmount(event.target.value);
                clear("points");
                clear("matches");
              }}
              type="number"
              value={amount}
            />
            {invalid.includes("points") ? (
              <FieldError match>{t("sanctions.impose.pointsInvalid")}</FieldError>
            ) : null}
            {invalid.includes("matches") ? (
              <FieldError match>{t("sanctions.impose.matchesInvalid")}</FieldError>
            ) : null}
          </Field>
        ) : null}
        {type === "administrative_defeat" ? (
          <SanctionSelectField
            disabled={pending || !teamId}
            error={invalid.includes("encounter") ? t("sanctions.impose.encounterRequired") : null}
            id={`${id}-encounter`}
            items={encounterItems}
            label={t("sanctions.impose.encounter")}
            onChange={(value) => {
              setEncounterId(value);
              clear("encounter");
            }}
            placeholder={
              !teamId
                ? t("sanctions.impose.playerNeedsTeam")
                : encounterItems.length === 0
                  ? t("sanctions.impose.noEncounters")
                  : t("sanctions.impose.encounterPlaceholder")
            }
            value={encounterId}
          />
        ) : null}
        <Field disabled={pending} invalid={invalid.includes("reason")}>
          <FieldLabel htmlFor={`${id}-reason`}>{t("sanctions.reason")}</FieldLabel>
          <Textarea
            aria-invalid={invalid.includes("reason")}
            id={`${id}-reason`}
            maxLength={500}
            onChange={(event) => {
              setReason(event.target.value);
              clear("reason");
            }}
            required
            rows={3}
            value={reason}
          />
          {invalid.includes("reason") ? (
            <FieldError match>{t("sanctions.reasonRequired")}</FieldError>
          ) : null}
        </Field>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending} render={<Button variant="ghost" />}>
          {t("common.cancel")}
        </AlertDialogCancel>
        <Button disabled={pending} type="submit">
          {t("sanctions.impose.confirm")}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
