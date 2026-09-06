// Browser acceptance uses synthetic Home Assistant records only.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, language] of [[390, 'ru'], [320, 'en'], [1000, 'en']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-06T12:30:00Z'));
    await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:12px;background:#101820;font-family:Arial;color:#edf3f8;--primary-text-color:#edf3f8;--secondary-text-color:#a5b7c8;--primary-color:#50b8ef;--ha-card-background:#1a2733;--card-background-color:#1a2733;--divider-color:#40515f}ha-card{display:block;background:var(--ha-card-background)}body>*>*:not(style){box-sizing:border-box}body>amazfit-activity-card,body>amazfit-sleep-card,body>amazfit-training-card{display:block;max-width:460px;margin-bottom:16px}</style>`);
    if (language === 'en') await page.addStyleTag({ content: 'body{background:#f1f5f9;color:#1c2935;--primary-text-color:#1c2935;--secondary-text-color:#536879;--primary-color:#1689b8;--ha-card-background:white;--card-background-color:white;--divider-color:#dce3e9}' });
    await page.addScriptTag({ path: 'zepp2hass-cards.js' });
    await page.evaluate(language => {
      window.requests = [];
      window.emptyHistory = false;
      const now = new Date('2026-09-06T12:30:00Z');
      const sleepRow = day => {
        const stop = new Date(`${day}T07:00:00Z`);
        const start = new Date(+stop - 8 * 3600000);
        return { state: '87', last_updated: stop.toISOString(), attributes: { stages: [
          { phase: 'DEEP_STAGE', start: start.toISOString(), stop: new Date(+start + 3600000).toISOString(), duration_min: 60 },
          { phase: 'LIGHT_STAGE', start: new Date(+start + 3600000).toISOString(), stop: new Date(+stop - 2 * 3600000).toISOString(), duration_min: 300 },
          { phase: 'REM_STAGE', start: new Date(+stop - 2 * 3600000).toISOString(), stop: stop.toISOString(), duration_min: 120 },
        ] } };
      };
      window.demoHass = {
        language, config: { time_zone: 'UTC' }, states: {
          'sensor.demo_steps': { state: '6500', last_changed: '2026-09-06T12:25:00Z', last_updated: '2026-09-06T12:25:00Z', attributes: { target: 6000 } },
          'sensor.demo_distance': { state: '4.2', last_changed: '2026-09-06T12:25:00Z', attributes: { unit_of_measurement: 'km' } },
          'sensor.demo_calories': { state: '250', last_changed: '2026-09-06T12:25:00Z', attributes: { unit_of_measurement: 'kcal' } },
          'sensor.demo_sleep_score': sleepRow('2026-09-06'),
          'sensor.demo_last_workout': { state: 'Walking', attributes: { start_time: '2026-09-06T09:00:00Z', duration_minutes: 30 } },
          'sensor.demo_workout_count': { state: '5', attributes: { recent_workouts: [
            '2026-09-06 09:00 - Walking (30 min)', '2026-09-05 09:00 - Yoga (20 min)',
            '2026-09-03 09:00 - Walking (30 min)', '2026-09-01 09:00 - Cycling (30 min)', '2026-08-30 09:00 - Yoga (20 min)',
          ] } },
        },
        callWS: async request => {
          window.requests.push(request);
          if (window.requests.length > 150) throw new Error('Unexpected history request loop');
          if (request.type === 'config/entity_registry/list') return [];
          if (window.emptyHistory) return {};
          const start = new Date(request.start_time);
          const end = new Date(request.end_time);
          if (request.type === 'recorder/statistics_during_period') {
            return Object.fromEntries(request.statistic_ids.map(entity => {
              const rows = [];
              for (let ms = Math.max(+start, +now - 40 * 86400000); ms < +end; ms += 86400000) {
                const date = new Date(ms); date.setUTCHours(0, 0, 0, 0);
                const day = date.toISOString().slice(0, 10);
                if (day === '2026-09-04') continue;
                rows.push({ start: +date / 1000, end: (+date + 86400000) / 1000, change: day === '2026-09-03' ? 0 : entity.includes('distance') ? 5.5 : 6200 });
              }
              return [entity, rows];
            }));
          }
          if (request.type === 'history/history_during_period') {
            return Object.fromEntries(request.entity_ids.map(entity => {
              if (entity.includes('sleep_score')) return [entity, Array.from({ length: 12 }, (_, i) => sleepRow(new Date(+now - i * 86400000).toISOString().slice(0, 10)))];
              const day = start.toISOString().slice(0, 10);
              if (day === '2026-09-04') return [entity, []];
              const total = day === '2026-09-03' ? 0 : entity.includes('distance') ? 5.5 : entity.includes('calories') ? 250 : day === '2026-09-06' ? 6500 : 5500;
              return [entity, [
                { state: '0', last_updated: new Date(+start + 60000).toISOString() },
                { state: String(total / 2), last_updated: new Date(+start + 6 * 3600000).toISOString() },
                { state: String(total), last_updated: new Date(+end - 60000).toISOString() },
              ].filter(row => Date.parse(row.last_updated) < +end)];
            }));
          }
          return {};
        },
      };
      window.makeCard = (type, config) => {
        const card = document.createElement(type);
        card.setConfig({ language, ...config });
        document.body.append(card);
        card.hass = window.demoHass;
        return card;
      };
      window.activityConfig = { steps_entity: 'sensor.demo_steps', distance_entity: 'sensor.demo_distance', calories_entity: 'sensor.demo_calories', achievement_steps_target: 6000 };
      window.activity = window.makeCard('amazfit-activity-card', window.activityConfig);
    }, language);
    await page.waitForFunction(() => window.activity._hourlyHistoryCache);
    assert.equal(await page.locator('[data-z2h-optional]').count(), 0);
    await page.evaluate(() => {
      activity.setConfig({ ...activityConfig, language: demoHass.language, show_achievements: true, show_calendar: true, show_day_details: true, show_comparison: true, show_weekly_summary: true, show_freshness: true }); activity.render();
    });
    await page.waitForFunction(() => activity._z2hAchievementHistory?.status === 'ready');
    await page.waitForFunction(() => [...activity._z2hActivityExtras.cache.values()].every(entry => !entry.pending));
    assert.equal(await page.locator('[data-z2h-optional]').count(), 2);
    assert.ok(await page.locator('.z2h-badge.earned').count() > 0);
    assert.equal(await page.locator('[data-z2h-extra-day]').count(), 30);
    const day = page.locator('[data-z2h-extra-day="2026-09-03"]');
    if (width < 500) await day.tap(); else await day.click();
    await page.waitForFunction(() => [...activity._z2hActivityExtras.cache.values()].every(entry => !entry.pending));
    assert.match(await page.locator('[data-z2h-calendar-selection]').innerText(), /0/);
    assert.equal(await page.locator('[data-z2h-extra-date]').inputValue(), '2026-09-03');
    const detailHour = page.locator('[data-z2h-detail-hour="0"]');
    if (width < 500) await detailHour.tap(); else await detailHour.click();
    assert.match(await page.locator('[data-z2h-detail-hour-readout]').innerText(), /00:00.*0/);
    await page.locator('[data-z2h-extra-day="2026-09-04"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => [...activity._z2hActivityExtras.cache.values()].every(entry => !entry.pending));
    assert.match(await page.locator('[data-z2h-calendar-selection]').innerText(), language === 'ru' ? /Нет данных/ : /No data/);
    assert.equal(await page.locator('[data-z2h-extra-day="2026-09-04"]').evaluate(el => el === document.activeElement), true);
    await page.locator('[data-achievement-collection] summary').click();
    assert.equal(await page.locator('[data-achievement-collection]').getAttribute('open'), '');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mkdir('screenshots-local', { recursive: true });
    await page.screenshot({ path: `screenshots-local/optional-activity-${width}-${language}.png`, fullPage: true });
    // Config flags remain independent and turning everything off removes extra fetches.
    await page.evaluate(() => { activity.setConfig({ ...activityConfig, language: demoHass.language, show_day_details: true }); activity.render(); });
    assert.equal(await page.locator('[data-z2h-extra-date]').count(), 1);
    assert.equal(await page.locator('[data-z2h-extra-day]').count(), 0);
    await page.evaluate(() => { activity.setConfig({ ...activityConfig, language: demoHass.language }); activity.render(); window.countBefore = requests.length; activity.render(); });
    assert.equal(await page.locator('[data-z2h-optional]').count(), 0);
    assert.equal(await page.evaluate(() => requests.length), await page.evaluate(() => countBefore));
    await page.evaluate(() => {
      activity.remove();
      window.sleepCard = makeCard('amazfit-sleep-card', { entity: 'sensor.demo_sleep_score', show_achievements: true });
      window.trainingCard = makeCard('amazfit-training-card', { last_workout_entity: 'sensor.demo_last_workout', workout_count_entity: 'sensor.demo_workout_count', show_achievements: true });
    });
    await page.waitForFunction(() => sleepCard._z2hAchievementHistory?.status === 'ready');
    assert.ok(await page.locator('amazfit-sleep-card .z2h-badge.earned').count() > 0);
    assert.ok(await page.locator('amazfit-training-card .z2h-badge.earned').count() > 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `screenshots-local/optional-sleep-training-${width}-${language}.png`, fullPage: true });
    for (const type of ['activity', 'sleep', 'training']) {
      await page.evaluate(type => {
        document.querySelector('[data-test-editor]')?.remove();
        const editor = document.createElement(`amazfit-${type}-card-editor`);
        editor.dataset.testEditor = 'true';
        editor.setConfig({ language: demoHass.language, steps_entity: 'sensor.demo_steps', entity: 'sensor.demo_sleep_score', last_workout_entity: 'sensor.demo_last_workout' });
        editor.hass = demoHass;
        window.editorChanges = [];
        editor.addEventListener('config-changed', event => editorChanges.push(event.detail.config));
        document.body.append(editor);
      }, type);
      const toggle = page.locator('[data-test-editor] [data-z2h-toggle="show_achievements"]');
      assert.equal(await toggle.isChecked(), false);
      await toggle.check();
      assert.equal(await page.evaluate(() => editorChanges.at(-1).show_achievements), true);
      const individual = page.locator('[data-test-editor] details').filter({ has: page.locator('[data-z2h-toggle^="achievement_"]') });
      await individual.locator('summary').click();
      await individual.locator('input').first().uncheck();
      assert.ok(await page.evaluate(() => Object.entries(editorChanges.at(-1)).some(([key, value]) => key.startsWith('achievement_') && value === false)));
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Optional features browser PASS: mobile/desktop, RU/EN, independent toggles, missing/zero, keyboard, achievements in all three cards, editor config events.');
} finally { await browser.close(); }
