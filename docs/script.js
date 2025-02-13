"use strict";
(() => {
  // node_modules/ger-morph-pw-gen/GermanMorphDict.js
  var __awaiter = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
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
     * Returns a promise that resolves when the dictionary is fully loaded
     */
    waitForReady() {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.initialized;
      });
    }
    constructor(dictData, progressCallback) {
      this.dictionary = /* @__PURE__ */ new Map();
      this.totalEntries = 0;
      this.initialized = (() => __awaiter(this, void 0, void 0, function* () {
        if (dictData instanceof Response) {
          yield this.loadDictFromResponse(dictData, progressCallback);
        } else {
          this.loadDict(dictData, progressCallback);
        }
      }))();
    }
    loadDictFromResponse(response, progressCallback) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!response.body) {
          throw new Error("Response body is null");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let totalBytes = +(response.headers.get("content-length") || 0);
        let loadedBytes = 0;
        while (true) {
          const { done, value } = yield reader.read();
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
              // Using bytes as proxy for lines
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
      });
    }
    loadDict(dictData, progressCallback) {
      this.processChunk(dictData, true);
      if (progressCallback) {
        progressCallback({
          totalLines: dictData.split("\n").length,
          processedLines: dictData.split("\n").length,
          percentage: 100
        });
      }
    }
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
          const analysisParts = parts[1].split(",");
          const category = analysisParts[0];
          const attributes = analysisParts.slice(1);
          currentAnalyses.push({
            lemma: parts[0],
            category,
            attributes
          });
        }
      }
      if (isLastChunk) {
        this.addCurrentWordToDictionary(currentWord, currentAnalyses);
      }
    }
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
    *filterWordsGenerator(regex, categories) {
      let processedWords = 0;
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
    filterWords(regex, categories, progressCallback) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.initialized;
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
      });
    }
    combineFilters(regex, categories, progressCallback) {
      return __awaiter(this, void 0, void 0, function* () {
        return yield this.filterWords(regex, categories, progressCallback);
      });
    }
    getDictionary() {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.initialized;
        const result = [];
        for (const entries of this.dictionary.values()) {
          result.push(...entries);
        }
        return result;
      });
    }
  };

  // node_modules/ger-morph-pw-gen/PasswordGenerator.js
  var __awaiter2 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var PasswordMode;
  (function(PasswordMode2) {
    PasswordMode2["SIMPLE"] = "simple";
    PasswordMode2["STRONG"] = "strong";
  })(PasswordMode || (PasswordMode = {}));
  var PasswordGenerator = class {
    constructor(dict) {
      this.SPECIAL_CHARS = ["$", "!", "+"];
      this.FILTERED_CHARS = /* @__PURE__ */ new Set(["\xC4", "\xE4", "\xD6", "\xF6", "\xDC", "\xFC", "\u1E9E", "\xDF", "Y", "y", "Z", "z"]);
      this.dict = dict;
    }
    getRandomItem(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }
    getRandomDigits(length) {
      return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
    }
    getFilteredWords() {
      return __awaiter2(this, void 0, void 0, function* () {
        const nouns = yield this.dict.filterWords(void 0, [WordCategory.NOUN]);
        const nomSingNouns = nouns.filter((entry) => entry.analysis.attributes.includes("nom") && entry.analysis.attributes.includes("sing"));
        const adjectives = yield this.dict.filterWords(void 0, [WordCategory.ADJECTIVE]);
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
      });
    }
    filterStrongWords(words) {
      return words.filter((entry) => {
        const word = entry.word;
        for (const char of this.FILTERED_CHARS) {
          if (word.includes(char))
            return false;
        }
        return /[SsIiTt]/.test(word);
      });
    }
    replaceSpecialChar(word) {
      const charMap = {
        "S": "$",
        "s": "$",
        "I": "!",
        "i": "!",
        "T": "+",
        "t": "+"
      };
      const matches = word.match(/[SsIiTt]/g);
      if (!matches)
        return word;
      const charToReplace = this.getRandomItem(matches);
      return word.replace(charToReplace, charMap[charToReplace]);
    }
    generatePassword(mode) {
      return __awaiter2(this, void 0, void 0, function* () {
        const { adjByGender, nounsByGender } = yield this.getFilteredWords();
        const gender = this.getRandomItem(["masc", "fem", "neut"]);
        let adjectives = adjByGender[gender];
        let nouns = nounsByGender[gender];
        if (mode === PasswordMode.STRONG) {
          adjectives = this.filterStrongWords(adjectives);
          nouns = this.filterStrongWords(nouns);
        }
        if (!(adjectives === null || adjectives === void 0 ? void 0 : adjectives.length) || !(nouns === null || nouns === void 0 ? void 0 : nouns.length)) {
          throw new Error(`No valid words found for gender: ${gender}`);
        }
        const adj = this.getRandomItem(adjectives);
        const noun = this.getRandomItem(nouns);
        let password = adj.word + noun.word;
        if (mode === PasswordMode.STRONG) {
          password = this.replaceSpecialChar(password);
          password += this.getRandomDigits(2);
        }
        return password;
      });
    }
    generatePasswords(mode_1) {
      return __awaiter2(this, arguments, void 0, function* (mode, count = 10) {
        const passwords = [];
        const usedCombos = /* @__PURE__ */ new Set();
        for (let i = 0; i < count * 3 && passwords.length < count; i++) {
          try {
            const password = yield this.generatePassword(mode);
            if (!usedCombos.has(password)) {
              usedCombos.add(password);
              passwords.push(password);
            }
          } catch (error) {
            console.error("Error generating password:", error);
          }
        }
        return passwords;
      });
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
  var fullDictBtn = document.getElementById("fullDict");
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
