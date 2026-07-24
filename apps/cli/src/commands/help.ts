import { print } from "../lib/print.ts";

export async function run(): Promise<number> {
  print(`futrob cli — playground de dominio

Uso:
  npm run cli -- <comando> [args]

Comandos:
  help           Esta ayuda
  ping           Comprueba que el CLI arranca
  domain-smoke   Smoke de shared-kernel + tipos de scheduling/results
  search-clubs   Busca clubes vía @futrob/sdk (requiere npm run dev)

Guía: apps/cli/README.md
`);
  return 0;
}
