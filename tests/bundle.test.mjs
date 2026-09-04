import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sourcePath = new URL('../zepp2hass-cards.js', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');

function loadBundle() {
  const registry = new Map();
  class HTMLElement {
    constructor() { this.innerHTML = ''; this.dataset = {}; }
    querySelectorAll() { return []; }
    querySelector() { return null; }
    addEventListener() {}
    dispatchEvent() { return true; }
  }
  const ctx = {
    console,
    HTMLElement,
    CustomEvent: class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } },
    customElements: {
      define(name, klass) { registry.set(name, klass); },
      get(name) { return registry.get(name); },
    },
    window: { customCards: [] },
    document: { createElement(name) { const K = registry.get(name); return K ? new K() : { tagName: name }; } },
    navigator: { language: 'ru-RU' },
    Intl,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    Map,
    Set,
    RegExp,
    Promise,
    structuredClone,
    setTimeout,
    clearTimeout,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(`${source}\n;globalThis.__z2hExports = {\n    AmazfitActivityCard, AmazfitSleepCard,\n    AmazfitTrainingCard: typeof AmazfitTrainingCard === 'function' ? AmazfitTrainingCard : null,\n    z2hBuildHourlyStepProfile: typeof z2hBuildHourlyStepProfile === 'function' ? z2hBuildHourlyStepProfile : null,\n    z2hDiscoverSameDevice, Z2H_TRAINING_METRIC_SPECS\n  };`, ctx, { filename: 'zepp2hass-cards.js' });
  ctx.__z2hExports.AmazfitOverviewCard = vm.runInContext('typeof AmazfitOverviewCard === "function" ? AmazfitOverviewCard : null', ctx);
  return { ctx, registry, exports: ctx.__z2hExports };
}

test('hourly step profile buckets positive step deltas by local hour', () => {
  const { exports } = loadBundle();
  assert.equal(typeof exports.z2hBuildHourlyStepProfile, 'function');
  const rows = [
    { state: '100', last_updated: '2026-09-04T00:10:00Z' },
    { state: '350', last_updated: '2026-09-04T01:00:00Z' },
    { state: '500', last_updated: '2026-09-04T01:30:00Z' },
    { state: '900', last_updated: '2026-09-04T03:00:00Z' },
  ];
  const result = exports.z2hBuildHourlyStepProfile(rows, 'UTC');
  assert.equal(result.hours.length, 24);
  assert.deepEqual(Array.from(result.hours.slice(0, 4)), [100, 400, 0, 400]);
  assert.equal(result.total, 900);
  assert.equal(result.bestHour, 1);
  assert.equal(result.bestValue, 400);
});

test('sleep period stats expose average bedtime/wake and latest schedule deltas', () => {
  const { exports } = loadBundle();
  const card = new exports.AmazfitSleepCard();
  card.config = { target_sleep_minutes: 480 };
  card._localMinuteOfDay = (date) => date.getUTCHours() * 60 + date.getUTCMinutes();
  const mkNight = (startH, startM, stopH, stopM, total=480, score=80) => ({
    start: new Date(Date.UTC(2026, 8, 1, startH, startM)),
    stop: new Date(Date.UTC(2026, 8, 2, stopH, stopM)),
    sleepTotal: total,
    score,
    totals: { DEEP_STAGE: 80, REM_STAGE: 90 },
  });
  const stats = card._periodStats([
    mkNight(23, 0, 7, 0),
    mkNight(23, 20, 7, 10),
    mkNight(0, 0, 7, 30),
  ]);
  assert.equal(stats.avgBedtimeMin, 23 * 60 + 27);
  assert.equal(stats.avgWakeMin, 7 * 60 + 13);
  assert.equal(stats.latestBedtimeDeltaMin, 50);
  assert.equal(stats.latestWakeDeltaMin, 25);
});

test('bundle registers a training card and graphical editor', () => {
  const { registry, ctx } = loadBundle();
  assert.ok(registry.get('amazfit-training-card'));
  assert.ok(registry.get('amazfit-training-card-editor'));
  assert.ok(ctx.window.customCards.some((card) => card.type === 'amazfit-training-card'));
});

test('overview card renders today metrics from Zepp2Hass entities', () => {
  const { exports, registry } = loadBundle();
  assert.ok(registry.get('amazfit-overview-card'));
  const card = new exports.AmazfitOverviewCard();
  card.setConfig({
    language: 'ru',
    steps_entity: 'sensor.watch_steps',
    sleep_score_entity: 'sensor.watch_sleep_score',
    heart_rate_entity: 'sensor.watch_heart_rate',
    pai_entity: 'sensor.watch_pai',
    training_load_entity: 'sensor.watch_training_load',
  });
  card.hass = {
    language: 'ru',
    states: {
      'sensor.watch_steps': { state: '12430', attributes: {} },
      'sensor.watch_sleep_score': { state: '84', attributes: {} },
      'sensor.watch_heart_rate': { state: '68', attributes: { unit_of_measurement: 'bpm' } },
      'sensor.watch_pai': { state: '7', attributes: {} },
      'sensor.watch_training_load': { state: '31', attributes: { full_recovery_time_hours: 14 } },
    },
  };

  assert.match(card.innerHTML, /Сегодня/);
  assert.match(card.innerHTML, /12 430/);
  assert.match(card.innerHTML, /Сон/);
  assert.match(card.innerHTML, /Восстановление/);
  assert.match(card.innerHTML, /Восстановление[\s\S]*14[\s\S]*ч/);
  assert.match(card.innerHTML, /data-overview-entity="sensor.watch_steps"/);
  assert.match(card.innerHTML, /data-overview-entity="sensor.watch_sleep_score"/);

  const listeners = {};
  const stepsTile = { dataset: { overviewEntity: 'sensor.watch_steps' }, addEventListener(type, handler) { listeners[type] = handler; } };
  let moreInfo = null;
  card.querySelectorAll = (selector) => selector === '[data-overview-entity]' ? [stepsTile] : [];
  card.dispatchEvent = (event) => { moreInfo = event; return true; };
  card._setupInteractions();
  listeners.click();
  assert.equal(moreInfo.type, 'hass-more-info');
  assert.equal(moreInfo.detail.entityId, 'sensor.watch_steps');
});

test('overview discovery stays in the Zepp2Hass config entry and keeps manual mappings', async () => {
  const { exports } = loadBundle();
  const card = new exports.AmazfitOverviewCard();
  card.setConfig({ entity: 'sensor.watch_steps', heart_rate_entity: 'sensor.manual_heart_rate' });
  card.hass = {
    states: {
      'sensor.watch_steps': { state: '100', attributes: {} },
      'sensor.manual_heart_rate': { state: '65', attributes: {} },
    },
    callWS: async (message) => message.type === 'config/entity_registry/list' ? [
      { entity_id: 'sensor.watch_steps', platform: 'zepp2hass', config_entry_id: 'watch-a', device_id: 'main', unique_id: 'watch_steps', original_name: 'Steps' },
      { entity_id: 'sensor.watch_sleep_score', platform: 'zepp2hass', config_entry_id: 'watch-a', device_id: 'sleep', unique_id: 'watch_sleep_score', original_name: 'Sleep Score' },
      { entity_id: 'sensor.watch_heart_rate', platform: 'zepp2hass', config_entry_id: 'watch-a', device_id: 'health', unique_id: 'watch_heart_rate', original_name: 'Heart Rate' },
      { entity_id: 'sensor.watch_pai', platform: 'zepp2hass', config_entry_id: 'watch-a', device_id: 'health', unique_id: 'watch_pai', original_name: 'PAI' },
      { entity_id: 'sensor.watch_training_load', platform: 'zepp2hass', config_entry_id: 'watch-a', device_id: 'training', unique_id: 'watch_training_load', original_name: 'Training Load' },
      { entity_id: 'sensor.other_sleep_score', platform: 'zepp2hass', config_entry_id: 'watch-b', device_id: 'other', unique_id: 'other_sleep_score', original_name: 'Sleep Score' },
    ] : [],
  };

  await card._ensureDiscoveredMetrics(true);
  const mappings = card._resolvedMappings();
  assert.equal(mappings.steps_entity, 'sensor.watch_steps');
  assert.equal(mappings.sleep_score_entity, 'sensor.watch_sleep_score');
  assert.equal(mappings.heart_rate_entity, 'sensor.manual_heart_rate');
  assert.equal(mappings.pai_entity, 'sensor.watch_pai');
  assert.equal(mappings.training_load_entity, 'sensor.watch_training_load');
});


test('training discovery follows Zepp2Hass config entry across secondary HA devices', () => {
  const { exports } = loadBundle();
  const registry = [
    { entity_id: 'sensor.child_last_workout', platform: 'zepp2hass', config_entry_id: 'watch-a', device_id: 'device-main', unique_id: 'z_watch_last_workout', original_name: 'Last Workout' },
    { entity_id: 'sensor.child_training_load', platform: 'zepp2hass', config_entry_id: 'watch-a', device_id: 'device-training', unique_id: 'z_watch_training_load', original_name: 'Training Load' },
    { entity_id: 'sensor.child_workout_count_2', platform: 'zepp2hass', config_entry_id: 'watch-a', device_id: 'device-training', unique_id: 'z_watch_workout_history', original_name: 'Count' },
    { entity_id: 'sensor.other_training_load', platform: 'zepp2hass', config_entry_id: 'watch-b', device_id: 'device-other', unique_id: 'z_other_training_load', original_name: 'Training Load' },
  ];
  const discovered = exports.z2hDiscoverSameDevice({
    registry,
    seedEntityId: 'sensor.child_last_workout',
    platform: 'zepp2hass',
    metricSpecs: exports.Z2H_TRAINING_METRIC_SPECS,
  });
  assert.equal(discovered.last_workout_entity, 'sensor.child_last_workout');
  assert.equal(discovered.training_load_entity, 'sensor.child_training_load');
  assert.equal(discovered.workout_count_entity, 'sensor.child_workout_count_2');
});

test('training card renders last workout, load, recovery and recent workout list', () => {
  const { exports } = loadBundle();
  const card = new exports.AmazfitTrainingCard();
  card.setConfig({
    last_workout_entity: 'sensor.watch_last_workout',
    training_load_entity: 'sensor.watch_training_load',
    workout_count_entity: 'sensor.watch_workout_count',
    language: 'ru',
  });
  card.hass = {
    language: 'ru',
    states: {
      'sensor.watch_last_workout': { state: 'Walking', attributes: { duration_minutes: 42, start_time: '2026-09-04T07:30:00Z' } },
      'sensor.watch_training_load': { state: '155', attributes: { full_recovery_time_hours: 5, vo2_max: 47 } },
      'sensor.watch_workout_count': { state: '99', attributes: { recent_workouts: ['2026-09-04 07:30 - Walking (42 min)'] } },
    },
  };
  assert.match(card.innerHTML, /Walking/);
  assert.match(card.innerHTML, /155/);
  assert.match(card.innerHTML, /5 ч/);
  assert.match(card.innerHTML, /47/);
  assert.match(card.innerHTML, /Последние тренировки/);
});

test('bundle keeps all six dashboard cards registered', () => {
  const { registry, ctx } = loadBundle();
  const names = ['amazfit-overview-card','amazfit-sleep-card','amazfit-activity-card','amazfit-health-card','amazfit-training-card','family-activity-card'];
  for (const name of names) assert.ok(registry.get(name), `${name} missing`);
  for (const name of names) assert.ok(ctx.window.customCards.some((card) => card.type === name), `${name} missing from picker`);
});

test('activity graphical editor exposes and persists the language choice', () => {
  const { registry } = loadBundle();
  const ActivityEditor = registry.get('amazfit-activity-card-editor');
  const editor = new ActivityEditor();
  let configChanged = null;
  editor.dispatchEvent = (event) => {
    configChanged = event;
    return true;
  };
  editor.setConfig({ steps_entity: 'sensor.watch_steps', language: 'auto' });
  editor.hass = { language: 'ru', states: {} };

  assert.match(editor.innerHTML, /<span class="z2h-label">Язык<\/span>\s*<select data-z2h-select="language">/);
  assert.match(editor.innerHTML, /<option value="auto" selected>Авто<\/option>/);
  assert.match(editor.innerHTML, /<option value="ru"\s*>Русский<\/option>/);
  assert.match(editor.innerHTML, /<option value="en"\s*>English<\/option>/);

  editor._setConfigValue('language', 'en');

  assert.equal(configChanged.type, 'config-changed');
  assert.equal(configChanged.detail.config.steps_entity, 'sensor.watch_steps');
  assert.equal(configChanged.detail.config.language, 'en');
  assert.match(editor.innerHTML, /<option value="en" selected>English<\/option>/);
});

test('activity card renders the 24-hour profile from recorded states plus live steps', async () => {
  const { exports } = loadBundle();
  const card = new exports.AmazfitActivityCard();
  card.setConfig({ steps_entity: 'sensor.watch_steps', show_hourly_profile: true, language: 'ru' });
  const now = new Date();
  const stamp = (hour, value) => ({ state: String(value), last_updated: new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0).toISOString() });
  card.hass = {
    language: 'ru',
    config: { time_zone: 'UTC' },
    states: { 'sensor.watch_steps': { state: '900', last_updated: stamp(3,900).last_updated, attributes: { target: 10000 } } },
    callWS: async (msg) => {
      if (msg.type === 'history/history_during_period') return { 'sensor.watch_steps': [stamp(0,100),stamp(1,500),stamp(3,900)] };
      if (msg.type === 'config/entity_registry/list') return [];
      if (msg.type === 'recorder/statistics_during_period') return { 'sensor.watch_steps': [] };
      return {};
    },
  };
  await card._loadHourlyHistory(true);
  card.render();
  assert.match(card.innerHTML, /Активность по часам/);
  assert.equal((card.innerHTML.match(/class="activity-hour"/g) || []).length, 24);
  assert.match(card.innerHTML, /01:00–02:00/);
});

test('activity hourly profile shows selected hour steps after a tap', async () => {
  const { exports } = loadBundle();
  const card = new exports.AmazfitActivityCard();
  card.setConfig({ steps_entity: 'sensor.watch_steps', show_hourly_profile: true, language: 'ru' });
  const now = new Date();
  const stamp = (hour, value) => ({ state: String(value), last_updated: new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0).toISOString() });
  card.hass = {
    language: 'ru',
    config: { time_zone: 'UTC' },
    states: { 'sensor.watch_steps': { state: '900', last_updated: stamp(3, 900).last_updated, attributes: {} } },
    callWS: async (msg) => {
      if (msg.type === 'history/history_during_period') return { 'sensor.watch_steps': [stamp(0, 100), stamp(1, 500), stamp(3, 900)] };
      if (msg.type === 'config/entity_registry/list') return [];
      return {};
    },
  };
  await card._loadHourlyHistory(true);

  const listeners = {};
  const hourOne = { dataset: { activityHour: '1' }, addEventListener(type, handler) { listeners[type] = handler; } };
  card.querySelectorAll = (selector) => selector === '[data-activity-hour]' ? [hourOne] : [];
  card._setupHourlyProfile();
  listeners.click();

  assert.match(card.innerHTML, /activity-hourly-selection[\s\S]*01:00–02:00[\s\S]*400[\s\S]*Шаги/);
});

test('sleep period summary renders average schedule and latest-night deviation', () => {
  const { exports } = loadBundle();
  const card = new exports.AmazfitSleepCard();
  card.config = { target_sleep_minutes: 480 };
  card._timezone = () => 'UTC';
  const night = (key, sh, sm, eh, em, score) => ({
    key, start: new Date(`2026-09-${key}T${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}:00Z`),
    stop: new Date(`2026-09-${String(Number(key)+1).padStart(2,'0')}T${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}:00Z`),
    sleepTotal: 480, score, totals: { DEEP_STAGE: 80, REM_STAGE: 90, LIGHT_STAGE: 310, WAKE_STAGE: 0 }, stages: [], wakeEvents: 0,
  });
  const html = card._renderPeriodContent(7, [night('01',23,0,7,0,80), night('02',23,30,7,20,82)], new Date('2026-09-03T12:00:00Z'));
  assert.match(html, /Среднее засыпание/);
  assert.match(html, /Средний подъём/);
  assert.match(html, /Последняя ночь/);
});

test('sleep hypnogram clips zoomed SVG to the plot and keeps a dedicated label gutter', () => {
  const { exports } = loadBundle();
  const card = new exports.AmazfitSleepCard();
  card.setConfig({ entity: 'sensor.watch_sleep_score', language: 'ru', chart_height: 235 });
  card.hass = {
    language: 'ru',
    states: {
      'sensor.watch_sleep_score': {
        state: '85',
        last_updated: '2026-09-04T07:10:00Z',
        attributes: {
          stages: [
            { phase: 'LIGHT_STAGE', start: '2026-09-03T23:30:00Z', stop: '2026-09-04T00:30:00Z', duration_min: 60 },
            { phase: 'DEEP_STAGE', start: '2026-09-04T00:31:00Z', stop: '2026-09-04T01:10:00Z', duration_min: 39 },
            { phase: 'REM_STAGE', start: '2026-09-04T01:11:00Z', stop: '2026-09-04T02:00:00Z', duration_min: 49 },
          ],
        },
      },
    },
    callWS: async () => [],
  };

  assert.match(card.innerHTML, /svg\.plot\s*\{[^}]*overflow:\s*hidden[^}]*clip-path:\s*inset\(0\)/s);
  assert.match(card.innerHTML, /\.chart\s*\{[^}]*grid-template-columns:\s*84px minmax\(0,1fr\)[^}]*gap:\s*12px/s);
  assert.match(card.innerHTML, /\.xaxis\s*\{[^}]*margin-left:\s*96px/s);
});
