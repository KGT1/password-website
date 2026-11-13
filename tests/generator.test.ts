import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crackTimeEstimates, SentenceGenerator } from 'ger-morph-pw-gen/SentenceGenerator';
import { isLayoutSafe } from 'ger-morph-pw-gen/LayoutSafety';
import { ATTACKER_LABELS, merksatzSegments, passwordSegments, SEPARATOR_CHOICES } from '../src/format';
import { getWordlist, WORDLIST_ATTRIBUTION, WORDLIST_LICENSE } from '../src/wordlists';

test('bundled wordlists load and give the measured strength', () => {
    const main = new SentenceGenerator(getWordlist('main'));
    const kids = new SentenceGenerator(getWordlist('kids'));
    const round = (bits: number) => Math.round(bits * 10) / 10;
    assert.equal(round(main.describeStrength().entropyBits), 65.3);
    assert.equal(round(main.describeStrength({ adverb: false }).entropyBits), 57.3);
    assert.equal(round(kids.describeStrength().entropyBits), 56.1);
    assert.equal(round(kids.describeStrength({ adverb: false }).entropyBits), 49.8);
    assert.equal(WORDLIST_LICENSE, 'CC BY-SA 4.0');
    assert.match(WORDLIST_ATTRIBUTION, /Wiktionary/);
});

test('generated passwords are layout safe and match their segments', () => {
    for (const id of ['main', 'kids'] as const) {
        const generator = new SentenceGenerator(getWordlist(id));
        for (let i = 0; i < 200; i++) {
            const separator = SEPARATOR_CHOICES[i % SEPARATOR_CHOICES.length]!;
            const result = generator.generate({ separator, digits: i % 7, adverb: i % 2 === 0 });
            assert.ok(isLayoutSafe(result.password), result.password);
            assert.equal(passwordSegments(result.parts).map(s => s.text).join(''), result.password);
            assert.ok(merksatzSegments(result.parts).length > 0);
        }
    }
});

test('every attacker model has a German label', () => {
    for (const estimate of crackTimeEstimates(65)) {
        assert.ok(ATTACKER_LABELS[estimate.id], estimate.id);
    }
});
