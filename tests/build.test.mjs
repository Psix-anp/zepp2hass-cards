import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

test('HACS bundle exactly matches the ordered source modules and package version', () => {
  const result = spawnSync(process.execPath, ['scripts/build.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
  assert.ok(fs.readFileSync('zepp2hass-cards.js', 'utf8').includes(`const Z2H_VERSION = "${version}";`));
});
