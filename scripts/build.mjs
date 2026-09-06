import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['core.js', 'optional-shared.js', 'achievements.js', 'activity-extras.js'];
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const body = files.map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8').trimEnd()).join('\n\n');
if (!body.includes(`const Z2H_VERSION = "${version}";`)) throw new Error('Core version must match package.json');
const output = '// Generated bundle. Edit src/ files and run npm run build.\n' + body + '\n';
const target = path.join(root, 'zepp2hass-cards.js');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== output) {
    throw new Error('Generated bundle is stale. Run npm run build.');
  }
  console.log('Bundle/source parity PASS');
} else {
  fs.writeFileSync(target, output);
  console.log(`Built zepp2hass-cards.js v${version} from ${files.length} source modules`);
}
