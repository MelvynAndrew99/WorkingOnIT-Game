import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Real game renderer, isolated browser contexts and saves: a tight block of homes in all four
// orientations on shared streets. Run against local Vite after rebuilding the atlas.
const playwright = await import(process.env.CITY_PLAYWRIGHT_MODULE || 'playwright');
const chromium = playwright.chromium ?? playwright.default.chromium;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CITY_CHROMIUM_PATH || undefined,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const url = process.env.CITY_URL || 'http://localhost:5177';
const directory = fileURLToPath(new URL('.', import.meta.url));
const saveKey = 'city-workshop:city:v1';
try {
  for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport: size, hasTouch: size.width < 500 });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.getByRole('button', { name: 'Start your city', exact: true }).waitFor();
    const placed = await page.evaluate(async ({ saveKey }) => {
      const m = await import('/src/game/cityModel.ts');
      const c = m.createCity(); c.funds = 30000;
      const home = (x, y, r) => { const n = c.buildings.length; m.place(c, 'home', x, y, r); if (c.buildings.length !== n + 1) throw Error(`home ${x},${y},${r}: blocked`); };
      for (let x = 0; x <= 15; x++) { m.place(c, 'road', x, 3); m.place(c, 'road', x, 8); }
      for (let y = 9; y <= 13; y++) m.place(c, 'road', 10, y);
      for (let y = 4; y <= 7; y++) m.place(c, 'road', 15, y);
      for (const x of [0, 2, 4, 6]) { home(x, 1, 0); home(x, 4, 2); home(x, 6, 0); }  // south / north / south, back to back
      for (const y of [9, 11]) { home(8, y, 3); home(11, y, 1); }                // east / west onto the side street
      m.place(c, 'store', 12, 1, 0);
      if (c.buildings.at(-1)?.kind !== 'store') throw Error('store blocked');
      if (!m.parseCity(c)) throw Error('Fixture must survive normal save parsing');
      localStorage.setItem(saveKey, JSON.stringify({ city: c, updatedAt: Date.now() + 1000 }));
      return c.buildings.map(b => [b.kind, b.rotation]);
    }, { saveKey });
    assert.equal(placed.filter(([k]) => k === 'home').length, 16);
    await page.reload();
    await page.getByRole('button', { name: 'Continue commute', exact: true }).click();
    await page.waitForTimeout(1500);
    const frames = await page.evaluate(async () => {
      const art = await import('/src/game/cityArt.ts');
      return ['S', 'W', 'N', 'E'].flatMap(side => [0, 1, 2, 3].map(v => { const t = art.frame(`home_${v}_${side}`); return [t.width, t.height]; }));
    });
    for (const [w, h] of frames) { assert.equal(w, 32); assert.equal(h, 32); }
    const path = `${directory}in-game-${size.width}.png`;
    await page.screenshot({ path });
    if (size.width === 1440) {
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${directory}in-game-1440-zoom.png` });
    }
    assert.deepEqual(errors, []);
    console.log(`PASS home lots ${size.width}x${size.height}: ${path}`);
    await context.close();
  }
} finally { await browser.close(); }
