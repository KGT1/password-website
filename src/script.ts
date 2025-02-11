import { GermanMorphDict } from 'ger-morph-pw-gen/GermanMorphDict';
import { PasswordGenerator, PasswordMode } from 'ger-morph-pw-gen/PasswordGenerator';

// Dictionary URLs
const DICT_URLS = {
    light: 'https://github.com/KGT1/german-morph-filter/releases/download/v2025-01-23/whitelist_dict.txt',
    filtered: 'https://github.com/KGT1/german-morph-filter/releases/download/v2025-01-23/DE_morph_dict_filtered.txt',
    full: 'https://github.com/KGT1/german-morph-filter/releases/download/v2025-01-23/DE_morph_dict.txt'
};

// UI Elements
const passwordDisplay = document.getElementById('password') as HTMLDivElement;
const modeToggle = document.getElementById('modeToggle') as HTMLButtonElement;
const regenerateBtn = document.getElementById('regenerateBtn') as HTMLButtonElement;
const lightDictBtn = document.getElementById('lightDict') as HTMLButtonElement;
const filteredDictBtn = document.getElementById('filteredDict') as HTMLButtonElement;
const fullDictBtn = document.getElementById('fullDict') as HTMLButtonElement;
const loadingElement = document.getElementById('loading') as HTMLDivElement;
const progressElement = document.getElementById('progress') as HTMLDivElement;
const errorElement = document.getElementById('error') as HTMLDivElement;

// State
let currentMode = PasswordMode.SIMPLE;
let currentGenerator: PasswordGenerator | null = null;

// UI Functions
async function updatePassword(): Promise<void> {
    if (!currentGenerator) return;

    try {
        const password = await currentGenerator.generatePassword(currentMode);
        passwordDisplay.textContent = password;
    } catch (error) {
        showError((error as Error).message);
    }
}

function showError(message: string): void {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    setTimeout(() => {
        errorElement.classList.add('hidden');
    }, 5000);
}

function updateLoadingProgress(progress: { percentage: number }): void {
    progressElement.style.width = `${progress.percentage}%`;
}

function showLoading(): void {
    loadingElement.classList.remove('hidden');
}

function hideLoading(): void {
    loadingElement.classList.add('hidden');
}

async function loadDictionary(url: string): Promise<void> {
    showLoading();
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Fehler beim Laden des Wörterbuchs');
        }

        const dict = new GermanMorphDict(response, updateLoadingProgress);
        await dict.waitForReady();
        currentGenerator = new PasswordGenerator(dict);
        await updatePassword();
    } catch (error) {
        showError((error as Error).message);
    } finally {
        hideLoading();
    }
}

// Event Listeners
modeToggle.addEventListener('click', () => {
    currentMode = currentMode === PasswordMode.SIMPLE ? PasswordMode.STRONG : PasswordMode.SIMPLE;
    modeToggle.textContent = currentMode === PasswordMode.SIMPLE ? 'Einfacher Modus' : 'Sicherer Modus';
    updatePassword();
});

regenerateBtn.addEventListener('click', updatePassword);

lightDictBtn.addEventListener('click', () => {
    loadDictionary(DICT_URLS.light);
    [lightDictBtn, filteredDictBtn, fullDictBtn].forEach(btn => btn.classList.remove('active'));
    lightDictBtn.classList.add('active');
});

filteredDictBtn.addEventListener('click', () => {
    loadDictionary(DICT_URLS.filtered);
    [lightDictBtn, filteredDictBtn, fullDictBtn].forEach(btn => btn.classList.remove('active'));
    filteredDictBtn.classList.add('active');
});

fullDictBtn.addEventListener('click', () => {
    loadDictionary(DICT_URLS.full);
    [lightDictBtn, filteredDictBtn, fullDictBtn].forEach(btn => btn.classList.remove('active'));
    fullDictBtn.classList.add('active');
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadDictionary(DICT_URLS.filtered); // Start with filtered dictionary
    filteredDictBtn.classList.add('active');
});
