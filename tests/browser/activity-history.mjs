// Run with PLAYWRIGHT_MODULE pointing to an installed playwright module.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const [mobile, width, language] of [[true, 390, 'ru'], [true, 320, 'en'], [false, 1000, 'en']]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:16px;background:#101820;color:#edf3f8;font-family:Arial;--primary-text-color:#edf3f8;--secondary-text-color:#a5b7c8;--primary-color:#50b8ef;--ha-card-background:#1a2733}ha-card{display:block;background:var(--ha-card-background)}amazfit-activity-card{display:block;max-width:460px}</style>`);
    assert.equal(await page.evaluate(() => innerWidth), width);
    if (language === 'en') await page.addStyleTag({ content: 'body{background:#f1f5f9;color:#1c2935;--primary-text-color:#1c2935;--secondary-text-color:#536879;--primary-color:#1689b8;--ha-card-background:white}' });
    await page.addScriptTag({ path: 'zepp2hass-cards.js' });
    for (const days of [7, 30]) {
      await page.evaluate(({ count, language }) => {
        document.querySelector('amazfit-activity-card')?.remove();
        const card = document.createElement('amazfit-activity-card');
        card.setConfig({ steps_entity: 'sensor.demo_steps', language });
        card._view = `${count}d`;
        card._historyCache = { [card._historyCacheKey(count)]: { data: Array.from({ length: count }, (_, index) => ({
          key: `2026-08-${String(index + 1).padStart(2, '0')}`, label: String(index + 1),
          steps: index === 1 ? 0 : index === 2 ? null : 6000 + index * 311,
          hasData: index !== 2, target: 10000,
        })), error: null } };
        document.body.append(card);
        card.hass = { language: 'ru', states: { 'sensor.demo_steps': { state: '9000', attributes: {} } } };
      }, { count: days, language });
      const bars = page.locator('[data-activity-day]');
      assert.equal(await bars.count(), days);
      const select = async (index) => mobile ? bars.nth(index).tap() : bars.nth(index).hover();
      await select(0);
      const readout = page.locator('.activity-day-selection');
      assert.match(await readout.innerText(), /6[ ,]000/);
      assert.match(await readout.innerText(), /60%/);
      assert.equal(await bars.nth(0).getAttribute('aria-pressed'), 'true');
      await select(1);
      assert.match(await readout.innerText(), language === 'ru' ? /Шаги: 0/ : /Steps: 0/);
      await select(2);
      assert.match(await readout.innerText(), language === 'ru' ? /Нет данных/ : /No data/);
      assert.doesNotMatch(await readout.innerText(), /(?:Шаги|Steps): 0/);
      await select(days - 1);
      assert.equal(await page.locator('[data-activity-day][aria-pressed="true"]').count(), 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await mkdir('screenshots-local', { recursive: true });
      await page.screenshot({ path: `screenshots-local/activity-${days}d-${width}-${language}.png` });
      if (!mobile) await page.mouse.move(0, 0);
      // Live updates preserve the chosen day, and keyboard users can select it.
      await page.evaluate(() => { const card = document.querySelector('amazfit-activity-card'); card.hass = { ...card._hass }; });
      assert.equal(await bars.nth(days - 1).getAttribute('aria-pressed'), 'true');
      await bars.nth(0).focus();
      await page.keyboard.press('Enter');
      assert.match(await readout.innerText(), /6[ ,]000/);
      assert.equal(await bars.nth(0).evaluate(el => el === document.activeElement), true);
    }
    await page.clock.setFixedTime(new Date('2026-09-05T15:30:00Z'));
    await page.evaluate((language) => {
      document.querySelector('amazfit-activity-card')?.remove();
      const card = document.createElement('amazfit-activity-card');
      card.setConfig({ steps_entity: 'sensor.demo_steps', language });
      document.body.append(card);
      card.hass = {
        language, config: { time_zone: 'Europe/Moscow' },
        states: { 'sensor.demo_steps': {
          state: '4259', last_changed: '2026-09-05T15:00:00Z', last_updated: '2026-09-05T15:20:00Z', attributes: { target: 15000 },
        } },
        callWS: async (msg) => {
          if (msg.type !== 'history/history_during_period') return {};
          const rows = msg.start_time === '2026-09-04T21:00:00.000Z' ? [
            { s: '0', lu: Date.parse('2026-09-04T21:05:00Z') / 1000 },
            { s: '100', lu: Date.parse('2026-09-04T21:30:00Z') / 1000 },
            { s: '4259', lu: Date.parse('2026-09-05T15:00:00Z') / 1000 },
          ] : [];
          if (msg.include_start_time_state !== false) rows.unshift({ s: '9146', lu: Date.parse(msg.start_time) / 1000 });
          return { 'sensor.demo_steps': rows };
        },
      };
      return card._loadHourlyHistory();
    }, language);
    const hours = page.locator('[data-activity-hour]');
    assert.equal(await hours.count(), 24);
    assert.match(await hours.nth(0).getAttribute('title'), / · 100 /);
    assert.equal(await hours.nth(18).locator('.activity-hour-bar').evaluate(el => el.style.height), '100%');
    if (mobile) await hours.nth(0).tap();
    else await hours.nth(0).click();
    assert.match(await page.locator('.activity-hourly-selection').innerText(), /00:00–01:00\s+100 /);
    await page.screenshot({ path: `screenshots-local/activity-hourly-${width}-${language}.png` });
    // A card left open across midnight must not reuse the previous day's history/live total.
    await page.clock.setFixedTime(new Date('2026-09-05T21:10:00Z'));
    await page.evaluate(async () => {
      const card = document.querySelector('amazfit-activity-card');
      card.hass = { ...card._hass };
      await card._loadHourlyHistory();
    });
    assert.ok((await hours.locator('.activity-hour-bar').evaluateAll(els => els.map(el => el.style.height))).every(height => height === '2%'));
    await page.evaluate(() => {
      const card = document.querySelector('amazfit-activity-card');
      card.hass = { ...card._hass, states: { 'sensor.demo_steps': {
        state: '120', last_changed: '2026-09-05T21:10:00Z', attributes: {},
      } } };
    });
    assert.match(await hours.nth(0).getAttribute('title'), / · 120 /);
    await context.close();
  }
  console.log('Activity browser checks: touch, hover, keyboard, zero/missing data, live refresh, 7/30 days, midnight spike and day rollover PASS');
} finally { await browser.close(); }
