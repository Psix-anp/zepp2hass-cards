import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadBundle } from './helpers/load-bundle.mjs';

test('optional extensions compose without removing existing card content', () => {
  const { ctx, registry } = loadBundle();
  vm.runInContext(`
    z2hRegisterOptionalFeature({id:'first', cards:[AmazfitActivityCard],
      render: card => card.config.test_first === true ? '<span>first enabled</span>' : ''});
    z2hRegisterOptionalFeature({id:'second', cards:[AmazfitActivityCard],
      render: card => card.config.test_second === true ? '<span>second enabled</span>' : ''});
  `, ctx);
  const card = new (registry.get('amazfit-activity-card'))();
  card.setConfig({ steps_entity: 'sensor.demo', test_first: true, test_second: true });
  card.hass = { states: { 'sensor.demo': { state: '125', attributes: {} } } };
  assert.match(card.innerHTML, /125/);
  assert.match(card.innerHTML, /first enabled/);
  assert.match(card.innerHTML, /second enabled/);
  card.hass = { ...card._hass };
  assert.equal((card.innerHTML.match(/first enabled/g) || []).length, 1);
  card.setConfig({ steps_entity: 'sensor.demo' });
  card.render();
  assert.doesNotMatch(card.innerHTML, /first enabled|second enabled/);
});

test('extension editor uses normal config-changed events and preserves base controls', () => {
  const { ctx, registry } = loadBundle();
  vm.runInContext(`z2hRegisterOptionalFeature({id:'test-editor', editors:[AmazfitActivityCardEditor],
    editor: editor => editor._toggleHtml('test_enabled', 'Test feature', editor._config.test_enabled === true)});`, ctx);
  const editor = new (registry.get('amazfit-activity-card-editor'))();
  editor.setConfig({ steps_entity: 'sensor.demo' });
  editor.hass = { states: {} };
  assert.match(editor.innerHTML, /data-z2h-toggle="test_enabled"/);
  assert.match(editor.innerHTML, /data-z2h-toggle="show_hourly_profile"/);
  let event;
  editor.dispatchEvent = value => { event = value; return true; };
  editor._setConfigValue('test_enabled', true);
  assert.equal(event.detail.config.test_enabled, true);
  assert.equal(event.detail.config.steps_entity, 'sensor.demo');
});
