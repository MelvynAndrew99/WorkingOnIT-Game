// Regression: verify a fresh scene BEFORE pan/zoom/resize can replace cached placeholders.
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
const { chromium } = await import(process.env.CITY_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CITY_CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
    for (const viewport of [{ width:390, height:844 }, { width:1440, height:900 }, { width:1117, height:1800 }]) {
        // Each context is isolated: module texture caches and saved cities cannot hide the bug.
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(process.env.CITY_URL || 'http://localhost:5174');
        await page.getByRole('button', { name:'Start your city', exact:true }).click();
        await page.locator('canvas').waitFor();
        await page.waitForTimeout(500);
        async function checkTerrain(label) {
            const { width, height, data } = PNG.sync.read(await page.screenshot());
            let white=0, green=0, count=0;
            // Center patch is terrain at these viewports, away from text, roads and UI.
            for(let y=Math.floor(height*.4); y<height*.6; y++) for(let x=Math.floor(width*.46); x<width*.54; x++) {
                const i=(y*width+x)*4, r=data[i], g=data[i+1], b=data[i+2];
                if(r>245 && g>245 && b>245)white++;
                if(g>r*1.15 && g>b*1.05)green++;
                count++;
            }
            assert.ok(white/count<.05, `${label}: ${Math.round(white/count*100)}% white placeholders`);
            assert.ok(green/count>.5, `${label}: expected textured green terrain`);
        }
        await checkTerrain(`first load ${viewport.width}`);
        if (viewport.width === 390) await page.screenshot({path:'/tmp/cold-render-fixed.png'});
        await page.getByRole('button',{name:'Menu',exact:true}).click();
        await page.getByRole('button',{name:'Continue commute',exact:true}).click();
        await page.waitForTimeout(300);
        await checkTerrain(`menu return ${viewport.width}`);
        assert.deepEqual(errors,[]);
        await context.close();
    }
    console.log('PASS: cold-load terrain and menu return render correctly at phone, desktop, and tall viewport sizes.');
} finally { await browser.close(); }
