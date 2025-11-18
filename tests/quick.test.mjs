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

console.log('✅ All tests passed');
