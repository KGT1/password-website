/**
 * Pure helpers for the website: option handling, text segments for the
 * password and the Merksatz, and German number/duration formatting.
 * No DOM access, so everything here can be tested in Node.
 */
import type { SentenceParts, SentenceSlot, Separator, TrailingSymbol } from 'ger-morph-pw-gen/SentenceGenerator';

// ---------------------------------------------------------------------------
// Options

export type WordlistId = 'main' | 'kids';

/** Everything the user can configure; persisted in localStorage (never the password) */
export interface SiteOptions {
    readonly wordlist: WordlistId;
    readonly adverb: boolean;
    readonly digits: number;
    readonly separator: Separator;
    readonly trailingSymbol: TrailingSymbol;
}

/** Defaults: the strong main-list sentence, e.g. `flinkerFuchs.malt.leise.roteTomate.42!` */
export const DEFAULT_OPTIONS: SiteOptions = {
    wordlist: 'main',
    adverb: true,
    digits: 2,
    separator: '.',
    trailingSymbol: '!'
};

export const WORDLIST_IDS: readonly WordlistId[] = ['main', 'kids'];
export const SEPARATOR_CHOICES: readonly Separator[] = ['.', ',', ' ', '!', '$', '%'];
export const TRAILING_SYMBOL_CHOICES: readonly TrailingSymbol[] = ['!', '$', '%', ''];
export const MAX_DIGITS = 6;

/** German names for separators and trailing symbols (for labels and screen readers) */
export const SYMBOL_NAMES: Readonly<Record<string, string>> = {
    '.': 'Punkt',
    ',': 'Komma',
    ' ': 'Leerzeichen',
    '!': 'Ausrufezeichen',
    '$': 'Dollarzeichen',
    '%': 'Prozentzeichen',
    '': 'keins'
};

/**
 * Builds valid options from untrusted data (e.g. parsed localStorage);
 * every invalid or missing field falls back to its default.
 */
export function sanitizeOptions(raw: unknown): SiteOptions {
    const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
        allowed.includes(value as T) ? (value as T) : fallback;
    const digits = data['digits'];
    return {
        wordlist: pick(data['wordlist'], WORDLIST_IDS, DEFAULT_OPTIONS.wordlist),
        adverb: typeof data['adverb'] === 'boolean' ? data['adverb'] : DEFAULT_OPTIONS.adverb,
        digits: typeof digits === 'number' && Number.isInteger(digits) && digits >= 0 && digits <= MAX_DIGITS
            ? digits
            : DEFAULT_OPTIONS.digits,
        separator: pick(data['separator'], SEPARATOR_CHOICES, DEFAULT_OPTIONS.separator),
        trailingSymbol: pick(data['trailingSymbol'], TRAILING_SYMBOL_CHOICES, DEFAULT_OPTIONS.trailingSymbol)
    };
}

/** Parses stored options; corrupt JSON gives the defaults */
export function parseStoredOptions(stored: string | null): SiteOptions {
    if (stored === null) {
        return DEFAULT_OPTIONS;
    }
    try {
        return sanitizeOptions(JSON.parse(stored));
    } catch {
        return DEFAULT_OPTIONS;
    }
}

// ---------------------------------------------------------------------------
// Sentence parts → display segments

/** Phrase a piece of text belongs to; used for colour coding */
export type Phrase = 'subject' | 'verb' | 'adverb' | 'object' | 'digits';

/** A piece of displayed text; phrase null for separators and symbols */
export interface Segment {
    readonly text: string;
    readonly phrase: Phrase | null;
}

export const PHRASE_LABELS: Readonly<Record<Phrase, string>> = {
    subject: 'Subjekt',
    verb: 'Verb',
    adverb: 'Adverb',
    object: 'Objekt',
    digits: 'Zahl'
};

export const SLOT_PHRASE: Readonly<Record<SentenceSlot, Phrase>> = {
    subjectAdjective: 'subject',
    subjectNoun: 'subject',
    verb: 'verb',
    adverb: 'adverb',
    objectAdjective: 'object',
    objectNoun: 'object',
    digits: 'digits'
};

export const SLOT_LABELS: Readonly<Record<SentenceSlot, string>> = {
    subjectAdjective: 'Adjektiv',
    subjectNoun: 'Nomen',
    verb: 'Verb',
    adverb: 'Adverb',
    objectAdjective: 'Adjektiv',
    objectNoun: 'Nomen',
    digits: 'Ziffern'
};

/** The password split into phrases and separators; joined it equals the password */
export function passwordSegments(parts: SentenceParts): Segment[] {
    const phrases: Segment[] = [
        { text: parts.subjectAdjective + parts.subjectNoun, phrase: 'subject' },
        { text: parts.verb, phrase: 'verb' }
    ];
    if (parts.adverb !== null) {
        phrases.push({ text: parts.adverb, phrase: 'adverb' });
    }
    phrases.push({ text: parts.objectAdjective + parts.objectNoun, phrase: 'object' });
    if (parts.digits) {
        phrases.push({ text: parts.digits, phrase: 'digits' });
    }

    const segments: Segment[] = [];
    phrases.forEach((segment, index) => {
        if (index > 0) {
            segments.push({ text: parts.separator, phrase: null });
        }
        segments.push(segment);
    });
    if (parts.trailingSymbol) {
        segments.push({ text: parts.trailingSymbol, phrase: null });
    }
    return segments;
}

/**
 * The natural sentence as a memory aid, e.g.
 * "Flinker Fuchs malt leise rote Tomate – 42!"
 */
export function merksatzSegments(parts: SentenceParts): Segment[] {
    const subject = capitalize(parts.subjectAdjective) + ' ' + parts.subjectNoun;
    const phrases: Segment[] = [
        { text: subject, phrase: 'subject' },
        { text: parts.verb, phrase: 'verb' }
    ];
    if (parts.adverb !== null) {
        phrases.push({ text: parts.adverb, phrase: 'adverb' });
    }
    phrases.push({ text: parts.objectAdjective + ' ' + parts.objectNoun, phrase: 'object' });

    const segments: Segment[] = [];
    phrases.forEach((segment, index) => {
        if (index > 0) {
            segments.push({ text: ' ', phrase: null });
        }
        segments.push(segment);
    });
    if (parts.digits) {
        segments.push({ text: ' – ', phrase: null }, { text: parts.digits, phrase: 'digits' });
    }
    if (parts.trailingSymbol) {
        segments.push({ text: parts.trailingSymbol, phrase: null });
    }
    return segments;
}

function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

// ---------------------------------------------------------------------------
// Strength

export interface StrengthBand {
    readonly id: 'weak' | 'medium' | 'strong' | 'veryStrong';
    readonly label: string;
}

/** < 40 Schwach, 40–59 Mittel, 60–79 Stark, ≥ 80 Sehr stark */
export function strengthBand(bits: number): StrengthBand {
    if (bits < 40) return { id: 'weak', label: 'Schwach' };
    if (bits < 60) return { id: 'medium', label: 'Mittel' };
    if (bits < 80) return { id: 'strong', label: 'Stark' };
    return { id: 'veryStrong', label: 'Sehr stark' };
}

/** German labels for the attacker models of ger-morph-pw-gen, by id */
export const ATTACKER_LABELS: Readonly<Record<string, string>> = {
    onlineThrottled: 'Online-Angriff mit Sperre (100 Versuche/Stunde)',
    onlineUnthrottled: 'Online-Angriff ohne Sperre (10 Versuche/Sekunde)',
    offlineBcrypt: 'Datenleck, gut geschützt (bcrypt, 1 Grafikkarte)',
    offlineFastHash: 'Datenleck, schwach geschützt (MD5, 1 Grafikkarte)',
    offlineFastHashCluster: 'Datenleck, schwach geschützt, 1000 Grafikkarten'
};

// ---------------------------------------------------------------------------
// Number formatting (German)

/** Narrow no-break space: groups digits without using "." (a password character) */
const GROUP = ' ';
const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Groups an integer in threes with narrow spaces: 2738 → "2 738" */
export function formatInteger(value: number | bigint): string {
    const digits = (typeof value === 'bigint' ? value : BigInt(Math.round(value))).toString();
    const negative = digits.startsWith('-');
    const abs = negative ? digits.slice(1) : digits;
    if (abs.length <= 4) {
        // German typesetting leaves four-digit numbers ungrouped
        return digits;
    }
    const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
    return (negative ? '-' : '') + grouped;
}

/** Formats a decimal with a comma and at most `fractionDigits` decimals: 2.25 → "2,3" */
export function formatDecimal(value: number, fractionDigits = 1): string {
    const factor = 10 ** fractionDigits;
    const rounded = Math.round(value * factor) / factor;
    const [whole = '0', fraction] = rounded.toFixed(fractionDigits).split('.');
    const trimmed = fraction?.replace(/0+$/, '') ?? '';
    return formatInteger(BigInt(whole)) + (trimmed ? ',' + trimmed : '');
}

function superscript(n: number): string {
    return String(n).split('').map(d => SUPERSCRIPT[Number(d)] ?? d).join('');
}

/**
 * Formats a (possibly huge) count: up to a million in full ("950 000"),
 * above as "4,3 · 10¹⁹"
 */
export function formatCount(value: bigint): string {
    if (value < 1_000_000n) {
        return formatInteger(value);
    }
    const digits = value.toString();
    const exponent = digits.length - 1;
    // Three significant digits are enough to round correctly to one decimal
    let mantissa = Math.round(Number(digits.slice(0, 3)) / 10) / 10;
    let exp = exponent;
    if (mantissa >= 10) {
        mantissa /= 10;
        exp += 1;
    }
    return `${formatDecimal(mantissa)} · 10${superscript(exp)}`;
}

// ---------------------------------------------------------------------------
// Durations (German)

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365.25 * DAY;
/** Age of the universe, rounded up: ~1.38 · 10¹⁰ years */
const UNIVERSE_AGE_YEARS = 1.4e10;

function count(value: number, singular: string, plural: string): string {
    const text = value < 10 ? formatDecimal(value) : formatInteger(Math.round(value));
    return `${text} ${text === '1' ? singular : plural}`;
}

/**
 * Human-friendly German duration: "weniger als 1 Sekunde", "3,5 Stunden",
 * "12 Tage", "350 Jahre", "2,4 Millionen Jahre", "länger als das Universum alt ist"
 */
export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds / YEAR >= UNIVERSE_AGE_YEARS) {
        return 'länger als das Universum alt ist';
    }
    if (seconds < 1) return 'weniger als 1 Sekunde';
    if (seconds < MINUTE) return count(seconds, 'Sekunde', 'Sekunden');
    if (seconds < HOUR) return count(seconds / MINUTE, 'Minute', 'Minuten');
    if (seconds < DAY) return count(seconds / HOUR, 'Stunde', 'Stunden');
    if (seconds < YEAR) return count(seconds / DAY, 'Tag', 'Tage');
    const years = seconds / YEAR;
    if (years < 1e6) return count(years, 'Jahr', 'Jahre');
    if (years < 1e9) return count(years / 1e6, 'Million Jahre', 'Millionen Jahre');
    return count(years / 1e9, 'Milliarde Jahre', 'Milliarden Jahre');
}
