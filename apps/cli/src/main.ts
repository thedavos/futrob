#!/usr/bin/env tsx
import { run as help } from "./commands/help.ts";
import { run as ping } from "./commands/ping.ts";
import { run as domainSmoke } from "./commands/domain-smoke.ts";
import { run as searchClubs } from "./commands/search-clubs.ts";
import { printError } from "./lib/print.ts";

type Command = (args: string[]) => Promise<number>;

const commands: Record<string, Command> = {
  help: async () => help(),
  ping: async () => ping(),
  "domain-smoke": async () => domainSmoke(),
  "search-clubs": async (args) => searchClubs(args),
};

async function main(): Promise<number> {
  const [commandName = "help", ...args] = process.argv.slice(2);
  const command = commands[commandName];

  if (!command) {
    printError(`Unknown command: ${commandName}`);
    await help();
    return 1;
  }

  return command(args);
}

const code = await main();
process.exit(code);
