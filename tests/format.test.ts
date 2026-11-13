import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SentenceParts } from 'ger-morph-pw-gen/SentenceGenerator';
import {
    DEFAULT_OPTIONS,
    formatCount,
    formatDecimal,
    formatDuration,
    formatInteger,
    merksatzSegments,
    parseStoredOptions,
    passwordSegments,
    sanitizeOptions,
    strengthBand
} from '../src/format';

const NNBSP = ' ';
const join = (segments: { text: string }[]) => segments.map(s => s.text).join('');

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

test('passwordSegments joins to the password and tags phrases', () => {
    const segments = passwordSegments(parts);
    assert.equal(join(segments), 'flinkerFuchs.malt.leise.roteTomate.42!');
    assert.deepEqual(segments.filter(s => s.phrase).map(s => s.phrase),
        ['subject', 'verb', 'adverb', 'object', 'digits']);
    const short = passwordSegments({ ...parts, adverb: null, digits: '', trailingSymbol: '', separator: ' ' });
    assert.equal(join(short), 'flinkerFuchs malt roteTomate');
});

test('merksatzSegments builds a natural sentence', () => {
    assert.equal(join(merksatzSegments(parts)), 'Flinker Fuchs malt leise rote Tomate – 42!');
    assert.equal(join(merksatzSegments({ ...parts, adverb: null, digits: '', trailingSymbol: '' })),
        'Flinker Fuchs malt rote Tomate');
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
