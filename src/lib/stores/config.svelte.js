/**
 * App configuration store.
 * Manages API settings, theme, languages, and PocketJSON config.
 * Persisted to localStorage.
 */

const CONFIG_KEY = 'apiConfig';
const LANGUAGES_KEY = 'languages';

export const APP_VERSION = '2.0.0';

const DEFAULT_CONFIG = {
  apiEndpoint: '',
  apiKey: '',
  modelId: '',
  visionModelId: '',
  jinaApiKey: '',
  pocketJsonEndpoint: 'https://pocketjson.pluja.dev',
  pocketJsonApiKey: '',
  defaultLanguage: '',
  theme: 'system',
  streamingEnabled: true,
};

const DEFAULT_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian'];

function loadConfig() {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function loadLanguages() {
  try {
    const stored = localStorage.getItem(LANGUAGES_KEY);
    return stored ? JSON.parse(stored) : [...DEFAULT_LANGUAGES];
  } catch {
    return [...DEFAULT_LANGUAGES];
  }
}

// Reactive state
export const config = $state(loadConfig());
export const languages = $state(loadLanguages());
export const models = $state([]);

// Config validation
export function getIsConfigValid() {
  return Boolean(config.apiEndpoint && config.apiKey && config.modelId);
}

// Persistence
export function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify($state.snapshot(config)));
}

export function saveLanguages() {
  localStorage.setItem(LANGUAGES_KEY, JSON.stringify($state.snapshot(languages)));
}

// Theme management
export function getEffectiveTheme() {
  if (config.theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return config.theme;
}

export function toggleTheme() {
  config.theme = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
  saveConfig();
}

export function applyTheme() {
  const effective = getEffectiveTheme();
  if (effective === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Language management
export function addLanguage(lang) {
  const trimmed = lang.trim();
  if (trimmed && !languages.includes(trimmed)) {
    languages.push(trimmed);
    saveLanguages();
    return true;
  }
  return false;
}

export function removeLanguage(lang) {
  const idx = languages.indexOf(lang);
  if (idx !== -1) {
    languages.splice(idx, 1);
    saveLanguages();
  }
}

// API helpers
export function getApiEndpoint(path) {
  const base = config.apiEndpoint.replace(/\/+$/, '');
  if (!base) return '';
  const clean = path.replace(/^\/+/, '');
  return `${base}/${clean}`;
}

export async function fetchModels() {
  try {
    const endpoint = getApiEndpoint('models');
    if (!endpoint) return;

    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(endpoint, { headers });
    if (!response.ok) throw new Error(`Failed: ${response.statusText}`);

    const data = await response.json();
    const fetched = (data.data || []).map(m => ({ id: m.id, name: m.id }));
    fetched.sort((a, b) => a.name.localeCompare(b.name));

    // Clear and repopulate
    models.length = 0;
    fetched.forEach(m => models.push(m));
  } catch (err) {
    console.error('Error fetching models:', err);
    models.length = 0;
  }
}

// Config sharing
export function encodeConfig() {
  const shareable = {
    apiEndpoint: config.apiEndpoint,
    apiKey: config.apiKey,
    modelId: config.modelId,
    visionModelId: config.visionModelId,
    pocketJsonEndpoint: config.pocketJsonEndpoint,
    pocketJsonApiKey: config.pocketJsonApiKey,
    languages: $state.snapshot(languages),
  };
  return btoa(JSON.stringify(shareable));
}

export function decodeConfig(encoded) {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

export function importConfig(decoded) {
  if (!decoded || !decoded.apiEndpoint) return false;

  config.apiEndpoint = decoded.apiEndpoint || '';
  config.apiKey = decoded.apiKey || '';
  config.modelId = decoded.modelId || '';
  config.visionModelId = decoded.visionModelId || '';
  config.pocketJsonEndpoint = decoded.pocketJsonEndpoint || DEFAULT_CONFIG.pocketJsonEndpoint;
  config.pocketJsonApiKey = decoded.pocketJsonApiKey || '';
  saveConfig();

  if (decoded.languages && Array.isArray(decoded.languages)) {
    languages.length = 0;
    decoded.languages.forEach(l => languages.push(l));
    saveLanguages();
  }

  return true;
}
