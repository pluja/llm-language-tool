class ConfigManager {
    constructor() {
        this.configKey = 'apiConfig';
        this.defaultConfig = {
            apiEndpoint: '',
            apiKey: '',
            modelId: ''
        };
        this.initializeConfigUI();
    }

    initializeConfigUI() {
        this.modal = document.getElementById('modal');
        this.apiEndpointInput = document.getElementById('apiEndpoint');
        this.apiKeyInput = document.getElementById('apiKey');
        this.modelIdInput = document.getElementById('modelId');
        this.saveConfigBtn = document.getElementById('saveConfig');
        this.editConfigBtn = document.getElementById('editConfigBtn');

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
}

const configManager = new ConfigManager();