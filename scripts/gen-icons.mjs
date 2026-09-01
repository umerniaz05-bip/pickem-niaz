/**
 * Render PNG app icons from public/icon.svg. Run when the SVG changes:
 *   node scripts/gen-icons.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const svg = await readFile(`${root}public/icon.svg`);

const targets = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  { file: "public/apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  const png = await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toBuffer();
  await writeFile(`${root}${file}`, png);
  console.log(`wrote ${file} (${size}x${size}, ${png.length} bytes)`);
}
