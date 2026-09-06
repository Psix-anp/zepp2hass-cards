import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBundle } from './helpers/load-bundle.mjs';

const now = '2026-09-06T12:30:00Z';
function setup(config = {}, callWS = async () => ({})) {
  const { ctx, registry } = loadBundle({ now, sources: ['src/activity-extras.js'] });
  assert.equal(typeof ctx.z2hActivityRenderExtras, 'function', 'optional activity renderer is available');
  const card = new (registry.get('amazfit-activity-card'))();
  card.setConfig({ steps_entity: 'sensor.steps', language: 'en', ...config });
  card._hass = { config: { time_zone: 'Europe/Moscow' }, states: {
    'sensor.steps': { state: '100', attributes: { target: 10000 }, last_updated: now },
  }, callWS };
  return { ctx, card, registry };
}

test('extras disabled by default cause no history calls or optional content', () => {
  let calls = 0;
  const { ctx, card } = setup({}, () => { calls++; return Promise.resolve({}); });
  assert.equal(ctx.z2hActivityRenderExtras(card), '');
  assert.equal(calls, 0);
});

test('current month uses HA local date, real leap days and Monday padding', () => {
  const { ctx } = setup();
  const month = ctx.z2hActivityMonthSlots(new Date('2024-02-29T23:30:00Z'), 'Asia/Tokyo');
  assert.equal(month.days.length, 31);
  assert.equal(month.days[0].key, '2024-03-01');
  assert.equal(month.days[0].start.toISOString(), '2024-02-29T15:00:00.000Z');
  assert.equal(month.offset, 4);
  assert.equal(ctx.z2hActivityMonthSlots(new Date('2024-02-15T12:00:00Z'), 'UTC').days.length, 29);
});

test('comparison uses the same local cutoff on both sides of DST', () => {
  const { ctx } = setup();
  const windows = ctx.z2hActivityComparisonWindows(new Date('2026-03-29T10:30:00Z'), 'Europe/Berlin');
  assert.equal(windows.today.start.toISOString(), '2026-03-28T23:00:00.000Z');
  assert.equal(windows.today.end.toISOString(), '2026-03-29T10:30:00.000Z');
  assert.equal(windows.yesterday.end.toISOString(), '2026-03-28T11:30:00.000Z');
});

test('day counter preserves missing hours and recorded zero, rejects carried and invalid states', () => {
  const { ctx } = setup();
  const start = new Date('2026-09-04T21:00:00Z');
  const end = new Date('2026-09-05T21:00:00Z');
  const data = ctx.z2hActivityCounterSummary([
    { state: '9000', last_updated: '2026-09-04T20:59:59Z' },
    { state: '0', last_updated: '2026-09-04T21:00:00Z' },
    { state: '120', last_updated: '2026-09-04T22:00:00Z' },
    { state: 'unavailable', last_updated: '2026-09-04T23:00:00Z' },
    { state: null, last_updated: '2026-09-05T00:00:00Z' },
  ], start, end, 'Europe/Moscow');
  assert.equal(data.total, 120);
  assert.deepEqual(Array.from(data.hours.slice(0, 4)), [0, 120, null, null]);
  assert.equal(data.complete, false);
  assert.equal(ctx.z2hActivityCounterSummary([], start, end, 'Europe/Moscow').total, null);
});

test('weekly summary excludes today and suppresses comparison for missing days', () => {
  const { ctx } = setup();
  const rows = [
    { key: '2026-08-30', steps: 0 }, { key: '2026-08-31', steps: 100 },
    { key: '2026-09-01', steps: 200 }, { key: '2026-09-02', steps: 300 },
    { key: '2026-09-03', steps: 400 }, { key: '2026-09-04', steps: 500 },
    { key: '2026-09-05', steps: 600 }, { key: '2026-09-06', steps: 999999 },
  ];
  const result = ctx.z2hActivityWeeklySummary(rows, new Date(now), 'Europe/Moscow', 300);
  assert.equal(result.current.total, 2100);
  assert.equal(result.current.count, 7);
  assert.equal(result.current.goalDays, 4);
  assert.equal(result.current.best.key, '2026-09-05');
  assert.equal(result.previous.total, null);
  assert.equal(result.delta, null);
  assert.equal(result.current.complete, true);
});

test('calendar alone is selectable and day details alone offer an independent date picker', () => {
  const calendar = setup({ show_calendar: true });
  const html = calendar.ctx.z2hActivityRenderExtras(calendar.card);
  assert.match(html, /data-z2h-extra-day="2026-09-01"/);
  assert.match(html, /data-z2h-extra-day="2026-09-30"[^>]*disabled/);
  const details = setup({ show_day_details: true, show_7d: false, show_30d: false });
  assert.match(details.ctx.z2hActivityRenderExtras(details.card), /data-z2h-extra-date/);
});

test('freshness describes HA state update and compact mode alone does not fetch history', () => {
  let calls = 0;
  const { ctx, card } = setup({ show_freshness: true, compact_mode: true }, async () => { calls++; return {}; });
  assert.match(ctx.z2hActivityRenderExtras(card), /Home Assistant/);
  assert.match(ctx.z2hActivityRenderExtras(card), /<details/);
  assert.equal(calls, 0);
});

test('comparison requests recorder intervals without synthetic start states and deduplicates renders', async () => {
  const calls = [];
  const { ctx, card } = setup({ show_comparison: true }, async request => { calls.push(request); return {}; });
  ctx.z2hActivityRenderExtras(card);
  ctx.z2hActivityRenderExtras(card);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls.length, 2);
  assert.ok(calls.every(row => row.type === 'history/history_during_period' && row.include_start_time_state === false));
  assert.equal(calls[0].end_time, '2026-09-06T12:30:00.000Z');
  assert.equal(calls[1].end_time, '2026-09-05T12:30:00.000Z');
  assert.match(ctx.z2hActivityRenderExtras(card), /No data/);
  assert.equal(calls.length, 2);
});

test('all six graphical editor toggles default off and support Russian labels', () => {
  const { ctx, registry } = setup();
  const editor = new (registry.get('amazfit-activity-card-editor'))();
  editor._config = { language: 'ru' };
  const html = ctx.z2hActivityExtrasEditor(editor);
  for (const key of ['show_day_details', 'show_comparison', 'show_calendar', 'show_weekly_summary', 'show_freshness', 'compact_mode']) {
    assert.match(html, new RegExp(`data-z2h-toggle="${key}"`));
  }
  assert.doesNotMatch(html, / checked/);
  assert.match(html, /Календарь/);
});

test('a disabled details flag prevents recorder requests even after calendar selection', () => {
  const calls = [];
  const { ctx, card } = setup({ show_calendar: true, show_day_details: false }, async request => { calls.push(request); return {}; });
  ctx.z2hActivitySelectExtraDay(card, '2026-09-05');
  const html = ctx.z2hActivityRenderExtras(card);
  assert.ok(calls.every(request => request.type !== 'history/history_during_period'));
  assert.doesNotMatch(html, /data-z2h-extra-date/);
});

test('comparison drops the previous local day snapshot immediately at midnight', () => {
  const { ctx, card } = setup({ show_comparison: true });
  const state = ctx.z2hActivityExtrasState(card);
  state.comparisonNow = new Date('2026-09-05T20:59:00Z');
  ctx.z2hActivityComparisonHtml(card, state, new Date('2026-09-05T21:01:00Z'));
  assert.equal(state.comparisonNow.toISOString(), '2026-09-05T21:01:00.000Z');
});
