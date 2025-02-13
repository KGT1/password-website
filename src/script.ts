import { GermanMorphDict } from 'ger-morph-pw-gen/GermanMorphDict';
import { PasswordGenerator, PasswordMode } from 'ger-morph-pw-gen/PasswordGenerator';

// Dictionary URLs
const DICT_URLS = {
    light: 'https://raw.githubusercontent.com/KGT1/german-morph-filter/refs/heads/master/data/output/whitelist_dict.txt',
    filtered: 'https://raw.githubusercontent.com/KGT1/german-morph-filter/refs/heads/master/data/output/DE_morph_dict_filtered.txt'
};

// UI Elements
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const passwordDisplay = document.getElementById('password') as HTMLDivElement;
const modeToggle = document.getElementById('modeToggle') as HTMLButtonElement;
const regenerateBtn = document.getElementById('regenerateBtn') as HTMLButtonElement;
const lightDictBtn = document.getElementById('lightDict') as HTMLButtonElement;
const filteredDictBtn = document.getElementById('filteredDict') as HTMLButtonElement;
const loadingElement = document.getElementById('loading') as HTMLDivElement;
const progressElement = document.getElementById('progress') as HTMLDivElement;
const errorElement = document.getElementById('error') as HTMLDivElement;

// State
let currentMode = PasswordMode.STRONG;
let currentGenerator: PasswordGenerator | null = null;
// Theme state management
let isDarkMode = localStorage.getItem('theme') === 'dark' || 
    (localStorage.getItem('theme') === null && window.matchMedia('(prefers-color-scheme: dark)').matches);

// Theme Functions
function toggleTheme(): void {
    isDarkMode = !isDarkMode;
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    themeToggle.innerHTML = isDarkMode ? '☀️ Tagmodus' : '🌙 Nachtmodus';
}

// Initialize theme
function initializeTheme(): void {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    themeToggle.innerHTML = isDarkMode ? '☀️ Tagmodus' : '🌙 Nachtmodus';

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('theme') === null) {  // Only auto-switch if user hasn't manually set a preference
            isDarkMode = e.matches;
            document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
            themeToggle.innerHTML = isDarkMode ? '☀️ Tagmodus' : '🌙 Nachtmodus';
        }
    });
}

// UI Update Functions
function updateModeDisplay(): void {
    const currentModeDisplay = document.getElementById('currentMode') as HTMLSpanElement;
    currentModeDisplay.textContent = `(Aktuell: ${currentMode === PasswordMode.SIMPLE ? 'Einfacher Modus' : 'Sicherer Modus'})`;
    modeToggle.textContent = currentMode === PasswordMode.SIMPLE ? 'Einfacher Modus' : 'Sicherer Modus';
}

function updateDictDisplay(type: 'light' | 'filtered'): void {
    const currentDictDisplay = document.getElementById('currentDict') as HTMLSpanElement;
    currentDictDisplay.textContent = `(Aktuell: ${type === 'light' ? 'Leicht' : 'Normal'})`;
}

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
    updateModeDisplay();
    updatePassword();
});

regenerateBtn.addEventListener('click', updatePassword);

lightDictBtn.addEventListener('click', () => {
    loadDictionary(DICT_URLS.light);
    [lightDictBtn, filteredDictBtn].forEach(btn => btn.classList.remove('active'));
    lightDictBtn.classList.add('active');
    updateDictDisplay('light');
});

filteredDictBtn.addEventListener('click', () => {
    loadDictionary(DICT_URLS.filtered);
    [lightDictBtn, filteredDictBtn].forEach(btn => btn.classList.remove('active'));
    filteredDictBtn.classList.add('active');
    updateDictDisplay('filtered');
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadDictionary(DICT_URLS.light); // Start with light dictionary
    lightDictBtn.classList.add('active');
    updateModeDisplay();
    updateDictDisplay('light');
    initializeTheme();
});

// Theme toggle event listener
themeToggle.addEventListener('click', toggleTheme);
