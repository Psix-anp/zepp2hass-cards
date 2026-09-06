import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load() {
  const registry = new Map();
  class HTMLElement { querySelectorAll() { return []; } querySelector() { return null; } dispatchEvent(event) { this.event = event; } }
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : ['2026-09-06T12:00:00Z'])); } static now() { return Date.parse('2026-09-06T12:00:00Z'); } }
  const ctx = vm.createContext({ console, HTMLElement, Intl, Date: Clock, setTimeout, clearTimeout, structuredClone,
    CustomEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    customElements: { get: name => registry.get(name), define: (name, value) => registry.set(name, value) },
    window: { customCards: [] }, navigator: { language: 'en' }, document: {},
  });
  vm.runInContext(fs.readFileSync(new URL('../src/core.js', import.meta.url), 'utf8'), ctx);
  vm.runInContext('function z2hRegisterOptionalFeature(feature) { globalThis.feature = feature; }', ctx);
  const modulePath = new URL('../src/achievements.js', import.meta.url);
  if (fs.existsSync(modulePath)) vm.runInContext(fs.readFileSync(modulePath, 'utf8'), ctx);
  return { ctx, registry, fn: name => vm.runInContext(`typeof ${name} === 'function' ? ${name} : null`, ctx) };
}

const activity = (key, steps, hasData = true) => ({ key, steps, hasData });
const calculate = (env, category, rows, config = {}) => {
  const fn = env.fn('z2hCalculateAchievements');
  assert.equal(typeof fn, 'function', 'achievement calculator must be implemented');
  return fn(category, rows, config);
};
const badge = (items, id) => items.find(item => item.id === id);

test('personal targets unlock dated tiers, while missing days interrupt goal streaks', () => {
  const env = load();
  const rows = [activity('2026-09-01', 4000), activity('2026-09-02', 4000), activity('2026-09-04', 4000)];
  const items = calculate(env, 'activity', rows, { achievement_steps_target: 4000 });
  assert.equal(badge(items, 'activity_goal_days').level, 2);
  assert.equal(badge(items, 'activity_goal_days').earnedDate, '2026-09-04');
  assert.equal(badge(items, 'activity_goal_streak').level, 0);
  assert.equal(badge(items, 'activity_goal_streak').progress, 2);
  assert.equal(badge(items, 'activity_goal_streak').next, 3);
});

test('missing and malformed activity values never prove movement or a comeback', () => {
  const env = load();
  const items = calculate(env, 'activity', [activity('2026-09-01', null), activity('2026-09-02', 10000), activity('2026-09-03', 0, false)]);
  assert.equal(badge(items, 'activity_comeback').level, 0);
  assert.equal(badge(items, 'activity_goal_days').progress, 1);
  const empty = calculate(env, 'activity', []);
  assert.ok(empty.every(item => item.level === 0 && item.earnedDate === null));
});

test('sleep duration rewards use a bounded personal window and require consecutive evidence for regularity', () => {
  const env = load();
  const items = calculate(env, 'sleep', [
    { key: '2026-09-01', sleepTotal: 480, score: 85, bedtime: 1435, wake: 480 },
    { key: '2026-09-02', sleepTotal: 720, score: 90, bedtime: 5, wake: 500 },
    { key: '2026-09-04', sleepTotal: 480, score: 90, bedtime: 10, wake: 485 },
  ]);
  assert.equal(badge(items, 'sleep_window').progress, 2);
  assert.equal(badge(items, 'sleep_streak').progress, 1);
  assert.equal(badge(items, 'sleep_bedtime').progress, 1);
  assert.equal(badge(items, 'sleep_score').progress, 3);
});

test('training achievements count distinct days, not repeated sessions or unknown records', () => {
  const env = load();
  const items = calculate(env, 'training', [
    { key: '2026-09-01', sport: 'Walk', minutes: 20 },
    { key: '2026-09-01', sport: 'Walk', minutes: 20 },
    { key: '2026-09-01', sport: 'Walk', minutes: 240 },
    { key: '2026-09-03', sport: 'Yoga', minutes: 25 },
  ]);
  assert.equal(badge(items, 'training_days').progress, 2);
  assert.equal(badge(items, 'training_variety').progress, 2);
  assert.equal(badge(items, 'training_short').progress, 2);
  assert.equal(badge(items, 'training_rhythm').progress, 1);
});

test('all categories have distinct families, levels, localized descriptions and bounded progress', () => {
  const env = load();
  const ids = [];
  for (const category of ['activity', 'sleep', 'training']) {
    const items = calculate(env, category, []);
    assert.ok(items.length >= 6);
    for (const item of items) {
      ids.push(item.id);
      assert.ok(item.title.en && item.title.ru && item.description.en && item.description.ru);
      assert.equal(item.level, 0);
      assert.equal(item.percent, 0);
      assert.equal(item.tiers.length, 3);
    }
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 27);
});

test('step and distance milestones use recorded totals and new records need a previous observation', () => {
  const env = load();
  const items = calculate(env, 'activity', [
    { key: '2026-09-01', steps: 10000, distanceKm: 12 },
    { key: '2026-09-02', steps: 20000, distanceKm: 15 },
    { key: '2026-09-03', steps: 30000, distanceKm: null },
  ]);
  assert.equal(badge(items, 'activity_total_steps').progress, 60000);
  assert.equal(badge(items, 'activity_distance').progress, 27);
  assert.equal(badge(items, 'activity_records').progress, 2);
  assert.equal(badge(calculate(env, 'activity', [activity('2026-09-01', 9000)]), 'activity_records').progress, 0);
});

test('training weekly goals are personal and duplicate session evidence earns no extra count', () => {
  const env = load();
  const rows = [
    { key: '2026-08-24', sport: 'Yoga', minutes: 20, start: '2026-08-24T10:00:00Z' },
    { key: '2026-08-24', sport: 'Yoga', minutes: 20, start: '2026-08-24T10:00:00Z' },
    { key: '2026-08-26', sport: 'Walk', minutes: 30, start: '2026-08-26T10:00:00Z' },
    { key: '2026-08-31', sport: 'Yoga', minutes: 20, start: '2026-08-31T10:00:00Z' },
    { key: '2026-09-02', sport: 'Walk', minutes: 30, start: '2026-09-02T10:00:00Z' },
  ];
  const items = calculate(env, 'training', rows, { achievement_training_weekly_target: 2 });
  assert.equal(badge(items, 'training_sessions').progress, 4);
  assert.equal(badge(items, 'training_goal_weeks').progress, 2);
  assert.equal(badge(items, 'training_week_streak').progress, 2);
  assert.equal(badge(calculate(env, 'training', rows, { achievement_training_weekly_target: 3 }), 'training_goal_weeks').progress, 0);
});

test('master and category toggles suppress content and all achievement queries', () => {
  const env = load();
  assert.ok(env.ctx.feature, 'optional registration must exist');
  const Card = env.registry.get('amazfit-activity-card');
  const card = new Card();
  let calls = 0;
  card.config = { steps_entity: 'sensor.steps' };
  card._hass = { states: {}, callWS() { calls++; return Promise.resolve({}); } };
  assert.equal(env.ctx.feature.render(card), '');
  card.config = { ...card.config, show_achievements: true, achievements_activity: false };
  assert.equal(env.ctx.feature.render(card), '');
  assert.equal(calls, 0);
  card.config.achievements_activity = true;
  for (const item of calculate(env, 'activity', [])) card.config[`achievement_${item.id}`] = false;
  assert.equal(env.ctx.feature.render(card), '');
  assert.equal(calls, 0, 'an entirely disabled collection must not request history');
});

test('history fetches deduplicate, cache errors and discard completions from a replaced seed', async () => {
  const env = load();
  const ensure = env.fn('z2hEnsureAchievementHistory');
  assert.equal(typeof ensure, 'function');
  const Card = env.registry.get('amazfit-activity-card');
  const card = new Card();
  card.config = { steps_entity: 'sensor.a', show_achievements: true };
  let resolve;
  let calls = 0;
  card._hass = { config: { time_zone: 'UTC' }, states: {}, callWS() { calls++; return new Promise(r => { resolve = r; }); } };
  card.render = () => {};
  const now = new Date();
  const old = ensure(card, now);
  assert.equal(ensure(card, now), old);
  assert.equal(calls, 1);
  card.config.steps_entity = 'sensor.b';
  resolve({ 'sensor.a': [{ start: Date.parse('2026-09-05T00:00:00Z') / 1000, change: 5000 }] });
  await old;
  assert.notEqual(card._z2hAchievementHistory?.status, 'ready');
  card._hass.callWS = async () => { calls++; throw Error('offline'); };
  await ensure(card, now);
  await ensure(card, now);
  assert.equal(calls, 2);
  assert.equal(card._z2hAchievementHistory.status, 'error');
});

test('individual visibility and locked visibility apply to the collection and editor controls use real config events', () => {
  const env = load();
  assert.ok(env.ctx.feature);
  const Card = env.registry.get('amazfit-training-card');
  const card = new Card();
  card.config = { show_achievements: true, achievement_training_days: false, show_locked_achievements: false };
  card._hass = { states: {} };
  const html = env.ctx.feature.render(card);
  assert.doesNotMatch(html, /data-achievement-id="training_days"/);
  assert.doesNotMatch(html, /data-achievement-id="training_variety"/);
  const Editor = env.registry.get('amazfit-training-card-editor');
  const editor = new Editor();
  editor._config = { show_achievements: true };
  const controls = env.ctx.feature.editor(editor);
  assert.match(controls, /data-z2h-toggle="achievement_training_days"/);
  const input = { dataset: { z2hToggle: 'achievement_training_days' }, checked: false, addEventListener(type, listener) { this.change = listener; } };
  editor.render = () => {};
  editor._wireCommonControls({ querySelectorAll: selector => selector === '[data-z2h-toggle]' ? [input] : [] });
  input.change();
  assert.equal(editor.event.type, 'config-changed');
  assert.equal(editor.event.detail.config.achievement_training_days, false);
});
