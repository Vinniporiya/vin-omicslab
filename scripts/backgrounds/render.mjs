// Renders the background images to public/bg/. Dev-only: needs Playwright and sharp (not used by the site build).
// Usage: node scripts/backgrounds/render.mjs [name ...]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
const out = fileURLToPath(new URL('../../public/bg/', import.meta.url));
mkdirSync(out, { recursive: true });
const code = readFileSync(here + 'draw.js', 'utf8');
export const JOBS = {
  'tissue-if': { fn: 'drawIF', w: 2400, h: 1350, seed: 7, q: 72 },
  'tissue-he': { fn: 'drawHE', w: 2400, h: 1350, seed: 7, q: 74 },
  'visium': { fn: 'drawVisium', w: 1600, h: 700, seed: 11, q: 74 },
  'hic': { fn: 'drawHiC', w: 1600, h: 700, seed: 3, q: 62, alpha: true },
  'tracks': { fn: 'drawTracks', w: 1600, h: 700, seed: 5, q: 80, alpha: true },
};
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(`<canvas id=c></canvas><script>${code}</script>`);
for (const name of want) {
  const j = JOBS[name];
  const png = await p.evaluate(({ j }) => { const c = document.getElementById('c'); c.width = j.w; c.height = j.h; const ctx = c.getContext('2d'); ctx.clearRect(0, 0, j.w, j.h); window.Draw[j.fn](ctx, j.w, j.h, j.seed); return c.toDataURL('image/png'); }, { j });
  const buf = Buffer.from(png.split(',')[1], 'base64');
  const sizes = name.startsWith('tissue') ? [2400, 1280] : [1200];
  for (const w of sizes) {
    const file = `${out}${name}${w === j.w || !name.startsWith('tissue') ? '' : '-' + w}.webp`;
    const info = await sharp(buf).resize({ width: w }).webp({ quality: j.q, alphaQuality: 90, effort: 6 }).toFile(file);
    console.log(file.split('/').slice(-2).join('/'), `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
  }
}
await b.close();
