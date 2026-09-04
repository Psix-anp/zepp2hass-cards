import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const forbiddenNames = [
  /^zepp2hass_entities_.*\.(json|csv)$/i,
  /\.har(\.zip)?$/i,
];
const textExt = new Set(['.js','.mjs','.json','.md','.yml','.yaml','.txt','.gitignore']);
const suspicious = [
  { re: /Authorization\s*:\s*Bearer\s+\S+/i, label: 'Bearer token' },
  { re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/, label: 'JWT-like token' },
  { re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/, label: 'API-key-like token' },
  { re: /\/api\/webhook\/[A-Za-z0-9_-]{12,}/, label: 'Home Assistant webhook id' },
];

const skipDirs = new Set(['.git','node_modules']);
const problems = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    const rel = path.relative(root, p);
    if (ent.isDirectory()) { walk(p); continue; }
    if (forbiddenNames.some((re) => re.test(ent.name))) problems.push(`${rel}: forbidden private-capture filename`);
    if (!textExt.has(path.extname(ent.name)) && ent.name !== '.gitignore') continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const {re,label} of suspicious) if (re.test(text)) problems.push(`${rel}: ${label}`);
  }
}
walk(root);

if (problems.length) {
  console.error('Privacy scan failed:');
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}
console.log('privacy scan: PASS');
