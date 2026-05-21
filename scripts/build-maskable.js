/* Render the full-bleed maskable icon.
 *
 * The pwa-assets-generator's minimal2023 preset pads maskable icons by 30%,
 * which leaves the logo as a tiny dot inside a white border on Android adaptive
 * icons. We override that one file with a custom full-bleed SVG: lime fills the
 * entire 512x512 canvas, logo sits inside the inner 60% safe zone so it stays
 * visible after any platform mask (circle, squircle, rounded square).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = resolve(root, 'static/maskable.svg');
const dest = resolve(root, 'static/maskable-icon-512x512.png');

const svg = readFileSync(src);
const png = await sharp(svg).resize(512, 512).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(dest, png);
console.log(`[maskable] wrote ${dest} (${png.length} bytes)`);
