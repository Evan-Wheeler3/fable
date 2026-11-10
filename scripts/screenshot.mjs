// Automated screenshots at preset camera positions.
// Usage: npm run dev (in another terminal), then:
//   npm run shots -- [--url http://localhost:5173] [--q medium] [--seed 7] [--shots a,b] [--out screenshots] [--wait 1500]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const url = arg('url', 'http://localhost:5173');
const out = arg('out', 'screenshots');
const q = arg('q', 'medium');
const seed = arg('seed', '7');
const wait = Number(arg('wait', '1500'));
const only = arg('shots', '');
const tag = arg('tag', q);

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`${url}/?debug&seed=${seed}&q=${q}`);
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 60000 });
const names = only ? only.split(',') : await page.evaluate(() => Object.keys(window.__game.shots));
for (const name of names) {
  await page.evaluate((n) => window.__game.shot(n), name);
  await page.waitForTimeout(wait);
  const file = `${out}/${name}-${tag}.png`;
  await page.screenshot({ path: file });
  const stats = await page.evaluate(() => window.__game.stats());
  console.log(file, JSON.stringify(stats));
}
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
await browser.close();
process.exit(errors.length ? 1 : 0);
