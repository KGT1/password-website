// Copies the built wordlists from the sibling german-morph-filter repository
// into src/wordlists/, where esbuild bundles them into docs/script.js.
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, '..', 'german-morph-filter', 'data', 'output');
const targetDir = join(root, 'src', 'wordlists');

for (const file of ['wordlist_main.json', 'wordlist_kids.json']) {
    const source = join(sourceDir, file);
    if (!existsSync(source)) {
        console.error(`Missing ${source} - build the wordlists in german-morph-filter first.`);
        process.exit(1);
    }
    const data = JSON.parse(readFileSync(source, 'utf8'));
    if (data.version !== 1 || !data.license || !data.attribution) {
        console.error(`${file}: expected version 1 with license and attribution fields.`);
        process.exit(1);
    }
    copyFileSync(source, join(targetDir, file));
    console.log(`${file}: ${data.nouns.length} nouns, ${data.adjectives.length} adjectives, ` +
        `${data.verbs.length} verbs, ${(data.adverbs ?? []).length} adverbs (${data.license})`);
}
