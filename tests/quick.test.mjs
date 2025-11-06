import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const base = path.resolve(__dirname, '..');

function run(cmd, env = {}) {
    return execSync(cmd, { stdio: 'pipe', env: { ...process.env, ...env }, cwd: base }).toString();
}

// 1) i18n dictionary resolves keys
const enDict = JSON.parse(fs.readFileSync(path.join(base, 'locales', 'en', 'common.json'), 'utf-8'));
const frDict = JSON.parse(fs.readFileSync(path.join(base, 'locales', 'fr', 'common.json'), 'utf-8'));
assert.equal(typeof enDict.app.name, 'string');
assert.equal(typeof frDict.app.name, 'string');

// 2) manifest generation script works for en & fr
run('node scripts/generate-manifest.mjs', { MCP_LANG: 'en' });
const manEn = JSON.parse(fs.readFileSync(path.join(base, 'manifest.en.json'), 'utf-8'));
assert.ok(Array.isArray(manEn.tools) && manEn.tools.length >= 3);
assert.equal(typeof manEn.name, 'string');

run('node scripts/generate-manifest.mjs', { MCP_LANG: 'fr' });
const manFr = JSON.parse(fs.readFileSync(path.join(base, 'manifest.fr.json'), 'utf-8'));
assert.ok(Array.isArray(manFr.tools) && manFr.tools.length >= 3);
assert.equal(typeof manFr.name, 'string');

console.log('✅ All tests passed');
