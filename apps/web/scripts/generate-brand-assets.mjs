/** Regenerate web brand assets: npm run generate:assets -w @futrob/web. */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { themeToHexColors } from "../../../packages/ui-tokens/src/index.ts";

const colors = themeToHexColors();
const publicDir = new URL("../public/", import.meta.url);
const source = await readFile(
  new URL("../../../packages/ui/src/logo.tsx", import.meta.url),
  "utf8",
);
const logoPath = source.match(/const LOGO_PATH =\s*"([\s\S]*?)";/)?.[1];
if (!logoPath) throw new Error("Could not extract canonical LOGO_PATH");
const mark = `<path fill="${colors.primary}" fill-rule="evenodd" d="${logoPath}"/>`;
const title = '<title id="title">Futrob</title>';
const attributes = 'xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title"';
const logo = `<svg ${attributes} viewBox="240 197 553 622">${title}${mark}</svg>\n`;
const favicon = `<svg ${attributes} viewBox="0 0 512 512">${title}<svg x="56" y="32" width="400" height="448" viewBox="240 197 553 622">${mark}</svg></svg>\n`;
await writeFile(new URL("logo.svg", publicDir), logo);
await writeFile(new URL("favicon.svg", publicDir), favicon);

for (const [file, size] of [
  ["favicon-32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
]) {
  const icon = sharp(Buffer.from(favicon)).resize(size, size);
  if (file !== "favicon-32.png") icon.flatten({ background: colors.background });
  await icon.png().toFile(fileURLToPath(new URL(`icons/${file}`, publicDir)));
}
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="${colors.background}"/><svg x="128" y="112" width="256" height="288" viewBox="240 197 553 622">${mark}</svg></svg>`;
await sharp(Buffer.from(maskable))
  .png()
  .toFile(fileURLToPath(new URL("icons/icon-maskable-512.png", publicDir)));

// ICO supports embedded PNG frames; keep 16, 32 and 48 px fallbacks.
const sizes = [16, 32, 48];
const frames = await Promise.all(
  sizes.map((size) => sharp(Buffer.from(favicon)).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(new URL("favicon.ico", publicDir), Buffer.concat([header, ...frames]));
await sharp(fileURLToPath(new URL("og/futrob-default.svg", publicDir)))
  .png()
  .toFile(fileURLToPath(new URL("og/futrob-default.png", publicDir)));
