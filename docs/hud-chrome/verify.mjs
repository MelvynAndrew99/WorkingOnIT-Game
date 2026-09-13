import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.HUD_EVIDENCE_DIR ?? 'docs/hud-chrome/evidence';
await fs.mkdir(out, {recursive: true});
const base = process.env.UI_BASE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
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

function missing(page, name) {
  return page.getByRole('button', {name, exact: true}).count();
}

for (const [name, width, height] of [['desktop', 1440, 900], ['narrow', 390, 844]]) {
  const context = await browser.newContext({viewport: {width, height}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await page.goto(base);
  await page.getByRole('button', {name: 'Start your city', exact: true}).click();
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(800);
  await bind(page);

  assert.equal(await missing(page, 'Zoom in'), 0, `${name} zoom in`);
  assert.equal(await missing(page, 'Zoom out'), 0, `${name} zoom out`);
  assert.equal(await missing(page, 'Pan map'), 0, `${name} pan map`);
  assert.equal(await missing(page, 'Pan'), 0, `${name} pan`);
  assert.equal(await missing(page, 'Add land at a map edge'), 0, `${name} add land rail`);
  assert.equal(await missing(page, 'Grow'), 0, `${name} grow`);

  await page.getByRole('button', {name: 'Inspect', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Town', exact: true}).waitFor();
  await page.getByRole('button', {name: /^Tracker/}).waitFor();
  await page.getByRole('button', {name: 'Heatmap', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Dashboard', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Debug', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Pause the city', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Menu', exact: true}).waitFor();

  const stats = await page.locator('.city-stats-bar dt').allTextContents();
  assert.deepEqual(stats, ['Funds', 'Visitors', 'On Road', 'Fatalities', 'Time', 'Weather']);
  const pulse = await page.locator('.city-pulse-bar dt').allTextContents();
  assert.deepEqual(pulse, ['Trips', 'Avg wait', 'Shop', 'Work', 'Park', 'Trips', 'Bus rides']);

  await page.getByRole('button', {name: /^Tracker/}).click();
  await page.locator('#city-tracker').waitFor();
  await page.getByRole('button', {name: 'Close Tracker', exact: true}).click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-controls') === 'city-tracker');

  const map = await page.locator('.city-map-viewport').boundingBox();
  const header = await page.locator('.city-header').boundingBox();
  const dock = await page.locator('.city-controls').boundingBox();
  await page.screenshot({path: `${out}/${name}-sandbox.png`});
  assert.ok(map && map.height >= 180, `${name} map height ${map?.height}`);
  assert.ok(header && map.y + 0.6 >= header.y + header.height, `${name} header overlaps map`);
  assert.ok(dock && map.y + map.height <= dock.y + 0.6, `${name} dock overlaps map`);
  const share = map.height / height;
  assert.ok(share >= (name === 'narrow' ? 0.24 : 0.40), `${name} map share ${share}`);

  for (const sel of ['.hud-icon-btn', '.map-rail button', '.build-category', '.build-tool']) {
    for (const button of await page.locator(sel).all()) {
      const box = await button.boundingBox();
      if (!box) continue;
      assert.ok(box.height >= 44 - 0.6 && box.width >= 44 - 0.6, `${name} ${sel} ${box.width}x${box.height}`);
    }
  }

  await page.getByRole('button', {name: 'Places', exact: true}).click();
  await page.locator('.build-tool[data-tool=home]').click();
  assert.equal(await page.evaluate(() => window.state.store.get().tool), 'home');
  await page.getByRole('button', {name: 'Inspect', exact: true}).click();
  assert.equal(await page.evaluate(() => window.state.store.get().tool), null);

  await page.getByRole('button', {name: 'Dashboard', exact: true}).click();
  await page.locator('#city-dashboard').waitFor();
  await page.getByRole('button', {name: 'Close Dashboard', exact: true}).click();

  await page.getByRole('button', {name: 'Pause the city', exact: true}).click();
  await page.getByRole('heading', {name: 'Paused', exact: true}).waitFor();
  await page.keyboard.press('Escape');

  await page.getByRole('button', {name: 'Menu', exact: true}).click();
  await page.getByRole('button', {name: 'Challenges', exact: true}).click();
  await page.locator('.journey-screen').waitFor();
  const play = page.getByRole('button', {name: /Work this site|Continue|Play level/}).first();
  await page.getByRole('button', {name: /Work this site|Continue/}).first().click();
  await page.getByRole('button', {name: 'Play level', exact: true}).or(page.getByRole('button', {name: 'Continue level', exact: true})).click();
  await page.locator('.challenge-ui canvas, .challenge-ui .city-map-viewport').first().waitFor();
  await page.waitForTimeout(500);
  assert.equal(await missing(page, 'Zoom in'), 0, `${name} challenge zoom`);
  assert.equal(await missing(page, 'Pan'), 0, `${name} challenge pan`);
  await page.getByRole('button', {name: 'Inspect', exact: true}).waitFor();
  await page.screenshot({path: `${out}/${name}-challenge.png`});

  assert.deepEqual(errors, [], `${name} page errors ${errors.join('; ')}`);
  console.log(`${name}: chrome, no pan/zoom/add-land, map ${Math.round(map.width)}x${Math.round(map.height)}, targets ok`);
  await context.close();
}

await browser.close();
