import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Real game renderer with an isolated save: bus stops facing all four curbs beside homes and a
// shop. CITY_SHOT_PREFIX names the screenshots (e.g. "before" / "in-game").
const playwright = await import(process.env.CITY_PLAYWRIGHT_MODULE || 'playwright');
const chromium = playwright.chromium ?? playwright.default.chromium;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CITY_CHROMIUM_PATH || undefined,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const url = process.env.CITY_URL || 'http://localhost:5177';
const prefix = process.env.CITY_SHOT_PREFIX || 'in-game';
const directory = fileURLToPath(new URL('.', import.meta.url));
const saveKey = 'city-workshop:city:v1';
try {
  for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport: size, hasTouch: size.width < 500 });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.getByRole('button', { name: 'Start your city', exact: true }).waitFor();
    const stops = await page.evaluate(async ({ saveKey }) => {
      const m = await import('/src/game/cityModel.ts');
      const c = m.createCity(); c.funds = 30000;
      const put = (kind, x, y, r = 0) => { const n = c.buildings.length; const why = m.place(c, kind, x, y, r); if (c.buildings.length !== n + 1) throw Error(`${kind} ${x},${y},${r}: ${why}`); };
      for (let x = 0; x <= 15; x++) m.place(c, 'road', x, 5);
      for (let y = 6; y <= 13; y++) m.place(c, 'road', 13, y);
      put('home', 0, 3, 0); put('store', 6, 3, 0); put('home', 0, 6, 2); put('home', 6, 6, 2);
      put('busStop', 3, 4, 0); put('busStop', 10, 4, 0);     // south curb
      put('busStop', 3, 6, 2); put('busStop', 9, 6, 2);      // north curb
      put('busStop', 12, 9, 3); put('busStop', 14, 11, 1);   // east / west curb
      if (!m.parseCity(c)) throw Error('Fixture must survive normal save parsing');
      localStorage.setItem(saveKey, JSON.stringify({ city: c, updatedAt: Date.now() + 1000 }));
      return c.buildings.filter(b => b.kind === 'busStop').map(b => b.rotation);
    }, { saveKey });
    assert.deepEqual(stops, [0, 0, 2, 2, 3, 1]);
    await page.reload();
    await page.getByRole('button', { name: 'Continue commute', exact: true }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Zoom in', exact: true }).first().click().catch(() => page.getByRole('button', { name: '+', exact: true }).click());
    await page.waitForTimeout(600);
    const path = `${directory}${prefix}-${size.width}.png`;
    await page.screenshot({ path });
    assert.deepEqual(errors, []);
    console.log(`PASS bus stops ${size.width}x${size.height}: ${path}`);
    await context.close();
  }
} finally { await browser.close(); }
