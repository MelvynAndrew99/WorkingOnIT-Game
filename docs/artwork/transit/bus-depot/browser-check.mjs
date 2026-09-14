import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Real game renderer with an isolated save: depots facing all four entrance sides, each with
// two bought buses parked in their bays.
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
    const fleet = await page.evaluate(async ({ saveKey }) => {
      const m = await import('/src/game/cityModel.ts');
      const t = await import('/src/game/cityTransit.ts');
      const c = m.createCity(); c.funds = 60000;
      for (let x = 0; x <= 15; x++) m.place(c, 'road', x, 5);
      for (let y = 1; y <= 4; y++) m.place(c, 'road', 11, y);
      const depot = (x, y, r) => { const n = c.buildings.length; const why = m.place(c, 'busStation', x, y, r); const b = c.buildings.at(-1); if (c.buildings.length !== n + 1) throw Error(`depot ${x},${y},${r}: ${why}`); return b; };
      const depots = [depot(1, 2, 0), depot(5, 6, 2), depot(12, 1, 1), depot(8, 2, 3)];  // S, N, W, E entrances
      for (const d of depots) for (let i = 0; i < 2; i++) { const why = t.buyBus(c, d.id); if (c.transit.fleet.filter(b => b.stationId === d.id).length !== i + 1) throw Error(`bus ${d.id}: ${why}`); }
      if (!m.parseCity(c)) throw Error('Fixture must survive normal save parsing');
      localStorage.setItem(saveKey, JSON.stringify({ city: c, updatedAt: Date.now() + 1000 }));
      return depots.map(d => [d.rotation, c.transit.fleet.filter(b => b.stationId === d.id).length]);
    }, { saveKey });
    assert.deepEqual(fleet, [[0, 2], [2, 2], [1, 2], [3, 2]]);
    await page.reload();
    await page.getByRole('button', { name: 'Continue commute', exact: true }).click();
    await page.waitForTimeout(1500);
    const path = `${directory}in-game-${size.width}.png`;
    await page.screenshot({ path });
    if (size.width === 1440) {
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await page.waitForTimeout(600);
      await page.screenshot({ path: `${directory}in-game-1440-zoom.png` });
    }
    assert.deepEqual(errors, []);
    console.log(`PASS bus depots ${size.width}x${size.height}: ${path}`);
    await context.close();
  }
} finally { await browser.close(); }
