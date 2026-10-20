/**
 * Generates the PWA / Apple touch icons from the brand mark.
 *   npm run icons
 * Outputs: public/icons/icon-192.png, icon-512.png, maskable-512.png and app/apple-icon.png
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PIN = `
  <path d="M24 2C14.06 2 6 10.06 6 20c0 13.5 15.2 24.6 17.2 26a1.4 1.4 0 0 0 1.6 0C26.8 44.6 42 33.5 42 20 42 10.06 33.94 2 24 2Z" fill="#FF5A4D"/>
  <path d="M24 12.2 14.5 20v9.3c0 .7.6 1.3 1.3 1.3H21v-6.4h6v6.4h5.2c.7 0 1.3-.6 1.3-1.3V20L24 12.2Z" fill="#fff"/>`;

/** `fill` = how much of the canvas the 48-unit mark may occupy; `bg` = background colour or null for transparent */
function svg(size, fill, bg) {
  const k = (size * fill) / 48;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
    <g transform="translate(${size / 2} ${size / 2}) scale(${k}) translate(-24 -24)">${PIN}</g>
  </svg>`;
}

const jobs = [
  { file: 'public/icons/icon-192.png', size: 192, fill: 0.86, bg: null },
  { file: 'public/icons/icon-512.png', size: 512, fill: 0.86, bg: null },
  // Maskable icons need the artwork inside the central ~60% "safe zone"
  { file: 'public/icons/maskable-512.png', size: 512, fill: 0.56, bg: '#ffffff' },
  // iOS draws its own rounded mask, so give it a solid background
  { file: 'app/apple-icon.png', size: 180, fill: 0.74, bg: '#ffffff' },
];

for (const { file, size, fill, bg } of jobs) {
  const out = join(root, file);
  await mkdir(dirname(out), { recursive: true });
  await sharp(Buffer.from(svg(size, fill, bg))).png().toFile(out);
  console.log('✓', file);
}
