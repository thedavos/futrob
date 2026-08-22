import { writeFile } from "node:fs/promises";
import { z } from "zod";

const apiKey = process.env.CURSOR_API_KEY;
if (!apiKey) {
  console.error("CURSOR_API_KEY is not set. Add it as a repository secret.");
  process.exit(1);
}

const prNumber = process.env.PR_NUMBER;
const repo = process.env.REPO ?? "thedavos/futrob";
const modelId = process.env.CURSOR_MODEL || "composer-2.5";

const prompt = `
Actúas como revisor de calidad del repo Futrob (lee AGENTS.md y docs/architecture/ para contexto).
Audita el código cambiado en el pull request #${prNumber} de ${repo}.
Obtén el diff con: gh pr diff ${prNumber} --repo ${repo}
y el detalle con: gh pr view ${prNumber} --repo ${repo}
El checkout local ya está en el head del PR. NO hagas push ni commits.

Ejecuta estas 4 verificaciones y entrega un informe priorizado por severidad:

1. COBERTURA DE TESTS — Para cada archivo de producción (.ts/.tsx) cambiado,
   identifica lógica nueva sin test correspondiente (dominio/application en packages/,
   rutas HTTP en apps/api/src/http/, presentación crítica en apps/web).
   Señala los 5 huecos más riesgosos con el test concreto que falta.

2. DRIFT DE DOCUMENTACIÓN — Verifica que los cambios no contradigan AGENTS.md,
   README.md, docs/architecture/*.md ni docs/adr/*: comandos, rutas de archivos,
   decisiones registradas. Lista cada contradicción con archivo y línea.

3. DEUDA TÉCNICA INTRODUCIDA — En el diff busca: funciones >50 líneas,
   duplicación con código existente del repo, \`any\` implícito o type assertions
   sin comentario SAFETY, imports muertos, archivos nuevos que superen 400 líneas
   efectivas (sin blanks ni comentarios).

4. VALIDACIÓN EJECUTABLE — Corre en orden y reporta el resultado de cada uno:
   npm run check && npm run typecheck && npm run test
   Si algo falla, determina si es atribuible al PR o pre-existente.

REGLAS:
- SOLO analiza y reporta. No modifiques código, salvo typos evidentes en documentación.
- No toques .github/, package-lock.json ni ningún secret.
- Si una verificación no arroja hallazgos, dilo explícitamente.
- Cierra con un veredicto: APROBAR / APROBAR CON CAMBIOS / BLOQUEAR, con justificación breve.
`.trim();

const { Agent } = await import("@cursor/sdk");

console.warn(`Creating Cursor agent (model: ${modelId}) against ${process.cwd()}`);
const agent = await Agent.create({
  apiKey,
  model: { id: modelId },
  local: { cwd: process.cwd() },
});

try {
  const run = await agent.send(prompt);
  // Defensive extraction: the SDK event union has evolved before, so accept
  // either a bare string or an object carrying the assistant text.
  const reportEventSchema = z.union([
    z.string(),
    z.object({
      text: z.string().optional(),
      assistantMessageText: z.string().optional(),
      delta: z.string().optional(),
      content: z.object({ text: z.string().optional() }).optional(),
    }),
  ]);
  let report = "";
  for await (const event of run.stream()) {
    const parsed = reportEventSchema.safeParse(event);
    if (!parsed.success) continue;
    const text =
      parsed.data === "string"
        ? parsed.data
        : (parsed.data.text ??
          parsed.data.assistantMessageText ??
          parsed.data.delta ??
          parsed.data.content?.text ??
          "");
    if (text.length > 0) {
      report += text;
      process.stdout.write(text);
    }
  }
  if (!report.trim()) {
    console.error("\nAgent produced no report text — check the events above.");
    process.exit(1);
  }

  const header = `## 🔍 Verificaciones automáticas (PR #${prNumber})\n\n`;
  const body = `${header}${report}\n\n---\n<sub>Generado por el workflow **Verifications** (Cursor agent).</sub>\n`;
  await writeFile("audit-report.md", body);

  const { execFileSync } = await import("node:child_process");
  execFileSync(
    "gh",
    ["pr", "comment", String(prNumber), "--repo", repo, "--body-file", "audit-report.md"],
    { stdio: "inherit" },
  );
  console.warn(`\nReport posted to PR #${prNumber}`);
} finally {
  try {
    await agent.close();
  } catch {
    // closing an already-terminal local agent is fine to fail silently
  }
}
