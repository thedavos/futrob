#!/usr/bin/env tsx
import type { Effect } from "effect";
import { HELP_TEXT, run as help } from "./commands/help.ts";
import { run as ping } from "./commands/ping.ts";
import { run as domainSmoke } from "./commands/domain-smoke.ts";
import { run as domainSmokeGameData } from "./commands/domain-smoke-game-data.ts";
import { run as statisticsSmoke } from "./commands/statistics-smoke.ts";
import { run as resultsSmoke } from "./commands/results-smoke.ts";
import { run as apiHealth } from "./commands/api-health.ts";
import { run as clubSearch } from "./commands/search-clubs.ts";
import { orgCreate, orgInvite, orgMine, orgNameCheck } from "./commands/organizations.ts";
import { run as onboardingStatus } from "./commands/onboarding.ts";
import {
  compCreate,
  compList,
  compPublish,
  compShow,
  entryApprove,
  entryRegister,
  entryReject,
  participantAdd,
  participantList,
  standings,
} from "./commands/competitions.ts";
import {
  clubLink,
  rosterAdd,
  rosterClose,
  rosterList,
  rosterOpen,
  teamCreate,
  teamList,
} from "./commands/teams.ts";
import { fixtureGenerate, fixtureShow, snapshotSet } from "./commands/scheduling.ts";
import {
  clubGet,
  clubMatches,
  providerHealth,
  syncJobEnqueue,
  syncJobRun,
  syncJobRunNext,
} from "./commands/game-data.ts";
import { myMatches, myStats, playerMe } from "./commands/players.ts";
import { run as e2eGoldenPath } from "./commands/e2e-golden-path.ts";
import type { CliError } from "./lib/errors.ts";
import { printError } from "./lib/print.ts";
import { runProgram } from "./lib/run-program.ts";

type Handler = (args: string[]) => Effect.Effect<number, CliError>;

const commands = {
  help: () => help(),
  ping: () => ping(),
  "domain-smoke": () => domainSmoke(),
  "domain-smoke-game-data": () => domainSmokeGameData(),
  "statistics-smoke": () => statisticsSmoke(),
  "results-smoke": () => resultsSmoke(),

  "api-health": (args) => apiHealth(args),

  "org-name-check": (args) => orgNameCheck(args),
  "org-create": (args) => orgCreate(args),
  "org-mine": (args) => orgMine(args),
  "org-invite": (args) => orgInvite(args),

  "onboarding-status": (args) => onboardingStatus(args),

  "comp-create": (args) => compCreate(args),
  "comp-list": (args) => compList(args),
  "comp-show": (args) => compShow(args),
  "comp-publish": (args) => compPublish(args),
  "participant-add": (args) => participantAdd(args),
  "participant-list": (args) => participantList(args),
  "entry-register": (args) => entryRegister(args),
  "entry-approve": (args) => entryApprove(args),
  "entry-reject": (args) => entryReject(args),
  standings: (args) => standings(args),

  "team-create": (args) => teamCreate(args),
  "team-list": (args) => teamList(args),
  "roster-list": (args) => rosterList(args),
  "roster-add": (args) => rosterAdd(args),
  "roster-close": (args) => rosterClose(args),
  "roster-open": (args) => rosterOpen(args),
  "club-link": (args) => clubLink(args),

  "fixture-generate": (args) => fixtureGenerate(args),
  "fixture-show": (args) => fixtureShow(args),
  "snapshot-set": (args) => snapshotSet(args),

  "club-search": (args) => clubSearch(args),
  "club-get": (args) => clubGet(args),
  "club-matches": (args) => clubMatches(args),
  "sync-job-enqueue": (args) => syncJobEnqueue(args),
  "sync-job-run": (args) => syncJobRun(args),
  "sync-job-run-next": (args) => syncJobRunNext(args),
  "provider-health": (args) => providerHealth(args),

  "player-me": (args) => playerMe(args),
  "my-stats": (args) => myStats(args),
  "my-matches": (args) => myMatches(args),

  "e2e-golden-path": (args) => e2eGoldenPath(args),
} satisfies Record<string, Handler>;

function isCommandName(name: string): name is keyof typeof commands {
  return name in commands;
}

async function main(): Promise<number> {
  const [commandName = "help", ...args] = process.argv.slice(2);

  if (!isCommandName(commandName)) {
    printError(`Unknown command: ${commandName}`);
    printError(HELP_TEXT);
    return 1;
  }

  return runProgram(commands[commandName](args));
}

const code = await main();
process.exit(code);
