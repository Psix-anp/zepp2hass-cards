import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../zepp2hass-cards.js', import.meta.url), 'utf8');
const registry = JSON.parse(fs.readFileSync(new URL('./fixtures/zepp-registry.fixture.json', import.meta.url), 'utf8'));

function discover(metricConstant, seedEntityId) {
  const customElements = new Map();
  class HTMLElement {}
  const ctx = {
    console, HTMLElement,
    CustomEvent: class {},
    customElements: { define: (n,k) => customElements.set(n,k), get: n => customElements.get(n) },
    window: { customCards: [] },
    document: { createElement: () => ({}) },
    navigator: { language: 'en-US' },
    Intl, Date, Math, Number, String, Array, Object, Map, Set, RegExp, Promise, structuredClone, setTimeout, clearTimeout,
    registry,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(`${source}\n;globalThis.__result=z2hDiscoverSameDevice({registry:globalThis.registry,seedEntityId:${JSON.stringify(seedEntityId)},platform:'zepp2hass',metricSpecs:${metricConstant}});`, ctx);
  return ctx.__result;
}

test('activity discovery tolerates a suffixed distance entity id', () => {
  const out = discover('Z2H_ACTIVITY_METRIC_SPECS', 'sensor.demo_watch_steps');
  assert.equal(out.steps_entity, 'sensor.demo_watch_steps');
  assert.equal(out.distance_entity, 'sensor.demo_watch_distance_2');
  assert.equal(out.calories_entity, 'sensor.demo_watch_calories');
});

test('training discovery follows config entry across a secondary HA device', () => {
  const out = discover('Z2H_TRAINING_METRIC_SPECS', 'sensor.demo_watch_last_workout');
  assert.equal(out.last_workout_entity, 'sensor.demo_watch_last_workout');
  assert.equal(out.training_load_entity, 'sensor.demo_watch_training_load');
  assert.equal(out.workout_count_entity, 'sensor.demo_watch_workout_count');
});

test('discovery does not cross into another Zepp2Hass config entry', () => {
  const out = discover('Z2H_ACTIVITY_METRIC_SPECS', 'sensor.demo_watch_steps');
  assert.notEqual(out.steps_entity, 'sensor.other_watch_steps');
});
