import type {
  CloseSwissRoundRequest,
  GenerateCompetitionFixtureRequest,
  WithdrawSwissTeamRequest,
} from "@futrob/api-contracts";
import type { FutrobApiError } from "@futrob/sdk";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

export type SwissFixtureCommands = {
  readonly generate: (body: GenerateCompetitionFixtureRequest) => Promise<void>;
  readonly withdraw: (fixturePlanId: string, body: WithdrawSwissTeamRequest) => Promise<void>;
  readonly closeRound: (
    fixturePlanId: string,
    roundNumber: number,
    body: CloseSwissRoundRequest,
  ) => Promise<void>;
};

export type SwissFixtureCommand = "generate" | "withdraw" | "close";

/**
 * What a form does after a command fails. The fixture is reread either way: `close` drops the
 * form and explains on the page; `keep` leaves it, and its request id, for a retry. `uncertain`
 * means the command may have applied, so a retry must repeat it unchanged to replay it.
 */
export interface SwissCommandRecovery {
  readonly draft: "close" | "keep";
  readonly uncertain: boolean;
  readonly field: "team" | "rounds" | null;
  readonly message:
    | { readonly key: ParameterlessMessageKey }
    | { readonly code: string }
    | { readonly upsell: string };
}

const closing = (key: ParameterlessMessageKey): SwissCommandRecovery => ({
  draft: "close",
  uncertain: false,
  field: null,
  message: { key },
});

const keeping = (
  key: ParameterlessMessageKey,
  field: SwissCommandRecovery["field"] = null,
): SwissCommandRecovery => ({ draft: "keep", uncertain: false, field, message: { key } });

const UNKNOWN_OUTCOME: SwissCommandRecovery = {
  draft: "keep",
  uncertain: true,
  field: null,
  message: { key: "fixture.recovery.unknown" },
};

const rules = new Map<string, SwissCommandRecovery>([
  ["scheduling.swiss_round_not_current", closing("fixture.recovery.roundNotCurrent")],
  ["scheduling.swiss_team_already_withdrawn", closing("fixture.recovery.alreadyWithdrawn")],
  ["scheduling.swiss_team_not_participant", keeping("fixture.recovery.notParticipant", "team")],
  ["scheduling.not_swiss_fixture", closing("fixture.recovery.notSwiss")],
  ["scheduling.fixture_update_conflict", keeping("fixture.recovery.conflict")],
  ["scheduling.fixture_plan_not_found", closing("fixture.recovery.planGone")],
  ["scheduling.fixture_generation_conflict", closing("fixture.recovery.generationConflict")],
  ["scheduling.fixture_supersede_conflict", closing("fixture.recovery.generationConflict")],
  ["scheduling.fixture_source_not_published", closing("fixture.recovery.notPublished")],
  ["scheduling.fixture_source_not_found", closing("fixture.recovery.planGone")],
  ["authorization.forbidden", closing("fixture.recovery.permission")],
]);

/** `null` stands for a failure with no API answer, such as a dropped connection. */
export function swissCommandRecovery(
  error: FutrobApiError | null,
  command: SwissFixtureCommand,
): SwissCommandRecovery {
  if (!error || error.status >= 500) return UNKNOWN_OUTCOME;
  if (error.status === 402) {
    return { draft: "keep", uncertain: false, field: null, message: { upsell: error.code } };
  }
  const rule = rules.get(error.code);
  if (rule) return rule;
  if (error.code === "scheduling.invalid_fixture_configuration") {
    return command === "generate"
      ? keeping("fixture.recovery.invalidGenerate", "rounds")
      : keeping("fixture.recovery.invalidCommand");
  }
  return { draft: "keep", uncertain: false, field: null, message: { code: error.code } };
}

/** The sentence for any recovery but an upsell, which renders its own alert. */
export function swissRecoveryText(recovery: SwissCommandRecovery, t: Translator): string {
  const { message } = recovery;
  if ("key" in message) return t(message.key);
  return t.error("code" in message ? message.code : message.upsell);
}
