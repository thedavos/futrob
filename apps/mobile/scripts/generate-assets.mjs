/**
 * Generates apps/mobile/assets images (app icon, adaptive-icon foreground,
 * splash mark) from the canonical Futrob logo path in @futrob/ui and colors
 * from @futrob/ui-tokens.
 *
 * Run: npm run generate:assets -w @futrob/mobile
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workspaceRoot = path.resolve(projectRoot, "../..");
const assetsDir = path.join(projectRoot, "assets");

const { BRAND_SCALE, NEUTRAL_SCALE, oklchToHex } = await import(
  path.join(workspaceRoot, "packages/ui-tokens/src/index.ts")
);

const BRAND = oklchToHex(BRAND_SCALE[500]);
const BACKGROUND = oklchToHex(NEUTRAL_SCALE[50]);

// Single source of truth for the mark: packages/ui/src/logo.tsx.
const logoSource = readFileSync(path.join(workspaceRoot, "packages/ui/src/logo.tsx"), "utf8");
const LOGO_PATH = logoSource.match(/const LOGO_PATH =\s*"([\s\S]*?)";/)?.[1];
if (!LOGO_PATH) {
  throw new Error("Could not extract LOGO_PATH from packages/ui/src/logo.tsx");
}
const VIEWBOX = { x: 240, y: 197, width: 553, height: 622 };

function logoSvg({ size, color }) {
  const scale = size / VIEWBOX.height;
  const width = Math.round(VIEWBOX.width * scale * 100) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${size}" viewBox="${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}"><path d="${LOGO_PATH}" fill="${color}" fill-rule="evenodd"/></svg>`;
}

async function renderIcon({ file, canvas, markSize, background }) {
  const mark = Buffer.from(logoSvg({ size: markSize, color: BRAND }));
  const markWidth = Math.round((markSize / VIEWBOX.height) * VIEWBOX.width);
  let pipeline = sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([
    {
      input: mark,
      left: Math.round((canvas - markWidth) / 2),
      top: Math.round((canvas - markSize) / 2),
    },
  ]);
  if (background !== undefined) {
    pipeline = pipeline.flatten({ background });
  }
  await pipeline.png().toFile(path.join(assetsDir, file));
}

mkdirSync(assetsDir, { recursive: true });

await renderIcon({ file: "icon.png", canvas: 1024, markSize: 640, background: BACKGROUND });
await renderIcon({ file: "adaptive-icon.png", canvas: 1024, markSize: 480 });
await renderIcon({ file: "splash-icon.png", canvas: 512, markSize: 420 });

// Keep the resolved palette visible next to the binaries.
writeFileSync(
  path.join(assetsDir, "palette.json"),
  `${JSON.stringify({ brand: BRAND, splashBackground: BACKGROUND }, null, 2)}\n`,
);

console.warn(`assets generated (brand ${BRAND}, background ${BACKGROUND})`);
