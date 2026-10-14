import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const scanRoots = ["apps/web", "apps/mobile", "packages/ui"];
const hatch = join("packages", "ui", "src", "hooks", "use-external-sync.ts");
const sourceExtension = /\.[cm]?tsx?$/;
const disableComment = /(?:eslint|oxlint|oxc)-disable(?:-next-line|-line)?[^\n]*no-raw-use-effect/;
const rawHook = /(?<![\w$])use(?:Layout)?Effect(?![\w$])/;

function walk(directory: string, files: string[]): void {
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walk(path, files);
      continue;
    }
    if (sourceExtension.test(entry)) files.push(path);
  }
}

function posixRelative(filePath: string): string {
  return relative(repoRoot, filePath).split(sep).join("/");
}

describe("futrob/no-raw-use-effect grep", () => {
  const files: string[] = [];
  for (const root of scanRoots) walk(join(repoRoot, root), files);

  it("fails on eslint-disable of the rule outside the hatch", () => {
    const hits = files.flatMap((filePath) => {
      if (posixRelative(filePath) === hatch.split(sep).join("/")) return [];
      const source = readFileSync(filePath, "utf8");
      return disableComment.test(source) ? [posixRelative(filePath)] : [];
    });
    expect(hits).toEqual([]);
  });

  it("fails on leftover useEffect/useLayoutEffect outside the hatch", () => {
    const hits = files.flatMap((filePath) => {
      if (posixRelative(filePath) === hatch.split(sep).join("/")) return [];
      const source = readFileSync(filePath, "utf8");
      return rawHook.test(source) ? [posixRelative(filePath)] : [];
    });
    expect(hits).toEqual([]);
  });
});
