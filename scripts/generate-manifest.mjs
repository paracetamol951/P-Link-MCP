// scripts/generate-manifest.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const base = path.resolve(__dirname, '..');

function deepGet(obj, key) {
    return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

function render(obj, dict) {
    if (typeof obj === 'string') {
        return obj.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
            const v = deepGet(dict, k.trim());
            return v !== undefined ? String(v) : '';
        });
    } else if (Array.isArray(obj)) {
        return obj.map((x) => render(x, dict));
    } else if (obj && typeof obj === 'object') {
        const out = {};
        for (const k of Object.keys(obj)) out[k] = render(obj[k], dict);
        return out;
    }
    return obj;
}

function main() {
    const langEnv = (process.env.MCP_LANG || process.env.LANG || 'en').toLowerCase().slice(0, 2);
    const lang = ['fr', 'en'].includes(langEnv) ? langEnv : 'en';

    const dictPath = path.join(base, 'locales', lang, 'common.json');
    const tmplPath = path.join(base, 'manifest.template.json');

    const dict = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
    const tmpl = JSON.parse(fs.readFileSync(tmplPath, 'utf-8'));

    const rendered = render(tmpl, dict);
    const outPath = path.join(base, `manifest.${lang}.json`);
    fs.writeFileSync(outPath, JSON.stringify(rendered, null, 2));
    console.log(`Wrote ${outPath}`);
}

main();
