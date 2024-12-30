class ConfigManager {
    constructor() {
        this.configKey = 'apiConfig';
        this.defaultConfig = {
            apiEndpoint: '',
            apiKey: '',
            modelId: ''
        };
        this.initializeConfigUI();
        this.handleUrlParams();
    }

    initializeConfigUI() {
        this.modal = document.getElementById('modal');
        this.apiEndpointInput = document.getElementById('apiEndpoint');
        this.apiKeyInput = document.getElementById('apiKey');
        this.modelIdInput = document.getElementById('modelId');
        this.saveConfigBtn = document.getElementById('saveConfig');
        this.editConfigBtn = document.getElementById('editConfigBtn');

        this.shareConfigBtn = document.createElement('button');
        this.shareConfigBtn.id = 'shareConfig';
        this.shareConfigBtn.className = 'bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 ml-2';
        this.shareConfigBtn.textContent = 'Share Settings';
        this.saveConfigBtn.parentNode.appendChild(this.shareConfigBtn);

        this.loadStoredConfig();
        this.bindEvents();
    }

    loadStoredConfig() {
        const storedConfig = this.getConfig();
        if (!this.isConfigValid()) {
            this.modal.classList.remove('hidden');
        } else {
            this.apiEndpointInput.value = storedConfig.apiEndpoint;
            this.apiKeyInput.value = storedConfig.apiKey;
            this.modelIdInput.value = storedConfig.modelId;
        }
    }

    bindEvents() {
        this.editConfigBtn.addEventListener('click', () => this.modal.classList.remove('hidden'));
        this.saveConfigBtn.addEventListener('click', () => this.handleSaveConfig());
        this.shareConfigBtn.addEventListener('click', () => this.handleShareConfig());
    }

    handleSaveConfig() {
        const config = {
            apiEndpoint: this.apiEndpointInput.value,
            apiKey: this.apiKeyInput.value,
            modelId: this.modelIdInput.value
        };
        this.saveConfig(config);
        this.modal.classList.add('hidden');
    }

    handleShareConfig() {
        const config = {
            apiEndpoint: this.apiEndpointInput.value,
            apiKey: this.apiKeyInput.value,
            modelId: this.modelIdInput.value,
            languages: languageManager.getLanguages()
        };
        const encodedConfig = this.encodeConfig(config);
        const url = `${window.location.origin}${window.location.pathname}?config=${encodedConfig}`;

        navigator.clipboard.writeText(url).then(() => {
            alert('Settings URL copied to clipboard!');
        });
    }

    getConfig() {
        return JSON.parse(localStorage.getItem(this.configKey)) || this.defaultConfig;
    }

    saveConfig(config) {
        localStorage.setItem(this.configKey, JSON.stringify(config));
    }

    isConfigValid() {
        const config = this.getConfig();
        return config.apiEndpoint && config.apiKey && config.modelId;
    }

    encodeConfig(config) {
        return btoa(JSON.stringify(config));
    }

    decodeConfig(encodedConfig) {
        try {
            return JSON.parse(atob(encodedConfig));
        } catch (e) {
            console.error('Invalid config encoding');
            return null;
        }
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const encodedConfig = urlParams.get('config');

        if (encodedConfig) {
            const config = this.decodeConfig(encodedConfig);
            if (config && this.validateConfig(config)) {
                // Save API config
                const apiConfig = {
                    apiEndpoint: config.apiEndpoint,
                    apiKey: config.apiKey,
                    modelId: config.modelId
                };
                this.saveConfig(apiConfig);
                this.loadStoredConfig();

                // Import languages if present
                if (config.languages && Array.isArray(config.languages)) {
                    localStorage.setItem('languages', JSON.stringify(config.languages));
                    // Reload language manager
                    languageManager.languages = config.languages;
                    languageManager.updateLanguageList();
                    languageManager.updateLanguageSelects();
                }

                // Remove the config parameter from URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    validateConfig(config) {
        const hasRequiredFields = config.hasOwnProperty('apiEndpoint') &&
            config.hasOwnProperty('apiKey') &&
            config.hasOwnProperty('modelId');

        const hasValidLanguages = !config.languages ||
            (Array.isArray(config.languages) &&
                config.languages.every(lang => typeof lang === 'string'));

        return hasRequiredFields && hasValidLanguages;
    }
}

const configManager = new ConfigManager();