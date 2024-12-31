class ConfigManager {
    constructor() {
        this.configKey = 'apiConfig';
        this.defaultConfig = {
            apiEndpoint: '',
            apiKey: '',
            modelId: '',
            pocketJsonEndpoint: 'https://pocketjson.pluja.dev',
            pocketJsonApiKey: ''
        };
        this.createToastElement();
        this.initializeConfigUI();
        this.handleUrlParams();
    }

    createToastElement() {
        // Remove existing toast if any
        const existingToast = document.getElementById('settings-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast element
        this.toast = document.createElement('div');
        this.toast.id = 'settings-toast';
        this.toast.className = 'fixed z-50 px-4 py-2 transition-all duration-300 transform translate-x-full rounded-lg shadow-lg opacity-0 top-4 right-4';
        document.body.insertBefore(this.toast, document.body.firstChild);
    }

    showToast(message, type = 'success') {
        if (!this.toast) {
            this.createToastElement();
        }

        // Set color based on type
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500'
        };

        // Reset any existing transition classes
        this.toast.className = `fixed top-4 right-4 py-2 px-4 rounded-lg shadow-lg transition-all duration-300 transform text-white ${colors[type]} translate-x-full opacity-0`;

        // Set content
        this.toast.textContent = message;

        // Force reflow
        void this.toast.offsetWidth;

        // Show toast
        requestAnimationFrame(() => {
            this.toast.classList.remove('translate-x-full', 'opacity-0');
        });

        // Hide toast after 3 seconds
        setTimeout(() => {
            this.toast.classList.add('translate-x-full', 'opacity-0');
        }, 3000);
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
        this.shareConfigBtn.className = 'w-full py-1 my-1 font-medium text-white transition-all bg-gray-600 rounded-lg hover:bg-gray-700';
        this.shareConfigBtn.textContent = 'Share Settings';
        this.saveConfigBtn.parentNode.appendChild(this.shareConfigBtn);
        this.pocketJsonEndpointInput = document.getElementById('pocketJsonEndpoint');
        this.pocketJsonApiKeyInput = document.getElementById('pocketJsonApiKey');

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
            this.pocketJsonEndpointInput.value = storedConfig.pocketJsonEndpoint || this.defaultConfig.pocketJsonEndpoint;
            this.pocketJsonApiKeyInput.value = storedConfig.pocketJsonApiKey || '';
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
            modelId: this.modelIdInput.value,
            pocketJsonEndpoint: this.pocketJsonEndpointInput.value || this.defaultConfig.pocketJsonEndpoint,
            pocketJsonApiKey: this.pocketJsonApiKeyInput.value
        };
        this.saveConfig(config);
        this.modal.classList.add('hidden');
        this.showToast('Settings saved successfully', 'success');
    }

    handleShareConfig() {
        const config = {
            apiEndpoint: this.apiEndpointInput.value,
            apiKey: this.apiKeyInput.value,
            modelId: this.modelIdInput.value,
            pocketJsonEndpoint: this.pocketJsonEndpointInput.value,
            pocketJsonApiKey: this.pocketJsonApiKeyInput.value,
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
                try {
                    // Save complete config
                    const fullConfig = {
                        apiEndpoint: config.apiEndpoint,
                        apiKey: config.apiKey,
                        modelId: config.modelId,
                        pocketJsonEndpoint: config.pocketJsonEndpoint || this.defaultConfig.pocketJsonEndpoint,
                        pocketJsonApiKey: config.pocketJsonApiKey || ''
                    };

                    // Save to localStorage
                    this.saveConfig(fullConfig);

                    // Update UI
                    this.loadStoredConfig();

                    // Import languages if present
                    if (config.languages && Array.isArray(config.languages)) {
                        localStorage.setItem('languages', JSON.stringify(config.languages));
                        // Reload language manager
                        languageManager.languages = config.languages;
                        languageManager.updateLanguageList();
                        languageManager.updateLanguageSelects();
                    }

                    const detailsText = details.join(', ');
                    this.showToast(`Settings imported successfully from URL`, 'success');

                    // Remove the config parameter from URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (error) {
                    console.error('Error importing settings:', error);
                    this.showToast('Error importing settings. Please try again.', 'error');
                }
            } else {
                this.showToast('Invalid configuration format', 'error');
            }
        }
    }

    validateConfig(config) {
        const hasRequiredFields = config.hasOwnProperty('apiEndpoint') &&
            config.hasOwnProperty('apiKey') &&
            config.hasOwnProperty('modelId');

        const hasValidPocketJson = !config.pocketJsonEndpoint || typeof config.pocketJsonEndpoint === 'string';
        const hasValidPocketJsonKey = !config.pocketJsonApiKey || typeof config.pocketJsonApiKey === 'string';

        const hasValidLanguages = !config.languages ||
            (Array.isArray(config.languages) &&
                config.languages.every(lang => typeof lang === 'string'));

        return hasRequiredFields && hasValidLanguages && hasValidPocketJson && hasValidPocketJsonKey;
    }
}

const configManager = new ConfigManager();