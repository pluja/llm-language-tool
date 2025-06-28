'use strict';

class LanguageManager {
    constructor() {
        this.languages = JSON.parse(localStorage.getItem('languages')) || ['English', 'Spanish', 'French', 'German', 'Italian'];
        this.initializeUI();
    }

    initializeUI() {
        this.languageList = document.getElementById('languageList');
        this.inputLanguageSelect = document.getElementById('inputLanguage');
        this.outputLanguageSelect = document.getElementById('outputLanguage');
        this.newLanguageInput = document.getElementById('newLanguage');
        this.addLanguageBtn = document.getElementById('addLanguage');

        this.bindEvents();
        this.updateLanguageList();
        this.updateLanguageSelects();
    }

    bindEvents() {
        this.addLanguageBtn.addEventListener('click', () => {
            const newLang = this.newLanguageInput.value.trim();
            if (this.addLanguage(newLang)) {
                this.newLanguageInput.value = '';
            }
        });

        // Delegate remove buttons click handling to the list container
        this.languageList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-lang]');
            if (!btn) return;
            const lang = btn.dataset.lang;
            this.removeLanguage(lang);
        });
    }

    addLanguage(language) {
        if (language && !this.languages.includes(language)) {
            this.languages.push(language);
            this.saveLanguages();
            this.updateLanguageList();
            this.updateLanguageSelects();
            return true;
        }
        return false;
    }

    removeLanguage(language) {
        this.languages = this.languages.filter((l) => l !== language);
        this.saveLanguages();
        this.updateLanguageList();
        this.updateLanguageSelects();
    }

    updateLanguageList() {
        this.languageList.innerHTML = '';
        this.languages.forEach((lang) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex justify-between items-center p-2 border-b';

            const span = document.createElement('span');
            span.textContent = lang;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-red-500 hover:text-red-700';
            removeBtn.dataset.lang = lang;
            removeBtn.textContent = 'Remove';

            wrapper.appendChild(span);
            wrapper.appendChild(removeBtn);
            this.languageList.appendChild(wrapper);
        });
    }

    updateLanguageSelects() {
        const currentInputVal = this.inputLanguageSelect.value;
        const currentOutputVal = this.outputLanguageSelect.value;

        // Clear existing options except "Auto Detect" for input
        while (this.inputLanguageSelect.options.length > 1) {
            this.inputLanguageSelect.remove(1);
        }
        this.outputLanguageSelect.innerHTML = '';

        this.languages.forEach((lang) => {
            const value = lang.toLowerCase();
            const inputOption = new Option(lang, value);
            const outputOption = new Option(lang, value);
            this.inputLanguageSelect.add(inputOption);
            this.outputLanguageSelect.add(outputOption);
        });

        if (this.languages.map((l) => l.toLowerCase()).includes(currentInputVal)) {
            this.inputLanguageSelect.value = currentInputVal;
        }
        if (this.languages.map((l) => l.toLowerCase()).includes(currentOutputVal)) {
            this.outputLanguageSelect.value = currentOutputVal;
        }
    }

    saveLanguages() {
        localStorage.setItem('languages', JSON.stringify(this.languages));
    }

    getLanguages() {
        return this.languages;
    }
}

const languageManager = new LanguageManager();