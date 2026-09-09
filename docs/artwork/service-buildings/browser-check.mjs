import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { fileURLToPath } from 'node:url';

// Real game renderer and isolated local saves. Run against a stable Vite source
// window after atlas generation; no developer save or runtime source is changed.
const { chromium } = await import(process.env.CITY_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CITY_CHROMIUM_PATH || undefined,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const url = process.env.CITY_URL || 'http://localhost:5177';
const directory = fileURLToPath(new URL('.', import.meta.url));
const saveKey = 'city-workshop:city:v1';
const sizes = [{ width: 390, height: 844 }, { width: 320, height: 640 }, { width: 1440, height: 900 }]
  .filter(size => !process.env.CITY_VIEWPORT_WIDTH || size.width === Number(process.env.CITY_VIEWPORT_WIDTH));
assert.ok(sizes.length, 'CITY_VIEWPORT_WIDTH must select 320, 390, or 1440');
let activePage;
try {
  for (const size of sizes) {
    for (let rotation = 0; rotation < 4; rotation++) {
      const context = await browser.newContext({ viewport: size, hasTouch: size.width < 500 });
      const page = await context.newPage(); activePage = page;
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(url);
      await page.getByRole('button', { name: 'Start your city', exact: true }).waitFor();
      await page.evaluate(async ({ rotation, saveKey }) => {
        const m = await import('/src/game/cityModel.ts');
        const c = m.createCity(); c.funds = 30000;
        for (const [i, kind] of ['fireStation', 'policeStation', 'hospital'].entries()) {
          m.place(c, kind, 2 + i * 4, 5, rotation);
          const b = c.buildings.at(-1);
          if (b?.kind !== kind) throw Error(`Placement failed: ${kind}`);
          const e = m.entrance(b); m.place(c, 'road', e.x, e.y);
        }
        m.place(c, 'store', 6, 10, 0);
        if (!m.parseCity(c)) throw Error('Art fixture must survive normal save parsing');
        localStorage.setItem(saveKey, JSON.stringify({ city: c, updatedAt: Date.now() + 1000 }));
      }, { rotation, saveKey });
      await page.reload();
      await page.getByRole('button', { name: 'Continue commute', exact: true }).click();
      await page.getByRole('button', { name: /Pause/ }).click();
      await page.waitForTimeout(250);
      const frames = await page.evaluate(async ({ rotation }) => {
        const art = await import('/src/game/cityArt.ts');
        const side = ['S', 'W', 'N', 'E'][rotation];
        return ['fireStation', 'policeStation', 'hospital'].map(kind => {
          const texture = art.frame(`building_${kind}_${side}`);
          return { kind, side, width: texture.width, height: texture.height, loaded: texture.width > 1 && texture.height > 1 };
        });
      }, { rotation });
      for (const f of frames) {
        assert.ok(f.loaded, `${f.kind}/${f.side} loaded`);
        assert.equal(f.width, rotation % 2 ? 32 : 48);
        assert.equal(f.height, rotation % 2 ? 48 : 32);
      }
      const path = `${directory}in-game-${size.width}-rotation-${rotation}.png`;
      const png = PNG.sync.read(await page.screenshot({ path }));
      const colors = new Set();
      for (let i = 0; i < png.data.length; i += 16) colors.add(`${png.data[i] >> 4},${png.data[i+1] >> 4},${png.data[i+2] >> 4}`);
      assert.ok(colors.size > 30, 'Gameplay screenshot contains rendered detail');
      const liveSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).city, saveKey);
      assert.equal(liveSave.buildings.filter(b => b.kind !== 'store').length, 3);
      assert.ok(liveSave.buildings.filter(b => b.kind !== 'store').every(b => b.rotation === rotation));
      assert.deepEqual(errors, []);
      if (size.width === 1440 && rotation === 0) {
        await page.locator('[data-tool="hospital"]').click();
        const pointer = await page.evaluate(() => {
          const f = document.querySelector('#app-frame').getBoundingClientRect();
          const h = document.querySelector('.city-header').getBoundingClientRect();
          const b = document.querySelector('.city-controls').getBoundingClientRect();
          const scale = f.width / 720;
          return { x: f.left + f.width / 2 + (2.5 - 7) * 48 * scale,
            y: (h.bottom + 28 + b.top - 8) / 2 + (9.5 - 7.25) * 48 * scale };
        });
        await page.mouse.move(pointer.x, pointer.y); await page.waitForTimeout(100);
        await page.screenshot({ path: `${directory}in-game-hospital-placement.png` });
        assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).city.buildings.length, saveKey), 4,
          'Hover preview must not construct');
      }
      console.log(`PASS service art ${size.width}x${size.height}, rotation ${rotation}: ${path}`);
      await context.close();
    }
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: `${directory}browser-failure.png` }).catch(() => {});
    console.error(await activePage.locator('body').innerText().catch(() => 'unavailable'));
  }
  throw error;
} finally { await browser.close(); }
