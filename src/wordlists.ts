/**
 * The bundled wordlists (copied from german-morph-filter with
 * `npm run sync-wordlists`, CC BY-SA 4.0). esbuild inlines the JSON into
 * docs/script.js, so the page never fetches anything at runtime.
 */
import { loadWordlist, Wordlist } from 'ger-morph-pw-gen/Wordlist';
import kidsData from './wordlists/wordlist_kids.json';
import mainData from './wordlists/wordlist_main.json';
import type { WordlistId } from './format';

const RAW: Readonly<Record<WordlistId, unknown>> = {
    main: mainData,
    kids: kidsData
};

const cache = new Map<WordlistId, Wordlist>();

/** Validated wordlist (validated once, then cached) */
export function getWordlist(id: WordlistId): Wordlist {
    let wordlist = cache.get(id);
    if (!wordlist) {
        wordlist = loadWordlist(RAW[id]);
        cache.set(id, wordlist);
    }
    return wordlist;
}

/** License of the wordlist data, e.g. "CC BY-SA 4.0" */
export const WORDLIST_LICENSE: string = mainData.license;

/** Attribution text shipped with the wordlists (identical for both lists) */
export const WORDLIST_ATTRIBUTION: string = mainData.attribution;
