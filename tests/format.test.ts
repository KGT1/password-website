import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crackTimeEstimates } from 'ger-morph-pw-gen/SentenceGenerator';
import type { SentenceParts } from 'ger-morph-pw-gen/SentenceGenerator';
import {
    DEFAULT_OPTIONS,
    formatCount,
    formatDecimal,
    formatDuration,
    formatInteger,
    isDefaultOptions,
    merksatz,
    parseStoredOptions,
    passwordChunks,
    sanitizeOptions,
    strengthBand,
    strengthSummary,
    WARN_BELOW_SECONDS
} from '../src/format';

const NNBSP = ' ';

const parts: SentenceParts = {
    subjectAdjective: 'flinker',
    subjectNoun: 'Fuchs',
    verb: 'malt',
    adverb: 'leise',
    objectAdjective: 'rote',
    objectNoun: 'Tomate',
    digits: '42',
    trailingSymbol: '!',
    separator: '.'
};

test('passwordChunks end with their separator and join to the password', () => {
    assert.deepEqual(passwordChunks(parts), ['flinkerFuchs.', 'malt.', 'leise.', 'roteTomate.', '42!']);
    const short = passwordChunks({ ...parts, adverb: null, digits: '', trailingSymbol: '', separator: ' ' });
    assert.deepEqual(short, ['flinkerFuchs ', 'malt ', 'roteTomate']);
    assert.equal(short.join(''), 'flinkerFuchs malt roteTomate');
});

test('merksatz builds a natural sentence', () => {
    assert.equal(merksatz(parts), 'Flinker Fuchs malt leise rote Tomate – 42!');
    assert.equal(merksatz({ ...parts, adverb: null, digits: '', trailingSymbol: '' }), 'Flinker Fuchs malt rote Tomate');
    assert.equal(merksatz({ ...parts, digits: '', trailingSymbol: '%' }), 'Flinker Fuchs malt leise rote Tomate%');
});

test('strength summary names the well-protected leak and warns when weak', () => {
    const strong = strengthSummary(crackTimeEstimates(65.3));
    assert.equal(strong.text,
        'Online praktisch nicht zu erraten · gut geschütztes Datenleck: im Schnitt ≈\u00a072 Millionen Jahre');
    assert.equal(strong.warning, false);

    // Kids list, short, no digits
    const weak = strengthSummary(crackTimeEstimates(43.2));
    assert.equal(weak.warning, true);
    assert.match(weak.text, /^Online praktisch nicht zu erraten · .*im Schnitt nur ≈\u00a016 Jahre, für wichtige Konten zu wenig$/);

    assert.match(strengthSummary(crackTimeEstimates(100)).text, /im Schnitt länger als das Universum alt ist$/);
    assert.match(strengthSummary(crackTimeEstimates(30)).text, /^Online nur sicher, wenn der Dienst Fehlversuche begrenzt/);
    assert.match(strengthSummary(crackTimeEstimates(10)).text, /^Schon online schnell zu erraten/);

    const atThreshold = crackTimeEstimates(65).map(e => ({ ...e, seconds: e.id === 'offlineBcrypt' ? WARN_BELOW_SECONDS : e.seconds }));
    assert.equal(strengthSummary(atThreshold).warning, false);
});

test('strengthBand thresholds', () => {
    assert.equal(strengthBand(39.9).label, 'Schwach');
    assert.equal(strengthBand(40).label, 'Mittel');
    assert.equal(strengthBand(59.99).label, 'Mittel');
    assert.equal(strengthBand(60).label, 'Stark');
    assert.equal(strengthBand(80).label, 'Sehr stark');
});

test('German number formatting', () => {
    assert.equal(formatInteger(854), '854');
    assert.equal(formatInteger(2738), '2738');
    assert.equal(formatInteger(27380), `27${NNBSP}380`);
    assert.equal(formatInteger(1_000_000n), `1${NNBSP}000${NNBSP}000`);
    assert.equal(formatDecimal(2.25), '2,3');
    assert.equal(formatDecimal(3), '3');
    assert.equal(formatCount(950_000n), `950${NNBSP}000`);
    assert.equal(formatCount(43_210_000_000_000_000_000n), '4,3 · 10¹⁹');
    assert.equal(formatCount(9_960_000n), '1 · 10⁷');
});

test('German durations', () => {
    const year = 365.25 * 86400;
    assert.equal(formatDuration(0.2), 'weniger als 1 Sekunde');
    assert.equal(formatDuration(1), '1 Sekunde');
    assert.equal(formatDuration(45), '45 Sekunden');
    assert.equal(formatDuration(90), '1,5 Minuten');
    assert.equal(formatDuration(3600), '1 Stunde');
    assert.equal(formatDuration(20 * 3600), '20 Stunden');
    assert.equal(formatDuration(3 * 86400), '3 Tage');
    assert.equal(formatDuration(3.5 * year), '3,5 Jahre');
    assert.equal(formatDuration(12_000 * year), `12${NNBSP}000 Jahre`);
    assert.equal(formatDuration(1e6 * year), '1 Million Jahre');
    assert.equal(formatDuration(7e7 * year), '70 Millionen Jahre');
    assert.equal(formatDuration(2.4e9 * year), '2,4 Milliarden Jahre');
    assert.equal(formatDuration(1.5e10 * year), 'länger als das Universum alt ist');
    assert.equal(formatDuration(Infinity), 'länger als das Universum alt ist');
});

test('stored options are sanitised', () => {
    assert.deepEqual(parseStoredOptions(null), DEFAULT_OPTIONS);
    assert.deepEqual(parseStoredOptions('not json'), DEFAULT_OPTIONS);
    assert.deepEqual(parseStoredOptions('"string"'), DEFAULT_OPTIONS);
    assert.deepEqual(
        sanitizeOptions({ wordlist: 'kids', adverb: false, digits: 4, separator: ' ', trailingSymbol: '' }),
        { wordlist: 'kids', adverb: false, digits: 4, separator: ' ', trailingSymbol: '' });
    assert.deepEqual(
        sanitizeOptions({ wordlist: 'x', adverb: 'yes', digits: 7, separator: '-', trailingSymbol: '?', password: 'p' }),
        DEFAULT_OPTIONS);
    assert.equal(sanitizeOptions({ digits: 2.5 }).digits, DEFAULT_OPTIONS.digits);
});

test('customised options are detected', () => {
    assert.equal(isDefaultOptions(DEFAULT_OPTIONS), true);
    assert.equal(isDefaultOptions(parseStoredOptions('{"digits":2}')), true);
    assert.equal(isDefaultOptions({ ...DEFAULT_OPTIONS, digits: 3 }), false);
    assert.equal(isDefaultOptions({ ...DEFAULT_OPTIONS, separator: ' ' }), false);
    assert.equal(isDefaultOptions({ ...DEFAULT_OPTIONS, adverb: false }), false);
});
