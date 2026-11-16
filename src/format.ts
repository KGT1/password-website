/**
 * Pure helpers for the website: option handling, the displayed password
 * and Merksatz, the strength summary and German number/duration formatting.
 * No DOM access, so everything here can be tested in Node.
 */
import type { CrackTimeEstimate, SentenceParts, SentenceSlot, Separator, TrailingSymbol } from 'ger-morph-pw-gen/SentenceGenerator';

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
// Sentence parts → display text

/** Default options? Used to flag customised settings */
export function isDefaultOptions(options: SiteOptions): boolean {
    return (Object.keys(DEFAULT_OPTIONS) as (keyof SiteOptions)[])
        .every(key => options[key] === DEFAULT_OPTIONS[key]);
}

export const SLOT_LABELS: Readonly<Record<SentenceSlot, string>> = {
    subjectAdjective: 'Adjektiv',
    subjectNoun: 'Nomen',
    verb: 'Verb',
    adverb: 'Adverb',
    objectAdjective: 'Adjektiv',
    objectNoun: 'Nomen',
    digits: 'Ziffern'
};

/** Which part of the sentence a slot belongs to, where the slot name alone is ambiguous */
export const SLOT_HINTS: Readonly<Partial<Record<SentenceSlot, string>>> = {
    subjectAdjective: 'Subjekt',
    subjectNoun: 'Subjekt',
    objectAdjective: 'Objekt',
    objectNoun: 'Objekt'
};

/**
 * The password in chunks that each end with their separator (or the
 * trailing symbol), e.g. ["flinkerFuchs.", "malt.", …, "42!"]. Joined they
 * equal the password; the page allows line breaks between chunks only.
 */
export function passwordChunks(parts: SentenceParts): string[] {
    const words = [parts.subjectAdjective + parts.subjectNoun, parts.verb];
    if (parts.adverb !== null) {
        words.push(parts.adverb);
    }
    words.push(parts.objectAdjective + parts.objectNoun);
    if (parts.digits) {
        words.push(parts.digits);
    }
    const last = words.length - 1;
    return words.map((word, index) => word + (index < last ? parts.separator : parts.trailingSymbol));
}

/**
 * The natural sentence as a memory aid, e.g.
 * "Flinker Fuchs malt leise rote Tomate – 42!"
 */
export function merksatz(parts: SentenceParts): string {
    const words = [capitalize(parts.subjectAdjective), parts.subjectNoun, parts.verb];
    if (parts.adverb !== null) {
        words.push(parts.adverb);
    }
    words.push(parts.objectAdjective, parts.objectNoun);
    const digits = parts.digits ? ' – ' + parts.digits : '';
    return words.join(' ') + digits + parts.trailingSymbol;
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

/** Crack times below this (100 years) count as too fast and are shown as a warning */
export const WARN_BELOW_SECONDS = 100 * 365.25 * 24 * 3600;

export interface StrengthSummary {
    /** The online case, e.g. "Online praktisch nicht zu erraten" */
    readonly online: string;
    /** The well-protected leak, e.g. "gut geschütztes Datenleck: im Schnitt ≈ 71 Millionen Jahre" */
    readonly leak: string;
    /** Both joined: "online · leak" */
    readonly text: string;
    /** True if a well-protected leak (bcrypt) would be cracked within WARN_BELOW_SECONDS */
    readonly warning: boolean;
}

/**
 * One honest line for the main view: the online case and, explicitly, a
 * well-protected (bcrypt) data leak. Poorly protected leaks are only in
 * the details table.
 */
export function strengthSummary(estimates: readonly Pick<CrackTimeEstimate, 'id' | 'seconds'>[]): StrengthSummary {
    const seconds = (id: string): number => estimates.find(estimate => estimate.id === id)?.seconds ?? 0;

    let online: string;
    if (seconds('onlineUnthrottled') >= WARN_BELOW_SECONDS) {
        online = 'Online praktisch nicht zu erraten';
    } else if (seconds('onlineThrottled') >= WARN_BELOW_SECONDS) {
        online = 'Online nur sicher, wenn der Dienst Fehlversuche begrenzt';
    } else {
        online = 'Schon online schnell zu erraten';
    }

    const leakSeconds = seconds('offlineBcrypt');
    const warning = leakSeconds < WARN_BELOW_SECONDS;
    const duration = formatDuration(leakSeconds);
    // No-break space: "≈" stays with its number
    const approx = /^\d/.test(duration) ? '≈\u00a0' + duration : duration;
    const leak = warning
        ? `gut geschütztes Datenleck: im Schnitt nur ${approx}, für wichtige Konten zu wenig`
        : `gut geschütztes Datenleck: im Schnitt ${approx}`;
    return { online, leak, text: `${online} · ${leak}`, warning };
}

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
