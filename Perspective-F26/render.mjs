// Renders the back cover and the posters to print PNGs.
//   back cover  4048 × 2850 px (F25 size)
//   11 × 17     3300 × 5100 px (300 dpi)
//   8.5 × 11    2550 × 3300 px (300 dpi)
//   print/      the posters again with 0.125 in bleed + crop marks, as PNG (300 dpi) and PDF
//               (sheet 12 × 18 in and 9.5 × 12 in; trim 11 × 17 and 8.5 × 11)
// Usage, from the repo root:  node Perspective-F26/render.mjs
// Needs Playwright, which lives in .render/ (run `npm install` there once).
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '..', '.render', 'package.json'));
const { chromium } = require('playwright');

const out = process.env.OUT_DIR || here;
const jobs = [
  // [page, query, viewport, file]
  ['back-cover.html', 'variant=early-bird', [2024, 1425], 'F26-Back-Cover-Early-Bird.png'],
  ['back-cover.html', 'variant=standard', [2024, 1425], 'F26-Back-Cover.png'],
  ['poster.html', 'size=tabloid&variant=early-bird', [1650, 2550], 'F26-Poster-11x17-Early-Bird.png'],
  ['poster.html', 'size=tabloid&variant=standard', [1650, 2550], 'F26-Poster-11x17.png'],
  ['poster.html', 'size=letter&variant=early-bird', [1275, 1650], 'F26-Poster-Letter-Early-Bird.png'],
  ['poster.html', 'size=letter&variant=standard', [1275, 1650], 'F26-Poster-Letter.png'],
  // print versions: viewport = trim + 1 in each way (150 CSS px per inch)
  ['poster.html', 'size=tabloid&variant=early-bird&print=1', [1800, 2700], 'print/F26-Poster-11x17-Early-Bird-bleed.png'],
  ['poster.html', 'size=tabloid&variant=standard&print=1', [1800, 2700], 'print/F26-Poster-11x17-bleed.png'],
  ['poster.html', 'size=letter&variant=early-bird&print=1', [1425, 1800], 'print/F26-Poster-Letter-Early-Bird-bleed.png'],
  ['poster.html', 'size=letter&variant=standard&print=1', [1425, 1800], 'print/F26-Poster-Letter-bleed.png'],
];
const only = process.argv[2]; // optional filter, e.g. `node render.mjs Poster`

const browser = await chromium.launch();
for (const [file, query, [width, height], png] of jobs) {
  if (only && !png.includes(only)) continue;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(here, file) + `?${query}&render=1`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const placeholders = await page.$$eval('[data-placeholder]', els =>
    els.filter(e => e.offsetParent !== null).map(e => e.textContent.trim()));
  const print = query.includes('print=1');
  fs.mkdirSync(path.dirname(path.join(out, png)), { recursive: true });
  await page.locator(print ? '.sheet' : '.cover').screenshot({ path: path.join(out, png) });
  console.log(`[ok] ${png}`);
  if (print) {
    // vector text, embedded fonts; CSS is laid out at 150 px/in, PDF maps 96 px/in, hence 0.64
    const pdf = png.replace(/\.png$/, '.pdf');
    await page.pdf({ path: path.join(out, pdf), width: `${width / 150}in`, height: `${height / 150}in`,
      scale: 96 / 150, printBackground: true, pageRanges: '1' });
    console.log(`[ok] ${pdf}`);
  }
  if (placeholders.length) console.warn(`     ⚠ still placeholder: ${placeholders.join(' · ')}`);
  await ctx.close();
}
await browser.close();
