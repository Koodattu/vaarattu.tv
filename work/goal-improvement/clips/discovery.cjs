const { chromium } = require('../../../frontend/node_modules/@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  assert.equal((await (await fetch('http://127.0.0.1:33101/health')).json()).fixture, 'vaarattu-browser');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 720 }, timezoneId: 'Europe/Helsinki' });
    const errors = [], surfaces = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => ['http://127.0.0.1:33101', 'http://127.0.0.1:33102'].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
    for (const route of ['/', '/profiles/viewer01/timelines', '/leaderboards', '/profiles/newviewer']) {
      await page.goto(`http://127.0.0.1:33102${route}`);
      await page.waitForLoadState('networkidle');
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      if (width !== 320) {
        await page.screenshot({ path: path.join(__dirname, 'discovery-overflow.png'), fullPage: true });
        console.log(await page.locator('main').evaluate(element => [...element.querySelectorAll('*')].filter(node => node.getBoundingClientRect().right > window.innerWidth).slice(0, 20).map(node => ({ tag: node.tagName, classes: node.className, width: node.getBoundingClientRect().width, text: node.textContent.slice(0, 100) }))));
      }
      assert.equal(width, 320, route);
      const state = { route, width, headings: await page.locator('main h1, main h2').allTextContents() };
      if (route === '/') {
        state.hero = await page.locator('main section').first().evaluate(element => ({ bottom: element.getBoundingClientRect().bottom, frames: [...element.querySelectorAll('iframe')].map(frame => ({ title: frame.title, bottom: frame.getBoundingClientRect().bottom })) }));
        assert.ok(state.hero.frames.every(frame => frame.bottom <= state.hero.bottom), 'Home embeds must stay inside their section');
      }
      surfaces.push(state);
      await page.screenshot({ path: path.join(__dirname, `discovery-${surfaces.length}.png`) });
    }
    await page.goto('http://127.0.0.1:33102/profiles/viewer01/timelines');
    await page.getByRole('link', { name: 'Full Timeline', exact: true }).click();
    await page.getByPlaceholder('Search viewers...').fill('Community Viewer 01');
    await page.getByRole('link', { name: 'Community Viewer 01', exact: true }).click();
    await page.getByRole('heading', { name: 'Community Viewer 01', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    const report = { environment: 'Production standalone Chromium, synthetic API only', surfaces, roundTrip: 'profile presence history → full stream timeline → filtered viewer → profile', errors };
    fs.writeFileSync(path.join(__dirname, 'discovery.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
