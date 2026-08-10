import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const fileUrl = (p) => 'file://' + path.join(root, p);
const out = process.env.SHOT_DIR || root;

const browser = await chromium.launch();
for (const [name, width] of [['desktop', 1440], ['mobile', 390]]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(fileUrl('index.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    // force all reveals visible for full-page capture
    document.querySelectorAll('.threshold, .reveal').forEach(el => el.classList.add('seen'));
    await new Promise(r => setTimeout(r, 400));
  });
  await page.screenshot({ path: path.join(out, `shot-${name}.png`), fullPage: true });
  // also first viewport
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(out, `shot-${name}-viewport.png`) });
  await ctx.close();
  console.log('[ok]', name);
}
await browser.close();
