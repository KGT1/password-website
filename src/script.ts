import { crackTimeEstimates, SentenceGenerator } from 'ger-morph-pw-gen/SentenceGenerator';
import type { GeneratedSentence, SentenceOptions, StrengthReport } from 'ger-morph-pw-gen/SentenceGenerator';
import {
    ATTACKER_LABELS,
    DEFAULT_OPTIONS,
    formatCount,
    formatDecimal,
    formatDuration,
    formatInteger,
    MAX_DIGITS,
    merksatzSegments,
    parseStoredOptions,
    PHRASE_LABELS,
    passwordSegments,
    sanitizeOptions,
    SEPARATOR_CHOICES,
    SiteOptions,
    Segment,
    SLOT_LABELS,
    SLOT_PHRASE,
    strengthBand,
    SYMBOL_NAMES,
    TRAILING_SYMBOL_CHOICES,
    WordlistId
} from './format';
import { getWordlist, WORDLIST_ATTRIBUTION } from './wordlists';

// Only the options and the theme are stored. The password is kept in memory
// only, never logged and never written to storage.
const OPTIONS_KEY = 'pwgen-options';
const THEME_KEY = 'theme';
/** Crack times below this are shown as a warning */
const WARN_BELOW_SECONDS = 100 * 365.25 * 24 * 3600;

function byId<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element #${id} fehlt`);
    }
    return element as T;
}

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: { className?: string; text?: string; phrase?: string } = {}
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (props.className) element.className = props.className;
    if (props.text !== undefined) element.textContent = props.text;
    if (props.phrase) element.dataset['phrase'] = props.phrase;
    return element;
}

// ---------------------------------------------------------------------------
// Storage (may be unavailable, e.g. in some private modes)

function readStorage(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Not persisted; the page still works
    }
}

// ---------------------------------------------------------------------------
// Theme (same behaviour as before: stored choice, otherwise system setting)

function initTheme(): void {
    const toggle = byId<HTMLButtonElement>('themeToggle');
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    let isDark = readStorage(THEME_KEY) === 'dark' || (readStorage(THEME_KEY) === null && media.matches);

    const apply = (): void => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        toggle.textContent = isDark ? 'Tagmodus' : 'Nachtmodus';
        toggle.setAttribute('aria-pressed', String(isDark));
    };

    toggle.addEventListener('click', () => {
        isDark = !isDark;
        writeStorage(THEME_KEY, isDark ? 'dark' : 'light');
        apply();
    });
    media.addEventListener('change', event => {
        if (readStorage(THEME_KEY) === null) {
            isDark = event.matches;
            apply();
        }
    });
    apply();
}

// ---------------------------------------------------------------------------
// Generator

const generators = new Map<WordlistId, SentenceGenerator>();

function generatorFor(id: WordlistId): SentenceGenerator {
    let generator = generators.get(id);
    if (!generator) {
        generator = new SentenceGenerator(getWordlist(id));
        generators.set(id, generator);
    }
    return generator;
}

function sentenceOptions(options: SiteOptions): SentenceOptions {
    return {
        adverb: options.adverb,
        digits: options.digits,
        separator: options.separator,
        trailingSymbol: options.trailingSymbol
    };
}

// ---------------------------------------------------------------------------
// Rendering

function renderSegments(target: HTMLElement, segments: readonly Segment[], breakAfterSeparators: boolean): void {
    const nodes: Node[] = [];
    for (const segment of segments) {
        if (segment.phrase) {
            nodes.push(el('span', { text: segment.text, phrase: segment.phrase }));
        } else {
            nodes.push(el('span', { className: 'sep', text: segment.text }));
            if (breakAfterSeparators) {
                nodes.push(el('wbr'));
            }
        }
    }
    target.replaceChildren(...nodes);
}

function renderPassword(result: GeneratedSentence): void {
    renderSegments(byId('password'), passwordSegments(result.parts), true);
    renderSegments(byId('merksatz'), merksatzSegments(result.parts), false);

    const phrases = passwordSegments(result.parts).flatMap(segment => segment.phrase ? [segment.phrase] : []);
    byId('legend').replaceChildren(...phrases.map(phrase =>
        el('li', { text: PHRASE_LABELS[phrase], phrase })));
}

function renderStrength(report: StrengthReport): void {
    const bits = report.entropyBits;
    const band = strengthBand(bits);
    const rounded = Math.round(bits);

    byId('bits').textContent = `≈ ${rounded} Bit`;
    const bandElement = byId('band');
    bandElement.textContent = band.label;
    bandElement.dataset['band'] = band.id;

    const ruler = byId('ruler');
    ruler.setAttribute('aria-valuenow', String(rounded));
    ruler.setAttribute('aria-valuetext', `${rounded} Bit, ${band.label.toLowerCase()}`);
    const marker = byId('rulerMarker');
    marker.dataset['band'] = band.id;
    // CSSOM custom property (allowed by the CSP, unlike inline style attributes)
    marker.style.setProperty('--pos', `${Math.min(bits, 100)}%`);

    byId('combinations').textContent = formatCount(report.combinations);

    const rows = crackTimeEstimates(bits).map(estimate => {
        const row = el('tr');
        // "Online-Angriff mit Sperre (100 Versuche/Stunde)": the part in
        // parentheses goes on its own, quieter line
        const text = ATTACKER_LABELS[estimate.id] ?? estimate.label;
        const detail = /^(.*) \((.*)\)$/.exec(text);
        const label = el('th', { text: detail?.[1] ?? text });
        if (detail?.[2]) {
            label.append(' ', el('span', { className: 'model-detail', text: detail[2] }));
        }
        label.scope = 'row';
        const time = el('td', { text: formatDuration(estimate.seconds) });
        if (estimate.seconds < WARN_BELOW_SECONDS) {
            time.className = 'is-fast';
        }
        row.append(label, time);
        return row;
    });
    byId('crackTimes').replaceChildren(...rows);

    const slotRows = report.slots.map(slot => {
        const row = el('tr');
        const name = el('th');
        name.scope = 'row';
        const phrase = SLOT_PHRASE[slot.slot];
        name.append(el('span', { text: SLOT_LABELS[slot.slot], phrase }));
        if (phrase === 'subject' || phrase === 'object') {
            name.append(' ', el('span', { className: 'phrase-hint', text: `(${PHRASE_LABELS[phrase]})` }));
        }
        row.append(
            name,
            el('td', { text: formatInteger(slot.choices) }),
            el('td', { text: formatDecimal(slot.bits) })
        );
        return row;
    });
    byId('slotRows').replaceChildren(...slotRows);
    byId('slotProduct').textContent = formatCount(report.combinations);
    byId('slotBits').textContent = formatDecimal(bits);

    const formula = byId('formula');
    const power = el('sup', { text: formatDecimal(bits) });
    formula.replaceChildren(
        report.slots.map(slot => formatInteger(slot.choices)).join(' × ') +
        ` = ${formatCount(report.combinations)} ≈ 2`,
        power
    );
}

function renderNotes(options: SiteOptions): void {
    const bitsFor = (wordlist: WordlistId, adverb: boolean): number =>
        generatorFor(wordlist).describeStrength({ ...sentenceOptions(options), adverb }).entropyBits;

    const wordlistDelta = formatDecimal(bitsFor('main', options.adverb) - bitsFor('kids', options.adverb));
    const wordlistNote = byId('wordlistNote');
    wordlistNote.textContent = options.wordlist === 'kids'
        ? `Einfachere Wörter, dafür ${wordlistDelta} Bit schwächer als die Standardliste.`
        : `Die Kinderliste hat einfachere Wörter, ist aber ${wordlistDelta} Bit schwächer.`;
    wordlistNote.classList.toggle('is-warning', options.wordlist === 'kids');

    const lengthDelta = formatDecimal(bitsFor(options.wordlist, true) - bitsFor(options.wordlist, false));
    const lengthNote = byId('lengthNote');
    lengthNote.textContent = options.adverb
        ? `Ohne Adverb ist das Passwort ${lengthDelta} Bit schwächer.`
        : `Ohne Adverb ${lengthDelta} Bit schwächer.`;
    lengthNote.classList.toggle('is-warning', !options.adverb);
}

// ---------------------------------------------------------------------------
// Options form

function choice(name: string, value: string, text: string, accessibleName?: string, textIsName = false): HTMLLabelElement {
    const label = el('label', { className: 'choice' });
    const input = el('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    if (accessibleName) {
        input.setAttribute('aria-label', accessibleName);
    }
    label.append(input, el('span', { text, className: textIsName ? 'symbol-name' : undefined }));
    return label;
}

function buildChoices(): void {
    const digits = byId('digitChoices');
    for (let n = 0; n <= MAX_DIGITS; n++) {
        digits.append(choice('digits', String(n), String(n)));
    }

    const separators = byId('separatorChoices');
    for (const separator of SEPARATOR_CHOICES) {
        const name = SYMBOL_NAMES[separator] ?? separator;
        separators.append(separator === ' '
            ? choice('separator', separator, name, undefined, true)
            : choice('separator', separator, separator, `${name} (${separator})`));
    }

    const symbols = byId('symbolChoices');
    for (const symbol of TRAILING_SYMBOL_CHOICES) {
        const name = SYMBOL_NAMES[symbol] ?? symbol;
        symbols.append(symbol === ''
            ? choice('trailingSymbol', symbol, name, undefined, true)
            : choice('trailingSymbol', symbol, symbol, `${name} (${symbol})`));
    }
}

function setRadio(form: HTMLFormElement, name: string, value: string): void {
    const input = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${CSS.escape(value)}"]`);
    if (input) {
        input.checked = true;
    }
}

function writeForm(form: HTMLFormElement, options: SiteOptions): void {
    setRadio(form, 'wordlist', options.wordlist);
    setRadio(form, 'length', options.adverb ? 'normal' : 'short');
    setRadio(form, 'digits', String(options.digits));
    setRadio(form, 'separator', options.separator);
    setRadio(form, 'trailingSymbol', options.trailingSymbol);
}

function readForm(form: HTMLFormElement): SiteOptions {
    const data = new FormData(form);
    return sanitizeOptions({
        wordlist: data.get('wordlist'),
        adverb: data.get('length') !== 'short',
        digits: Number(data.get('digits')),
        separator: data.get('separator'),
        trailingSymbol: data.get('trailingSymbol')
    });
}

// ---------------------------------------------------------------------------
// Copy

function initCopy(getPassword: () => string): { reset: () => void } {
    const button = byId<HTMLButtonElement>('copyBtn');
    const status = byId('copyStatus');
    let timer: number | undefined;

    const reset = (): void => {
        window.clearTimeout(timer);
        button.textContent = 'Kopieren';
        button.classList.remove('is-done');
        status.textContent = '';
    };

    button.addEventListener('click', async () => {
        reset();
        try {
            if (!navigator.clipboard) {
                throw new Error('no clipboard');
            }
            await navigator.clipboard.writeText(getPassword());
            button.textContent = 'Kopiert';
            button.classList.add('is-done');
            status.textContent = 'Das Passwort ist in der Zwischenablage.';
            timer = window.setTimeout(reset, 2500);
        } catch {
            const range = document.createRange();
            range.selectNodeContents(byId('password'));
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            status.textContent = 'Kopieren ging nicht automatisch. Das Passwort ist markiert: mit Strg+C kopieren.';
        }
    });

    return { reset };
}

// ---------------------------------------------------------------------------
// Start

function init(): void {
    initTheme();
    byId('attribution').textContent = WORDLIST_ATTRIBUTION + ' ';

    const form = byId<HTMLFormElement>('options');
    buildChoices();

    let options = parseStoredOptions(readStorage(OPTIONS_KEY));
    let password = '';
    const copy = initCopy(() => password);

    const regenerate = (): void => {
        const result = generatorFor(options.wordlist).generate(sentenceOptions(options));
        password = result.password;
        renderPassword(result);
        copy.reset();
    };

    const update = (): void => {
        writeForm(form, options);
        renderStrength(generatorFor(options.wordlist).describeStrength(sentenceOptions(options)));
        renderNotes(options);
        regenerate();
    };

    const ruler = byId('ruler');
    form.addEventListener('change', () => {
        // Animate the strength marker for changes, not on page load
        ruler.classList.add('is-live');
        options = readForm(form);
        writeStorage(OPTIONS_KEY, JSON.stringify(options));
        update();
    });
    form.addEventListener('submit', event => event.preventDefault());
    byId('resetBtn').addEventListener('click', () => {
        options = DEFAULT_OPTIONS;
        writeStorage(OPTIONS_KEY, JSON.stringify(options));
        update();
    });
    byId('regenerateBtn').addEventListener('click', regenerate);

    update();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
