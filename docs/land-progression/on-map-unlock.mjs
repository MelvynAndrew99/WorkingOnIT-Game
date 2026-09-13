import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createCity, place } from '../../src/game/cityModel.ts';

const { chromium } = await import('/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const out = fileURLToPath(new URL('.', import.meta.url));
const base = process.env.UI_BASE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH ?? '/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

function seedCity() {
  const city = createCity(true);
  place(city, 'home', 3, 2);
  place(city, 'store', 13, 8);
  city.tutorial.hRoad.stage = 9;
  city.tutorial.status = 'active';
  return city;
}

try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 640 : 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'Start your city', exact: true }).waitFor();
    const raw = JSON.stringify({ city: seedCity(), updatedAt: Date.now() + 1000 });
    await page.evaluate(raw => { localStorage.setItem('city-workshop:city:v1', raw); }, raw);
    await page.reload();
    await page.getByRole('button', { name: 'Continue commute', exact: true }).click();
    await page.locator('.city-map-viewport').waitFor();
    await page.waitForTimeout(600);

    assert.equal(await page.getByRole('dialog', { name: 'Room to grow' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Expand north', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Add land · Free', exact: true }).count(), 0);

    const show = page.getByRole('region', { name: 'Current objective' }).getByRole('button', { name: 'Show land', exact: true });
    await show.click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}sign-${width}.png` });
    const box = await page.locator('.city-map-viewport').boundingBox();
    assert.ok(box && box.height > 60);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const live = async () => page.evaluate(async () => {
      const mod = await import(performance.getEntriesByType('resource').map(e => e.name).filter(n => n.includes('/src/state/save.ts')).at(-1) || '/src/state/save.ts');
      return structuredClone(mod.getSave().city);
    });
    await page.waitForFunction(async () => {
      const mod = await import(performance.getEntriesByType('resource').map(e => e.name).filter(n => n.includes('/src/state/save.ts')).at(-1) || '/src/state/save.ts');
      return (mod.getSave().city.land?.owned ?? []).includes(2);
    });
    let city = await live();
    assert.ok(city.land.owned.includes(2));
    assert.equal(city.land.purchased, 1);
    await page.screenshot({ path: `${out}on-map-${width}.png` });

    await show.click();
    await page.waitForTimeout(200);
    const box2 = await page.locator('.city-map-viewport').boundingBox();
    await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
    await page.getByRole('dialog', { name: 'A small update from the mayor' }).waitFor();
    city = await live();
    assert.equal(city.land.purchased, 2);
    assert.equal(city.land.freeUnlocks, 0);
    assert.equal(city.tutorial.status, 'complete');
    await page.screenshot({ path: `${out}mayor-cash-${width}.png` });
    await page.getByRole('button', { name: 'Got it — let’s buy more land', exact: true }).click();
    await page.getByRole('dialog', { name: 'A small update from the mayor' }).waitFor({ state: 'hidden' });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}: no compass menu, two on-map sign unlocks, mayor cash briefing`);
    await context.close();
  }
} finally {
  await browser.close();
}
