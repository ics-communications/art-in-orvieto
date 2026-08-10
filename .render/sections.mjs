import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const out = process.env.SHOT_DIR || root;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
await page.goto('file://' + path.join(root, 'index.html'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(async () => {
  document.querySelectorAll('.threshold, .reveal').forEach(el => el.classList.add('seen'));
  await new Promise(r => setTimeout(r, 300));
});
for (const id of ['town','monastery','hours','people','stay','kalendarium','fees','apply']) {
  await page.locator('#' + id).screenshot({ path: path.join(out, `sec-${id}.png`) });
}
await page.locator('.site-foot').screenshot({ path: path.join(out, 'sec-footer.png') });
await ctx.close(); await browser.close();
console.log('done');
