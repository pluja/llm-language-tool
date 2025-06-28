'use strict';

class ThemeManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.themeToggleBtn = document.getElementById("theme-toggle");
    this.themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon");
    this.themeToggleLightIcon = document.getElementById("theme-toggle-light-icon");
    this.init();
  }

  init() {
    this.themeToggleBtn.addEventListener("click", () => this.toggleTheme());
    this.applyTheme(this.getTheme());
  }

  getTheme() {
    return this.configManager.getConfig().theme || "system";
  }

  setTheme(theme) {
    this.applyTheme(theme);
    const config = this.configManager.getConfig();
    config.theme = theme;
    this.configManager.saveConfig(config);
  }

  toggleTheme() {
    const currentTheme = this.getTheme();
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  }

  applyTheme(theme) {
    if (
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
      this.themeToggleLightIcon.classList.remove("hidden");
      this.themeToggleDarkIcon.classList.add("hidden");
    } else {
      document.documentElement.classList.remove("dark");
      this.themeToggleDarkIcon.classList.remove("hidden");
      this.themeToggleLightIcon.classList.add("hidden");
    }
  }
}

class ConfigManager {
  constructor() {
    this.configKey = "apiConfig";
    this.APP_VERSION = "0.1.7";
    this.lastUpdateCheck = 0;
    this.UPDATE_CHECK_INTERVAL = 1000 * 60 * 60; // 1 hour
    this.defaultConfig = {
      apiEndpoint: "",
      apiKey: "",
      modelId: "",
      pocketJsonEndpoint: "https://pocketjson.pluja.dev",
      pocketJsonApiKey: "",
      theme: "system", // light, dark, system
    };
    this.models = [];
    this.createToastElement();
    this.initializeConfigUI();
    this.handleUrlParams();
    this.themeManager = new ThemeManager(this);
  }

  createToastElement() {
    // Remove existing toast if any
    const existingToast = document.getElementById("settings-toast");
    if (existingToast) {
      existingToast.remove();
    }

    // Create new toast element
    this.toast = document.createElement("div");
    this.toast.id = "settings-toast";
    this.toast.className =
      "fixed z-50 px-4 py-2 transition-all duration-300 transform translate-x-full rounded-lg shadow-lg opacity-0 top-4 right-4";
    document.body.insertBefore(this.toast, document.body.firstChild);
  }

  showToast(message, type = "success") {
    if (!this.toast) {
      this.createToastElement();
    }

    // Set color based on type
    const colors = {
      success: "bg-green-500",
      error: "bg-red-500",
      warning: "bg-yellow-500",
    };

    // Reset any existing transition classes
    this.toast.className = `fixed top-4 right-4 py-2 px-4 rounded-lg shadow-lg transition-all duration-300 transform text-white ${colors[type]} translate-x-full opacity-0`;

    // Set content
    this.toast.textContent = message;

    // Force reflow
    void this.toast.offsetWidth;

    // Show toast
    requestAnimationFrame(() => {
      this.toast.classList.remove("translate-x-full", "opacity-0");
    });

    // Hide toast after 3 seconds
    setTimeout(() => {
      this.toast.classList.add("translate-x-full", "opacity-0");
    }, 3000);
  }

  async checkForUpdates() {
    if (!("serviceWorker" in navigator)) {
      return { hasUpdate: false, error: "Service Worker not supported" };
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return { hasUpdate: false, error: "No Service Worker registered" };
      }

      // Force update check
      await registration.update();

      // Get version from Service Worker
      const currentVersion = await this.getServiceWorkerVersion();

      if (!currentVersion) {
        return { hasUpdate: false, error: "Could not get Service Worker version" };
      }

      return {
        hasUpdate: currentVersion.version !== this.APP_VERSION,
        currentVersion: currentVersion.version,
        appVersion: this.APP_VERSION,
      };
    } catch (error) {
      console.error("Update check failed:", error);
      return { hasUpdate: false, error: error.message };
    }
  }

  async getServiceWorkerVersion() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.active) {
      return null;
    }

    // Use MessageChannel for reliable communication
    const messageChannel = new MessageChannel();

    return new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      registration.active.postMessage("GET_VERSION", [messageChannel.port2]);
    });
  }

  getApiEndpoint(path) {
    const baseUrl = this.apiEndpointInput.value.trim();
    if (!baseUrl) return "";

    try {
      // Remove trailing slashes from base URL
      const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
      // Remove leading slashes from path
      const cleanPath = path.replace(/^\/+/, "");
      return `${cleanBaseUrl}/${cleanPath}`;
    } catch (error) {
      console.error("Error constructing API endpoint:", error);
      return "";
    }
  }

  async fetchAvailableModels() {
    try {
      const endpoint = this.getApiEndpoint("models");
      if (!endpoint) {
        return [];
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.map((model) => ({
        id: model.id,
        name: model.id,
      }));
    } catch (error) {
      console.error("Error fetching models:", error);
      this.showToast("Failed to fetch available models", "error");
      return [];
    }
  }

  async updateModelsList(selectedModelId = "") {
    const currentModel = selectedModelId || this.modelIdInput.value;

    // Only show loading if we have an endpoint
    if (this.apiEndpointInput.value.trim()) {
      this.modelIdInput.innerHTML = '<option value="">Loading models...</option>';

      const models = await this.fetchAvailableModels();

      // Clear the select and add models
      this.modelIdInput.innerHTML = "";
      if (models.length === 0) {
        this.modelIdInput.innerHTML = '<option value="">No models available</option>';
        return;
      }

      models.sort((a, b) => a.name.localeCompare(b.name));
      this.models = models;

      this.renderModels();

      // Restore previously selected model if it exists in the new list
      if (currentModel && this.models.some((m) => m.id === currentModel)) {
        this.modelIdInput.value = currentModel;
      }
    } else {
      this.modelIdInput.innerHTML = '<option value="">Enter API endpoint to load models</option>';
    }
  }

  renderModels(filter = "") {
    const lowerCaseFilter = filter.toLowerCase();
    const filteredModels = this.models.filter((model) =>
      model.name.toLowerCase().includes(lowerCaseFilter)
    );

    this.modelIdInput.innerHTML = "";
    if (filteredModels.length === 0) {
      this.modelIdInput.innerHTML =
        '<option value="">No models match your search</option>';
      return;
    }

    filteredModels.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      this.modelIdInput.appendChild(option);
    });
  }

  initializeConfigUI() {
    this.modal = document.getElementById("modal");
    this.apiEndpointInput = document.getElementById("apiEndpoint");
    this.apiKeyInput = document.getElementById("apiKey");
    this.modelIdInput = document.getElementById("modelId");
    this.modelSearchInput = document.getElementById("modelSearch");
    this.saveConfigBtn = document.getElementById("saveConfig");
    this.editConfigBtn = document.getElementById("editConfigBtn");

    // Add endpoint change listener to update models
    this.apiEndpointInput.addEventListener("change", () => {
      if (this.apiEndpointInput.value.trim()) {
        this.updateModelsList();
      }
    });

    this.modelSearchInput.addEventListener("input", (e) => {
      this.renderModels(e.target.value);
    });

    this.shareConfigBtn = document.createElement("button");
    this.shareConfigBtn.id = "shareConfig";
    this.shareConfigBtn.className =
      "w-full py-1 my-1 font-medium text-white transition-all bg-gray-600 rounded-lg hover:bg-gray-700";
    this.shareConfigBtn.textContent = "Share Settings";
    this.saveConfigBtn.parentNode.appendChild(this.shareConfigBtn);
    this.pocketJsonEndpointInput = document.getElementById("pocketJsonEndpoint");
    this.pocketJsonApiKeyInput = document.getElementById("pocketJsonApiKey");

    // Add version and update section
    const versionSection = document.createElement("div");
    versionSection.className = "pt-4 my-6 border-t border-gray-200";
    versionSection.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-sm font-medium text-gray-900">App Version</h3>
                    <p class="text-sm text-gray-500" id="appVersionInfo">v${this.APP_VERSION}</p>
                </div>
                <button id="updateAppBtn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all">
                    Check for Updates
                </button>
            </div>
        `;

    // Insert before the save button container
    const saveButtonContainer = this.saveConfigBtn.parentNode;
    saveButtonContainer.parentNode.insertBefore(versionSection, saveButtonContainer);

    this.initializeUpdateChecker();
    this.loadStoredConfig();
    this.bindEvents();
  }

  initializeUpdateChecker() {
    const updateBtn = document.getElementById("updateAppBtn");
    const versionInfo = document.getElementById("appVersionInfo");

    if (!updateBtn || !versionInfo) return;

    updateBtn.addEventListener("click", async () => {
      // Prevent multiple rapid clicks
      if (Date.now() - this.lastUpdateCheck < 5000) {
        this.showToast("Please wait before checking again", "warning");
        return;
      }

      this.lastUpdateCheck = Date.now();
      updateBtn.disabled = true;
      updateBtn.textContent = "Checking...";

      try {
        const updateStatus = await this.checkForUpdates();

        if (updateStatus.error) {
          this.showToast(`Update check failed: ${updateStatus.error}`, "error");
          updateBtn.textContent = "Error checking";
        } else if (updateStatus.hasUpdate) {
          updateBtn.textContent = "Update Available!";
          const shouldUpdate = confirm("A new version is available! Update now?");

          if (shouldUpdate) {
            // Clear all caches before reload
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((key) => caches.delete(key)));

            // Force reload from server
            window.location.reload(true);
          }
        } else {
          updateBtn.textContent = "Up to date!";
          this.showToast("App is up to date!", "success");
        }
      } catch (error) {
        console.error("Update check failed:", error);
        this.showToast("Error checking for updates", "error");
        updateBtn.textContent = "Error checking";
      }

      setTimeout(() => {
        updateBtn.disabled = false;
        updateBtn.textContent = "Check for Updates";
      }, 2000);
    });
  }

  loadStoredConfig() {
    const storedConfig = localStorage.getItem(this.configKey);
    const config = storedConfig ? JSON.parse(storedConfig) : this.defaultConfig;

    this.apiEndpointInput.value = config.apiEndpoint || "";
    this.apiKeyInput.value = config.apiKey || "";
    this.pocketJsonEndpointInput.value = config.pocketJsonEndpoint || this.defaultConfig.pocketJsonEndpoint;
    this.pocketJsonApiKeyInput.value = config.pocketJsonApiKey || "";

    // After loading config, update the models list and pass the saved modelId
    this.updateModelsList(config.modelId);
    if (this.themeManager) {
        this.themeManager.applyTheme(config.theme);
    }
  }

  bindEvents() {
    this.editConfigBtn.addEventListener("click", () => {
      this.modal.classList.remove("hidden");
      if (this.apiEndpointInput.value.trim()) {
        this.updateModelsList();
      }
    });
    this.saveConfigBtn.addEventListener("click", () => this.handleSaveConfig());
    this.shareConfigBtn.addEventListener("click", () => this.handleShareConfig());
  }

  handleSaveConfig() {
    const config = {
      apiEndpoint: this.apiEndpointInput.value.trim(),
      apiKey: this.apiKeyInput.value.trim(),
      modelId: this.modelIdInput.value,
      pocketJsonEndpoint: this.pocketJsonEndpointInput.value.trim(),
      pocketJsonApiKey: this.pocketJsonApiKeyInput.value.trim(),
      theme: this.themeManager.getTheme(),
    };
    this.saveConfig(config);
    this.modal.classList.add("hidden");
    this.showToast("Settings saved successfully", "success");
  }

  handleShareConfig() {
    const config = {
      apiEndpoint: this.apiEndpointInput.value,
      apiKey: this.apiKeyInput.value,
      modelId: this.modelIdInput.value,
      pocketJsonEndpoint: this.pocketJsonEndpointInput.value,
      pocketJsonApiKey: this.pocketJsonApiKeyInput.value,
      languages: languageManager.getLanguages(),
    };
    const encodedConfig = this.encodeConfig(config);
    const url = `${window.location.origin}${window.location.pathname}?config=${encodedConfig}`;

    navigator.clipboard.writeText(url).then(() => {
      alert("Settings URL copied to clipboard!");
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
      console.error("Invalid config encoding");
      return null;
    }
  }

  handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedConfig = urlParams.get("config");

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
            pocketJsonApiKey: config.pocketJsonApiKey || "",
            theme: config.theme || this.defaultConfig.theme,
          };

          // Save to localStorage
          this.saveConfig(fullConfig);

          // Update UI
          this.loadStoredConfig();

          // Import languages if present
          if (config.languages && Array.isArray(config.languages)) {
            localStorage.setItem("languages", JSON.stringify(config.languages));
            // Reload language manager
            languageManager.languages = config.languages;
            languageManager.updateLanguageList();
            languageManager.updateLanguageSelects();
          }

          this.showToast(`Settings imported successfully from URL`, "success");

          // Remove the config parameter from URL
          window.history.replaceState({}, document.title, window.location.pathname);

          document.body.classList.add("share-view");
          const mainContainer = document.querySelector(".container");
          mainContainer.innerHTML = `
            <div class="flex justify-end mb-4">
                <button id="theme-toggle-public" type="button" class="p-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-700">
                    <span id="theme-toggle-dark-icon-public" class="hidden text-lg">🌙</span>
                    <span id="theme-toggle-light-icon-public" class="hidden text-lg">☀️</span>
                </button>
            </div>
            <div id="resultContainer" class="mt-8">
                  <h2 class="mb-4 text-2xl font-bold">Result</h2>
                  <div class="p-8 bg-white dark:bg-gray-800 shadow-lg rounded-2xl">
                      <div id="resultContent" class="mx-auto prose-sm prose sm:prose lg:prose-lg xl:prose-xl dark:prose-invert"></div>
                  </div>
              </div>
          `;
          // Re-initialize the theme manager for the public view
          this.themeManager.themeToggleBtn = document.getElementById(
            "theme-toggle-public"
          );
          this.themeManager.themeToggleDarkIcon = document.getElementById(
            "theme-toggle-dark-icon-public"
          );
          this.themeManager.themeToggleLightIcon = document.getElementById(
            "theme-toggle-light-icon-public"
          );
          this.themeManager.init();
          this.themeManager.applyTheme(config.theme || "system");

          const textProcessor = new TextProcessor(this);
          textProcessor.processTextWithConfig(config);
        } catch (error) {
          console.error("Error importing settings:", error);
          this.showToast("Error importing settings. Please try again.", "error");
        }
      } else {
        this.showToast("Invalid configuration format", "error");
      }
    }
  }

  validateConfig(config) {
    const hasRequiredFields =
      config.hasOwnProperty("apiEndpoint") &&
      config.hasOwnProperty("apiKey") &&
      config.hasOwnProperty("modelId");

    const hasValidPocketJson = !config.pocketJsonEndpoint || typeof config.pocketJsonEndpoint === "string";
    const hasValidPocketJsonKey = !config.pocketJsonApiKey || typeof config.pocketJsonApiKey === "string";

    const hasValidLanguages =
      !config.languages ||
      (Array.isArray(config.languages) && config.languages.every((lang) => typeof lang === "string"));

    return hasRequiredFields && hasValidLanguages && hasValidPocketJson && hasValidPocketJsonKey;
  }
}

const configManager = new ConfigManager();
