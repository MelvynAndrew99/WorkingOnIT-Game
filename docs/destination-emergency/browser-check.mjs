import assert from 'node:assert/strict';
import { PNG } from 'pngjs';

// Run against the local Vite server: fixtures import the same pure model as play.
// Isolated browser contexts never touch the developer's ordinary saved town.
const { chromium } = await import(process.env.CITY_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CITY_CHROMIUM_PATH || undefined,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const url = process.env.CITY_URL || 'http://localhost:5177';
const saveKey = 'city-workshop:city:v1';
const sizes = [{ width: 390, height: 844 }, { width: 320, height: 640 }, { width: 1440, height: 900 }]
  .filter(size => !process.env.CITY_VIEWPORT_WIDTH || size.width === Number(process.env.CITY_VIEWPORT_WIDTH));
assert.ok(sizes.length, 'CITY_VIEWPORT_WIDTH must select 320, 390, or 1440');
let activePage;

async function saved(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)).city, saveKey);
}
async function enterPaused(page) {
  await page.getByRole('button', { name: 'Continue commute', exact: true }).click();
  await page.getByRole('button', { name: /Pause/ }).click();
  await page.waitForTimeout(150);
}
async function checkMapPixels(page, width) {
  await page.screenshot({ path: `/tmp/destination-playing-${width}.png` });
  const clip = await page.evaluate(() => {
    const f = document.querySelector('#app-frame').getBoundingClientRect();
    const h = document.querySelector('.city-header').getBoundingClientRect();
    const b = document.querySelector('.city-controls').getBoundingClientRect();
    return { x: f.left + 20, y: h.bottom + 30, width: f.width - 40, height: b.top - h.bottom - 40 };
  });
  assert.ok(clip.height > 180, `Map remains usable at ${width}px (${clip.height}px tall)`);
  const png = PNG.sync.read(await page.screenshot({ clip, path: `/tmp/destination-map-${width}.png` }));
  let white = 0; const colors = new Set();
  for (let i = 0; i < png.data.length; i += 16) {
    const [r, g, b] = png.data.subarray(i, i + 3);
    if (r > 245 && g > 245 && b > 245) white++;
    colors.add(`${r >> 4},${g >> 4},${b >> 4}`);
  }
  assert.ok(white / (png.data.length / 16) < .35, 'Terrain did not become white cached textures');
  assert.ok(colors.size > 30, 'Map contains rendered terrain/building detail');
}
async function seed(page, fixture) {
  const result = await page.evaluate(async ({ fixture, saveKey }) => {
    const m = await import('/src/game/cityModel.ts');
    const c = m.createCity();
    if (fixture === 'visits') {
      c.map = { x: 0, y: 0, width: 32, height: 14 }; c.funds = 30000;
      for (let x = 1; x <= 22; x += 3) m.place(c, 'home', x, 4);
      m.place(c, 'store', 2, 7, 2); m.place(c, 'store', 18, 7, 2); m.place(c, 'park', 10, 7, 2);
      for (let x = 1; x <= 23; x++) m.place(c, 'road', x, 6);
      const used = new Set(); let parked = null;
      for (let i = 0; i < 3000; i++) {
        m.stepCity(c, .1);
        for (const t of c.trips) if (!t.service && t.phase === 'visiting') {
          used.add(t.storeId); parked = structuredClone(c);
        }
        if (used.size === 3 && parked) break;
      }
      if (used.size !== 3 || !parked) throw Error('Both stores and the park must receive real visits');
      Object.assign(c, parked);
      for (const b of c.buildings.filter(b => b.kind === 'store' || b.kind === 'park')) {
        const s = m.buildingStatus(c, b);
        if (s.occupied + s.inbound > s.capacity) throw Error('Destination over capacity');
      }
    } else if (fixture === 'incident') {
      m.place(c, 'hospital', 1, 1); m.place(c, 'policeStation', 5, 1); m.place(c, 'fireStation', 9, 1);
      for (let x = 2; x <= 13; x++) m.place(c, 'road', x, 3);
      for (let y = 4; y <= 6; y++) m.place(c, 'road', 13, y);
      const id = c.nextId++;
      c.incidents.push({ id, x: 13, y: 6, severity: 'fire', status: 'active', createdAt: c.elapsed,
        required: ['police', 'ems', 'fire'], completedServices: [], rescueDeadline: c.elapsed + 90, outcome: 'pending' });
      c.accidentCount = 1;
      m.stepCity(c, .025);
      if (!c.trips.some(t => t.service)) throw Error('Reachable stations did not dispatch');
    } else {
      m.place(c, 'road', 8, 7);
    }
    if (!m.parseCity(c)) throw Error(`${fixture} fixture rejected by save parser`);
    localStorage.setItem(saveKey, JSON.stringify({ city: c, updatedAt: Date.now() + 1000 }));
    return c;
  }, { fixture, saveKey });
  await page.reload(); await enterPaused(page); return result;
}

async function tapTile(page, x, y, focus) {
  const p = await page.evaluate(({ x, y, focus }) => {
    const f = document.querySelector('#app-frame').getBoundingClientRect();
    const h = document.querySelector('.city-header').getBoundingClientRect();
    const b = document.querySelector('.city-controls').getBoundingClientRect();
    const scale = f.width / 720, top = h.bottom + 28, bottom = b.top - 8;
    return { x: f.left + f.width / 2 + (x + .5 - focus.x) * 48 * scale,
      y: (top + bottom) / 2 + (y + .5 - focus.y) * 48 * scale, height: bottom - top };
  }, { x, y, focus });
  assert.ok(p.height > 100, `Usable map height: ${p.height}px`);
  await page.touchscreen.tap(p.x, p.y);
}

try {
  for (const size of sizes) {
    const context = await browser.newContext({ viewport: size, hasTouch: true });
    const page = await context.newPage(); activePage = page; const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.error('Browser page error:', e.message); });
    await page.goto(url); await page.getByRole('button', { name: 'Start your city', exact: true }).waitFor();
    await seed(page, 'tools');
    for (const tool of ['park', 'hospital', 'fireStation', 'policeStation']) {
      await page.locator(`[data-tool="${tool}"]`).click();
      assert.equal(await page.locator('dialog[open]').count(), 0);
    }
    await page.getByRole('button', { name: 'Road closure', exact: true }).click();
    await tapTile(page, 8, 7, { x: 8, y: 7 });
    assert.deepEqual((await saved(page)).closures, [{ x: 8, y: 7 }]);
    await page.getByRole('button', { name: 'Menu', exact: true }).click(); await page.reload(); await enterPaused(page);
    assert.deepEqual((await saved(page)).closures, [{ x: 8, y: 7 }]);
    await page.getByRole('button', { name: 'Road closure', exact: true }).click();
    await tapTile(page, 8, 7, { x: 8, y: 7 }); assert.equal((await saved(page)).closures.length, 0);
    await page.locator('[data-tool="park"]').click();
    const beforePark = (await saved(page)).funds;
    await tapTile(page, 5, 6, { x: 8, y: 7 });
    assert.ok((await saved(page)).buildings.some(b => b.kind === 'park' && b.x === 5 && b.y === 6), 'Park builds through actual touch input');
    assert.equal((await saved(page)).funds, beforePark - 300);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();

    const visits = await seed(page, 'visits');
    assert.ok((await saved(page)).trips.some(t => t.phase === 'visiting'), 'Parked visits restored into live town');
    await checkMapPixels(page, size.width);
    await page.getByRole('button', { name: 'City report', exact: true }).click();
    const report = page.getByRole('dialog');
    assert.match(await report.innerText(), /shopping/i); assert.match(await report.innerText(), /leisure|recreation/i);
    await page.screenshot({ path: `/tmp/destination-report-${size.width}.png` });
    await report.getByRole('button', { name: /Close|Back|Done/i }).click();
    await page.getByRole('button', { name: 'Menu', exact: true }).click(); await page.reload(); await enterPaused(page);
    assert.equal((await saved(page)).buildings.length, visits.buildings.length);
    assert.ok((await saved(page)).trips.some(t => t.phase === 'visiting'));
    await page.getByRole('button', { name: 'Menu', exact: true }).click();

    const incident = await seed(page, 'incident');
    await page.getByRole('button', { name: 'City report', exact: true }).click();
    assert.match(await report.innerText(), /fire/i); assert.match(await report.innerText(), /police/i);
    assert.match(await report.innerText(), /EMS|ambulance/i);
    const detail = report.locator('.incident-detail').first();
    await detail.scrollIntoViewIfNeeded();
    const visibleDetail = await detail.evaluate(el => {
      const d = el.closest('dialog').getBoundingClientRect(), r = el.getBoundingClientRect();
      return Math.min(d.bottom, r.bottom) - Math.max(d.top, r.top);
    });
    assert.ok(visibleDetail > 60, 'Emergency status is reachable inside scrollable report');
    await page.screenshot({ path: `/tmp/emergency-report-${size.width}.png` });
    await report.getByRole('button', { name: /Close|Back|Done/i }).click();
    const frozen = await saved(page); await page.waitForTimeout(350);
    assert.equal((await saved(page)).elapsed, frozen.elapsed, 'Paused incident clock stays frozen');
    await page.getByRole('button', { name: /Resume/ }).click(); await page.waitForTimeout(3500);
    await page.getByRole('button', { name: /Resume/ }).click({ timeout: 5000 });
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const moved = await saved(page);
    assert.ok(moved.elapsed > incident.elapsed + 1, 'Live emergency advances');
    assert.ok(moved.trips.some(t => t.service && t.progress > 0), 'Responders move along actual roads');
    await page.reload(); await enterPaused(page);
    assert.equal((await saved(page)).incidents[0].id, incident.incidents[0].id);
    assert.equal((await saved(page)).accidentCount, 1);
    assert.deepEqual(errors, []); await context.close();
    console.log(`PASS destination/emergency browser integration ${size.width}x${size.height}`);
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: '/tmp/destination-emergency-failure.png' }).catch(() => {});
    console.error('Failure screen:', await activePage.locator('body').innerText().catch(() => 'unavailable'));
  }
  throw error;
} finally { await browser.close(); }
