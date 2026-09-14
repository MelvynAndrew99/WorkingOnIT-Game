import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const out = process.env.HUD_EVIDENCE_DIR ?? 'docs/hud-chrome/evidence';
await fs.mkdir(out, {recursive: true});
const base = process.env.UI_BASE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH ?? '/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function bind(page) {
  await page.evaluate(async () => {
    const resource = performance.getEntriesByType('resource').map(e => e.name);
    window.save = await import(resource.filter(n => n.includes('/src/state/save.ts')).at(-1));
    window.state = await import(resource.filter(n => n.includes('/src/state/store.ts')).at(-1));
    window.commands = await import(resource.filter(n => n.includes('/src/game/cityControls.ts')).at(-1));
  });
}

const results = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['narrow', 390, 844]]) {
    const context = await browser.newContext({viewport: {width, height}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
    await page.goto(base);
    const play = page.getByRole('button', {name: /Start your city|Continue commute/}).first();
    await play.click();
    await page.locator('canvas').waitFor();
    await page.waitForTimeout(800);
    await bind(page);
    await page.evaluate(() => window.commands.cityCommand({type: 'tutorial', action: 'skip'}));
    await page.waitForTimeout(400);

    await page.getByRole('button', {name: 'Inspect', exact: true}).waitFor();
    const trackerBtn = page.getByRole('button', {name: /^Tracker/});
    await trackerBtn.waitFor();
    assert.ok(await trackerBtn.isVisible(), `${name} tracker visible at start`);
    assert.deepEqual(await page.locator('.city-stats-bar dt').allTextContents(), ['Funds', 'Visitors', 'On Road', 'Fatalities', 'Time', 'Weather']);
    assert.deepEqual(await page.locator('.city-pulse-bar dt').allTextContents(), ['Trips', 'Avg wait', 'Shop', 'Work', 'Park', 'Trips', 'Bus rides']);

    const tracker = page.getByRole('button', {name: /^Tracker/});
    const box = await tracker.boundingBox();
    assert.ok(box && box.height >= 44 - 0.6 && box.width >= 44 - 0.6, `${name} tracker ${box?.width}x${box?.height}`);

    await tracker.click();
    await page.locator('#city-tracker').waitFor();
    await page.getByRole('heading', {name: 'City tracker', exact: true}).waitFor();
    await page.screenshot({path: `${out}/${name}-tracker-open.png`});
    await page.getByRole('button', {name: 'Close Tracker', exact: true}).click();
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-controls') === 'city-tracker');

    await bind(page);
    await page.evaluate(async () => {
      const {place} = await import('/src/game/cityModel.ts');
      const city = window.save.getSave().city;
      city.funds = Math.max(city.funds, 5000);
      const x = city.map.x + city.map.width - 4;
      const y = city.map.y + city.map.height - 4;
      const placed = [];
      for (const dx of [-1, 0, 1]) placed.push(place(city, 'road', x + dx, y));
      for (const dy of [-1, 1]) placed.push(place(city, 'road', x, y + dy));
      city.completed = 164;
      city.history.push({at: city.elapsed, wait: 3.2, service: {homeId: 1, purpose: 'shopping', visitedAt: Math.max(0, city.elapsed - 1)}});
      city.history.push({at: city.elapsed, wait: 1, service: {homeId: 1, purpose: 'work', visitedAt: Math.max(0, city.elapsed - 1)}});
      city.risks.push({x, y, exposure: 4, lastConflictAt: city.elapsed, firstId: 1, secondId: 2});
      window.__pulseJunction = {x, y, placed, roads: city.roads.filter(p => Math.abs(p.x - x) + Math.abs(p.y - y) <= 1)};
    });
    const chip = page.locator('.tracker-chip');
    await chip.waitFor({timeout: 8000});
    const at = await page.evaluate(() => window.__pulseJunction);
    assert.match(await chip.innerText(), new RegExp(`Failed-yield at ${at.x},${at.y}`));
    await page.locator('.city-pulse-bar').getByText('164', {exact: true}).waitFor();
    await page.waitForTimeout(2500);
    const debug = await page.evaluate(() => ({
      at: window.__pulseJunction,
      issues: window.state.store.get().pulse.issues,
      risks: window.save.getSave().city.risks,
      elapsed: window.save.getSave().city.elapsed,
    }));
    assert.equal(await chip.count(), 1, `${name} chip stayed visible ${JSON.stringify(debug)}`);
    assert.ok(await tracker.isVisible(), `${name} tracker still visible with chip`);
    const pulseBox = await page.locator('.city-pulse-bar').boundingBox();
    assert.ok(pulseBox && pulseBox.height >= 16, `${name} commute strip height ${pulseBox?.height}`);
    await page.screenshot({path: `${out}/${name}-tracker-chip.png`});
    await chip.click();
    await page.locator('#city-tracker').waitFor();
    const issue = page.getByRole('button', {name: new RegExp(`Failed-yield at ${at.x},${at.y}`)});
    await issue.waitFor();
    await page.screenshot({path: `${out}/${name}-tracker-issue.png`});
    await issue.click();
    await page.getByRole('button', {name: 'Close Tracker', exact: true}).click();
    await chip.waitFor();

    await page.getByRole('button', {name: 'Dashboard', exact: true}).click();
    await page.locator('#city-dashboard').waitFor();
    assert.match(await page.locator('#city-dashboard').innerText(), /Tracker keeps failed-yield/);
    await page.getByRole('button', {name: 'Close Dashboard', exact: true}).click();

    const map = await page.locator('.city-map-viewport').boundingBox();
    const header = await page.locator('.city-header').boundingBox();
    const dock = await page.locator('.city-controls').boundingBox();
    assert.ok(map && map.height >= (name === 'narrow' ? 170 : 180), `${name} map height ${map?.height}`);
    assert.ok(header && map.y + 0.6 >= header.y + header.height, `${name} header overlaps map`);
    assert.ok(dock && map.y + map.height <= dock.y + 0.6, `${name} dock overlaps map`);
    await page.screenshot({path: `${out}/${name}-pulse.png`});
    assert.deepEqual(errors, [], `${name} page errors ${errors.join('; ')}`);
    results.push({name, map, header, chip: await chip.innerText()});
    await context.close();
    console.log(`${name}: tracker, commute strip, sticky chip ok`);
  }
} finally {
  await fs.writeFile(`${out}/pulse-results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
