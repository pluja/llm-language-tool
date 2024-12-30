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
        this.languages = this.languages.filter(l => l !== language);
        this.saveLanguages();
        this.updateLanguageList();
        this.updateLanguageSelects();
    }

    updateLanguageList() {
        this.languageList.innerHTML = '';
        this.languages.forEach(lang => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-2 border-b';
            div.innerHTML = `
        <span>${lang}</span>
        <button class="text-red-500 hover:text-red-700" onclick="languageManager.removeLanguage('${lang}')">Remove</button>
      `;
            this.languageList.appendChild(div);
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

        // Add language options
        this.languages.forEach(lang => {
            const inputOption = new Option(lang, lang.toLowerCase());
            const outputOption = new Option(lang, lang.toLowerCase());
            this.inputLanguageSelect.add(inputOption);
            this.outputLanguageSelect.add(outputOption);
        });

        // Restore previously selected values if they still exist
        if (this.languages.map(l => l.toLowerCase()).includes(currentInputVal)) {
            this.inputLanguageSelect.value = currentInputVal;
        }
        if (this.languages.map(l => l.toLowerCase()).includes(currentOutputVal)) {
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