const { chromium } = require('../../../frontend/node_modules/@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  assert.deepEqual(await (await fetch('http://127.0.0.1:33101/health')).json(), { success: true, fixture: 'vaarattu-browser' });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, timezoneId: 'Europe/Helsinki', reducedMotion: 'reduce' });
    const errors = [], requests = [], layouts = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => ['http://127.0.0.1:33101', 'http://127.0.0.1:33102'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
    for (let i = 0; i < 7; i++) {
      const start = performance.now();
      const response = await fetch('http://127.0.0.1:33101/api/clips?limit=12');
      const body = await response.text();
      assert.equal(JSON.parse(body).pagination.total, 15);
      requests.push({ milliseconds: performance.now() - start, bytes: Buffer.byteLength(body), rows: JSON.parse(body).data.length });
    }
    await page.goto('http://127.0.0.1:33102/clips');
    await page.getByRole('link', { name: /One last jump/ }).waitFor();
    for (const width of [1366, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.equal(scrollWidth, width);
      layouts.push({ surface: 'archive', width, scrollWidth });
      await page.screenshot({ path: path.join(__dirname, `archive-${width}.png`) });
    }
    await page.getByText('Sort and filters', { exact: true }).click();
    await page.getByLabel('Featured only').check();
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByText('3 clips found', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(__dirname, 'archive-filtered-mobile.png') });
    await page.getByRole('link', { name: /One last jump/ }).click();
    await page.getByRole('link', { name: 'Watch on Twitch' }).waitFor();
    await page.screenshot({ path: path.join(__dirname, 'watch-320.png') });
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.getByRole('button', { name: 'Play clip' }).waitFor();
    await page.screenshot({ path: path.join(__dirname, 'watch-1366.png') });
    await page.getByRole('button', { name: 'Copy clip link' }).focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const focus = await page.getByRole('button', { name: 'Copy clip link' }).evaluate(element => ({ outline: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth }));
    assert.equal(focus.outline, 'solid');
    await page.setViewportSize({ width: 375, height: 900 });
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 375);
    await page.screenshot({ path: path.join(__dirname, 'watch-text-scale.png') });
    // Real API shape with extreme synthetic content and a broken thumbnail.
    const clip = (await (await fetch('http://127.0.0.1:33101/api/clips/BrowserClip01')).json()).data;
    await page.route('**/api/clips/BrowserClip01', route => route.fulfill({ json: { success: true, data: { ...clip, title: 'A'.repeat(200), creatorName: 'Viewer'.repeat(30), thumbnailUrl: 'http://127.0.0.1:33101/missing-image.svg' } } }));
    await page.reload();
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.getByRole('link', { name: 'Watch on Twitch' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 375);
    await page.screenshot({ path: path.join(__dirname, 'watch-extreme-content.png') });
    assert.deepEqual(errors, []);
    const report = { environment: 'Chromium; Next production standalone; PostgreSQL17, 1CPU/384MiB; 15 available synthetic clips', requests, layouts, textScale: '200% at 375px, including 200-character unbroken title and broken image', focus, errors, providerPlayback: 'not exercised; external requests blocked' };
    fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
