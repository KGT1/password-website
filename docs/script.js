"use strict";
(() => {
  // node_modules/ger-morph-pw-gen/GermanMorphDict.js
  var WordCategory;
  (function(WordCategory2) {
    WordCategory2["VERB"] = "V";
    WordCategory2["ADJECTIVE"] = "ADJ";
    WordCategory2["ADVERB"] = "ADV";
    WordCategory2["ARTICLE"] = "ART";
    WordCategory2["CARDINAL"] = "CARD";
    WordCategory2["CIRCUMPOSITION"] = "CIRCP";
    WordCategory2["CONJUNCTION"] = "CONJ";
    WordCategory2["DEMONSTRATIVE"] = "DEMO";
    WordCategory2["INDEFINITE"] = "INDEF";
    WordCategory2["INTERJECTION"] = "INTJ";
    WordCategory2["ORDINAL"] = "ORD";
    WordCategory2["NOUN"] = "NN";
    WordCategory2["PROPER_NOUN"] = "NNP";
    WordCategory2["POSSESSIVE"] = "POSS";
    WordCategory2["POSTPOSITION"] = "POSTP";
    WordCategory2["PRONOUN"] = "PRP";
    WordCategory2["PREPOSITION"] = "PREP";
    WordCategory2["PREPOSITION_ARTICLE"] = "PREPART";
    WordCategory2["PRONOMINAL_ADVERB"] = "PROADV";
    WordCategory2["PARTICLE"] = "PRTKL";
    WordCategory2["RELATIVE"] = "REL";
    WordCategory2["TRUNCATED"] = "TRUNC";
    WordCategory2["VERB_PARTICLE"] = "VPART";
    WordCategory2["WH_ADVERB"] = "WPADV";
    WordCategory2["WH_PRONOUN"] = "WPRO";
    WordCategory2["ZU"] = "ZU";
  })(WordCategory || (WordCategory = {}));
  var GermanMorphDict = class {
    /**
     * Creates a new German morphological dictionary instance
     * @param dictData - Dictionary data as string or Response object
     * @param progressCallback - Optional callback for loading progress updates
     */
    constructor(dictData, progressCallback) {
      this.dictionary = /* @__PURE__ */ new Map();
      this.totalEntries = 0;
      this.initialized = (async () => {
        if (dictData instanceof Response) {
          await this.loadDictFromResponse(dictData, progressCallback);
        } else {
          this.loadDict(dictData, progressCallback);
        }
      })();
    }
    /**
     * Waits for the dictionary to be fully loaded
     * @returns Promise that resolves when dictionary is ready
     */
    async waitForReady() {
      await this.initialized;
    }
    /**
     * Loads dictionary data from a Response object (e.g., fetch response)
     * @param response - Response object containing dictionary data
     * @param progressCallback - Optional callback for loading progress updates
     * @throws Error if response body is null or data is invalid
     */
    async loadDictFromResponse(response, progressCallback) {
      if (!response.body) {
        throw new Error("Response body is null");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const totalBytes = Number(response.headers.get("content-length") || 0);
      let loadedBytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            this.processChunk(buffer, true);
            break;
          }
          loadedBytes += value.length;
          buffer += decoder.decode(value, { stream: true });
          const lastNewline = buffer.lastIndexOf("\n");
          if (lastNewline !== -1) {
            const completeLines = buffer.slice(0, lastNewline);
            buffer = buffer.slice(lastNewline + 1);
            this.processChunk(completeLines, false);
          }
          if (progressCallback && totalBytes > 0) {
            progressCallback({
              totalLines: totalBytes,
              processedLines: loadedBytes,
              percentage: loadedBytes / totalBytes * 100
            });
          }
        }
        if (progressCallback) {
          progressCallback({
            totalLines: totalBytes,
            processedLines: totalBytes,
            percentage: 100
          });
        }
      } catch (error) {
        throw new Error(`Failed to load dictionary: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    /**
     * Loads dictionary data from a string
     * @param dictData - String containing dictionary data
     * @param progressCallback - Optional callback for loading progress updates
     */
    loadDict(dictData, progressCallback) {
      this.processChunk(dictData, true);
      const totalLines = dictData.split("\n").length;
      if (progressCallback) {
        progressCallback({
          totalLines,
          processedLines: totalLines,
          percentage: 100
        });
      }
    }
    /**
     * Processes a chunk of dictionary data
     * @param chunk - String chunk of dictionary data
     * @param isLastChunk - Whether this is the final chunk
     */
    processChunk(chunk, isLastChunk) {
      const lines = chunk.split("\n");
      let currentWord = null;
      let currentAnalyses = [];
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine)
          continue;
        if (!trimmedLine.includes(",")) {
          this.addCurrentWordToDictionary(currentWord, currentAnalyses);
          currentWord = trimmedLine;
          currentAnalyses = [];
        } else {
          const parts = trimmedLine.split(" ");
          if (parts.length < 2)
            continue;
          const lemma = parts[0];
          if (!lemma)
            continue;
          const analysis = parts[1];
          if (!analysis)
            continue;
          const analysisParts = analysis.split(",");
          if (!analysisParts.length)
            continue;
          const category = analysisParts[0];
          if (!Object.values(WordCategory).includes(category))
            continue;
          currentAnalyses.push({
            lemma,
            category,
            attributes: analysisParts.slice(1)
          });
        }
      }
      if (isLastChunk) {
        this.addCurrentWordToDictionary(currentWord, currentAnalyses);
      }
    }
    /**
     * Adds a word and its analyses to the dictionary
     * @param currentWord - Word to add
     * @param currentAnalyses - Array of morphological analyses for the word
     */
    addCurrentWordToDictionary(currentWord, currentAnalyses) {
      if (currentWord && currentAnalyses.length > 0) {
        const entries = currentAnalyses.map((analysis) => ({
          word: currentWord,
          analysis
        }));
        this.dictionary.set(currentWord, entries);
        this.totalEntries += entries.length;
      }
    }
    /**
     * Generator function that yields filtered word entries
     * @param regex - Optional regex pattern to filter words
     * @param categories - Optional array of word categories to filter by
     * @yields WordEntry objects matching the filter criteria
     */
    *filterWordsGenerator(regex, categories) {
      for (const [word, entries] of this.dictionary) {
        if (regex && !regex.test(word))
          continue;
        for (const entry of entries) {
          if (!categories || categories.includes(entry.analysis.category)) {
            yield entry;
          }
        }
      }
    }
    /**
     * Filters dictionary entries based on regex pattern and/or word categories
     * @param regex - Optional regex pattern to filter words
     * @param categories - Optional array of word categories to filter by
     * @param progressCallback - Optional callback for filtering progress updates
     * @returns Promise resolving to array of filtered word entries
     */
    async filterWords(regex, categories, progressCallback) {
      await this.initialized;
      const result = [];
      const generator = this.filterWordsGenerator(regex, categories);
      let processedEntries = 0;
      for (const entry of generator) {
        result.push(entry);
        processedEntries++;
        if (progressCallback && processedEntries % 1e3 === 0) {
          progressCallback({
            processedEntries,
            totalEntries: this.totalEntries,
            percentage: processedEntries / this.totalEntries * 100
          });
        }
      }
      if (progressCallback) {
        progressCallback({
          processedEntries: this.totalEntries,
          totalEntries: this.totalEntries,
          percentage: 100
        });
      }
      return result;
    }
    /**
     * Alias for filterWords method
     * @deprecated Use filterWords instead
     */
    async combineFilters(regex, categories, progressCallback) {
      return this.filterWords(regex, categories, progressCallback);
    }
    /**
     * Gets all entries in the dictionary
     * @returns Promise resolving to array of all word entries
     */
    async getDictionary() {
      await this.initialized;
      const result = [];
      for (const entries of this.dictionary.values()) {
        result.push(...entries);
      }
      return result;
    }
  };

  // node_modules/ger-morph-pw-gen/PasswordGenerator.js
  var PasswordMode;
  (function(PasswordMode2) {
    PasswordMode2["SIMPLE"] = "simple";
    PasswordMode2["STRONG"] = "strong";
  })(PasswordMode || (PasswordMode = {}));
  var SPECIAL_CHAR_MAP = {
    "S": "$",
    "s": "$",
    "I": "!",
    "i": "!",
    "T": "+",
    "t": "+"
  };
  var STRONG_MODE_FILTERED_CHARS = /* @__PURE__ */ new Set([
    "\xC4",
    "\xE4",
    "\xD6",
    "\xF6",
    "\xDC",
    "\xFC",
    "\u1E9E",
    "\xDF",
    "Y",
    "y",
    "Z",
    "z"
  ]);
  var PasswordGenerator = class {
    /**
     * Creates a new password generator instance
     * @param dict - German morphological dictionary instance
     */
    constructor(dict) {
      this.dict = dict;
    }
    /**
     * Gets a random item from an array
     * @param arr - Array to select from
     * @returns Random item from the array
     * @throws Error if array is empty
     */
    getRandomItem(arr) {
      if (!arr.length) {
        throw new Error("Cannot get random item from empty array");
      }
      const index = Math.floor(Math.random() * arr.length);
      return arr[index];
    }
    /**
     * Generates a string of random digits
     * @param length - Number of digits to generate
     * @returns String of random digits
     */
    getRandomDigits(length) {
      return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
    }
    /**
     * Retrieves and filters words from the dictionary based on grammatical criteria
     * @returns Promise resolving to filtered adjectives and nouns grouped by gender
     */
    async getFilteredWords() {
      const nouns = await this.dict.filterWords(void 0, [WordCategory.NOUN]);
      const nomSingNouns = nouns.filter((entry) => entry.analysis.attributes.includes("nom") && entry.analysis.attributes.includes("sing"));
      const adjectives = await this.dict.filterWords(void 0, [WordCategory.ADJECTIVE]);
      const baseFilteredAdj = adjectives.filter((entry) => entry.analysis.attributes.includes("pos") && entry.analysis.attributes.includes("nom") && entry.analysis.attributes.includes("sing"));
      const nounsByGender = {
        masc: nomSingNouns.filter((n) => n.analysis.attributes.includes("masc")),
        fem: nomSingNouns.filter((n) => n.analysis.attributes.includes("fem")),
        neut: nomSingNouns.filter((n) => n.analysis.attributes.includes("neut"))
      };
      const adjByGender = {
        masc: baseFilteredAdj.filter((a) => a.analysis.attributes.includes("masc") && a.analysis.attributes.includes("strong")),
        fem: baseFilteredAdj.filter((a) => a.analysis.attributes.includes("fem")),
        neut: baseFilteredAdj.filter((a) => a.analysis.attributes.includes("neut") && a.analysis.attributes.includes("strong"))
      };
      return { adjByGender, nounsByGender };
    }
    /**
     * Filters words to ensure they meet strong password criteria
     * @param words - Array of word entries to filter
     * @returns Filtered array of word entries suitable for strong passwords
     */
    filterStrongWords(words) {
      return words.filter((entry) => {
        const word = entry.word;
        if ([...STRONG_MODE_FILTERED_CHARS].some((char) => word.includes(char))) {
          return false;
        }
        return Object.keys(SPECIAL_CHAR_MAP).some((char) => word.includes(char));
      });
    }
    /**
     * Gets filtered words based on the password mode
     * @param words - Array of word entries to filter
     * @param mode - Password generation mode
     * @returns Filtered array of word entries
     */
    getWordsByMode(words, mode) {
      if (mode === PasswordMode.STRONG) {
        return this.filterStrongWords(words);
      }
      return [...words];
    }
    /**
     * Replaces a random eligible character with its special character equivalent
     * @param word - Word to process
     * @returns Word with one special character substitution
     */
    replaceSpecialChar(word) {
      const eligibleChars = word.match(/[SsIiTt]/g);
      if (!eligibleChars)
        return word;
      const charToReplace = this.getRandomItem(eligibleChars);
      const replacement = SPECIAL_CHAR_MAP[charToReplace];
      if (!replacement)
        return word;
      return word.replace(charToReplace, replacement);
    }
    /**
     * Generates a single password
     * @param mode - Password generation mode
     * @returns Promise resolving to generated password
     * @throws Error if no valid words are found or if word filtering fails
     */
    async generatePassword(mode) {
      const { adjByGender, nounsByGender } = await this.getFilteredWords();
      const gender = this.getRandomItem(["masc", "fem", "neut"]);
      let adjectives = adjByGender[gender];
      let nouns = nounsByGender[gender];
      if (!adjectives?.length || !nouns?.length) {
        throw new Error(`No valid words found for gender: ${gender}`);
      }
      adjectives = this.getWordsByMode(adjectives, mode);
      nouns = this.getWordsByMode(nouns, mode);
      if (!adjectives.length || !nouns.length) {
        throw new Error(`No valid words found for gender: ${gender} in ${mode} mode`);
      }
      const adj = this.getRandomItem(adjectives);
      const noun = this.getRandomItem(nouns);
      let password = adj.word + noun.word;
      if (mode === PasswordMode.STRONG) {
        password = this.replaceSpecialChar(password);
        password += this.getRandomDigits(2);
      }
      return password;
    }
    /**
     * Generates multiple unique passwords
     * @param mode - Password generation mode
     * @param count - Number of passwords to generate (default: 10)
     * @returns Promise resolving to array of unique passwords
     */
    async generatePasswords(mode, count = 10) {
      if (count < 1) {
        throw new Error("Password count must be greater than 0");
      }
      const passwords = [];
      const usedCombos = /* @__PURE__ */ new Set();
      const maxAttempts = count * 3;
      for (let attempts = 0; attempts < maxAttempts && passwords.length < count; attempts++) {
        try {
          const password = await this.generatePassword(mode);
          if (!usedCombos.has(password)) {
            usedCombos.add(password);
            passwords.push(password);
          }
        } catch (error) {
          console.error("Error generating password:", error instanceof Error ? error.message : "Unknown error");
        }
      }
      if (!passwords.length) {
        throw new Error("Failed to generate any valid passwords");
      }
      return passwords;
    }
  };

  // src/script.ts
  var DICT_URLS = {
    light: "https://raw.githubusercontent.com/KGT1/german-morph-filter/refs/heads/master/data/output/whitelist_dict.txt",
    filtered: "https://raw.githubusercontent.com/KGT1/german-morph-filter/refs/heads/master/data/output/DE_morph_dict_filtered.txt"
  };
  var themeToggle = document.getElementById("themeToggle");
  var passwordDisplay = document.getElementById("password");
  var modeToggle = document.getElementById("modeToggle");
  var regenerateBtn = document.getElementById("regenerateBtn");
  var lightDictBtn = document.getElementById("lightDict");
  var filteredDictBtn = document.getElementById("filteredDict");
  var loadingElement = document.getElementById("loading");
  var progressElement = document.getElementById("progress");
  var errorElement = document.getElementById("error");
  var currentMode = PasswordMode.STRONG;
  var currentGenerator = null;
  var isDarkMode = localStorage.getItem("theme") === "dark" || localStorage.getItem("theme") === null && window.matchMedia("(prefers-color-scheme: dark)").matches;
  function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    themeToggle.innerHTML = isDarkMode ? "\u2600\uFE0F Tagmodus" : "\u{1F319} Nachtmodus";
  }
  function initializeTheme() {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    themeToggle.innerHTML = isDarkMode ? "\u2600\uFE0F Tagmodus" : "\u{1F319} Nachtmodus";
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (localStorage.getItem("theme") === null) {
        isDarkMode = e.matches;
        document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
        themeToggle.innerHTML = isDarkMode ? "\u2600\uFE0F Tagmodus" : "\u{1F319} Nachtmodus";
      }
    });
  }
  function updateModeDisplay() {
    const currentModeDisplay = document.getElementById("currentMode");
    currentModeDisplay.textContent = `(Aktuell: ${currentMode === PasswordMode.SIMPLE ? "Einfacher Modus" : "Sicherer Modus"})`;
    modeToggle.textContent = currentMode === PasswordMode.SIMPLE ? "Einfacher Modus" : "Sicherer Modus";
  }
  function updateDictDisplay(type) {
    const currentDictDisplay = document.getElementById("currentDict");
    currentDictDisplay.textContent = `(Aktuell: ${type === "light" ? "Leicht" : "Normal"})`;
  }
  async function updatePassword() {
    if (!currentGenerator) return;
    try {
      const password = await currentGenerator.generatePassword(currentMode);
      passwordDisplay.textContent = password;
    } catch (error) {
      showError(error.message);
    }
  }
  function showError(message) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
    setTimeout(() => {
      errorElement.classList.add("hidden");
    }, 5e3);
  }
  function updateLoadingProgress(progress) {
    progressElement.style.width = `${progress.percentage}%`;
  }
  function showLoading() {
    loadingElement.classList.remove("hidden");
  }
  function hideLoading() {
    loadingElement.classList.add("hidden");
  }
  async function loadDictionary(url) {
    showLoading();
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Fehler beim Laden des W\xF6rterbuchs");
      }
      const dict = new GermanMorphDict(response, updateLoadingProgress);
      await dict.waitForReady();
      currentGenerator = new PasswordGenerator(dict);
      await updatePassword();
    } catch (error) {
      showError(error.message);
    } finally {
      hideLoading();
    }
  }
  modeToggle.addEventListener("click", () => {
    currentMode = currentMode === PasswordMode.SIMPLE ? PasswordMode.STRONG : PasswordMode.SIMPLE;
    updateModeDisplay();
    updatePassword();
  });
  regenerateBtn.addEventListener("click", updatePassword);
  lightDictBtn.addEventListener("click", () => {
    loadDictionary(DICT_URLS.light);
    [lightDictBtn, filteredDictBtn].forEach((btn) => btn.classList.remove("active"));
    lightDictBtn.classList.add("active");
    updateDictDisplay("light");
  });
  filteredDictBtn.addEventListener("click", () => {
    loadDictionary(DICT_URLS.filtered);
    [lightDictBtn, filteredDictBtn].forEach((btn) => btn.classList.remove("active"));
    filteredDictBtn.classList.add("active");
    updateDictDisplay("filtered");
  });
  document.addEventListener("DOMContentLoaded", () => {
    loadDictionary(DICT_URLS.light);
    lightDictBtn.classList.add("active");
    updateModeDisplay();
    updateDictDisplay("light");
    initializeTheme();
  });
  themeToggle.addEventListener("click", toggleTheme);
})();
//# sourceMappingURL=script.js.map
