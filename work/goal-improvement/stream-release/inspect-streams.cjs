// Reproducible synthetic baseline/final screenshots and bounded archive workload.
const { chromium } = require('../../../frontend/node_modules/@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  assert.deepEqual(await (await fetch('http://127.0.0.1:33101/health')).json(), { success: true, fixture: 'vaarattu-browser' });
  const phase = process.env.EVIDENCE_PHASE || 'baseline';
  assert.ok(['baseline', 'final'].includes(phase));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, timezoneId: 'Europe/Helsinki', reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => ['http://127.0.0.1:33101', 'http://127.0.0.1:33102'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  const report = { phase, environment: `Chromium; Next ${phase === 'final' ? 'production standalone' : 'dev'}; PostgreSQL17, 1CPU/384MiB; 27 synthetic streams, 1500 messages`, errors, archiveRequests: [] };
  for (let i = 0; i < 7; i++) {
    const start = performance.now();
    const response = await fetch('http://127.0.0.1:33101/api/streams?limit=12');
    const body = await response.text();
    const data = JSON.parse(body);
    assert.equal(data.pagination.total, 27, 'Use a fresh browser fixture database');
    report.archiveRequests.push({ milliseconds: performance.now() - start, bytes: Buffer.byteLength(body), rows: data.data.length });
  }
  await page.goto('http://127.0.0.1:33102/vods');
  await page.getByRole('link', { name: /Back to the caves/ }).waitFor();
  report.archiveSearchControls = await page.getByRole('searchbox').count();
  await page.screenshot({ path: path.join(__dirname, `${phase}-archive.png`) });
  await page.getByRole('link', { name: /Back to the caves/ }).click();
  await page.getByRole('heading', { name: 'Activity over time', exact: true }).waitFor();
  await page.getByRole('slider').waitFor();
  report.chapterLinks = await page.getByRole('link', { name: /30:00/ }).count();
  await page.screenshot({ path: path.join(__dirname, `${phase}-overview.png`) });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('heading', { name: 'Activity over time', exact: true }).evaluate(element => element.scrollIntoView({ block: 'start' }));
  report.chartWidth = await page.locator('main svg[role="img"]').first().evaluate(element => element.getBoundingClientRect().width);
  report.pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: path.join(__dirname, `${phase}-mobile.png`) });
  if (phase === 'final') {
    report.responsive = [];
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole('combobox', { name: 'Activity metric' }).selectOption('viewers');
      await page.getByRole('button', { name: 'Go to peak' }).click();
      await page.getByRole('heading', { name: 'Activity over time', exact: true }).evaluate(element => element.scrollIntoView({ block: 'start' }));
      assert.match(await page.getByLabel('Selected activity interval').textContent(), /72/);
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.equal(pageWidth, width);
      report.responsive.push({ width, pageWidth, selected: '72 people at 40:00' });
      await page.screenshot({ path: path.join(__dirname, `activity-${width}.png`) });
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    await page.getByRole('heading', { name: 'Activity over time', exact: true }).evaluate(element => element.scrollIntoView({ block: 'start' }));
    report.textScale200 = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.equal(report.textScale200, 375);
    await page.screenshot({ path: path.join(__dirname, 'activity-text-scale.png') });
    await page.evaluate(() => document.documentElement.style.fontSize = '');
    await page.goto('http://127.0.0.1:33102/vods');
    await page.getByRole('link', { name: /Back to the caves/ }).waitFor();
    await page.screenshot({ path: path.join(__dirname, 'final-archive-mobile.png') });
    await page.getByRole('link', { name: /Back to the caves/ }).click();
    await page.getByRole('link', { name: 'Watch VOD', exact: true }).click();
    await page.getByRole('button', { name: 'Retry player' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 375);
    await page.screenshot({ path: path.join(__dirname, 'final-watch-mobile.png') });
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.screenshot({ path: path.join(__dirname, 'final-watch-desktop.png') });
  }
  fs.writeFileSync(path.join(__dirname, `${phase}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
