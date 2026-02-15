<script>
  import { slide, fade } from 'svelte/transition';
  import { ui, closeSettings, showToast } from '../stores/ui.svelte.js';
  import {
    config, languages, models, saveConfig, fetchModels,
    addLanguage, removeLanguage, encodeConfig, APP_VERSION
  } from '../stores/config.svelte.js';

  let modelFilter = $state('');
  let newLangInput = $state('');
  let fetchingModels = $state(false);

  let filteredModels = $derived(
    modelFilter
      ? models.filter(m => m.name.toLowerCase().includes(modelFilter.toLowerCase()))
      : models
  );

  async function loadModels() {
    if (!config.apiEndpoint) return;
    fetchingModels = true;
    await fetchModels();
    fetchingModels = false;
  }

  function handleSave() {
    saveConfig();
    closeSettings();
    showToast('Settings saved', 'success');
  }

  function handleShareConfig() {
    const encoded = encodeConfig();
    const url = `${window.location.origin}${window.location.pathname}?config=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Settings URL copied to clipboard', 'success');
    });
  }

  function handleAddLanguage() {
    if (addLanguage(newLangInput)) {
      newLangInput = '';
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) closeSettings();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') closeSettings();
  }
</script>

<svelte:window onkeydown={ui.settingsOpen ? handleKeydown : undefined} />

{#if ui.settingsOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div
      class="flex h-full w-full max-w-md flex-col bg-surface shadow-xl"
      transition:slide={{ axis: 'x', duration: 250 }}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 class="text-lg font-semibold text-text">Settings</h2>
        <button
          onclick={closeSettings}
          class="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          aria-label="Close settings"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 space-y-6 overflow-y-auto px-6 py-4">

        <!-- API Configuration -->
        <section>
          <h3 class="mb-3 text-sm font-semibold text-text">API Configuration</h3>
          <div class="space-y-3">
            <div>
              <label for="api-endpoint" class="mb-1 block text-xs font-medium text-text-secondary">Endpoint</label>
              <input
                id="api-endpoint"
                type="url"
                bind:value={config.apiEndpoint}
                onchange={loadModels}
                placeholder="https://api.openai.com/v1"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
              />
            </div>
            <div>
              <label for="api-key" class="mb-1 block text-xs font-medium text-text-secondary">API Key</label>
              <input
                id="api-key"
                type="password"
                bind:value={config.apiKey}
                placeholder="sk-..."
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
              />
            </div>
            <div>
              <label for="model-filter" class="mb-1 block text-xs font-medium text-text-secondary">Model</label>
              <input
                id="model-filter"
                type="text"
                bind:value={modelFilter}
                placeholder="Search models..."
                onfocus={loadModels}
                class="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
              />
              <select
                bind:value={config.modelId}
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
              >
                {#if fetchingModels}
                  <option value="">Loading models...</option>
                {:else if filteredModels.length === 0}
                  <option value="">No models available</option>
                {:else}
                  {#each filteredModels as model (model.id)}
                    <option value={model.id}>{model.name}</option>
                  {/each}
                {/if}
              </select>
            </div>
            <div>
              <label for="vision-model" class="mb-1 block text-xs font-medium text-text-secondary">Vision Model (optional)</label>
              <select
                id="vision-model"
                bind:value={config.visionModelId}
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
              >
                <option value="">Same as above</option>
                {#each filteredModels as model (model.id)}
                  <option value={model.id}>{model.name}</option>
                {/each}
              </select>
              <p class="mt-1 text-xs text-text-muted">Used for photo/image processing</p>
            </div>
          </div>
          <p class="mt-2 text-xs text-text-muted">
            Compatible with <a href="https://ppq.ai" class="text-primary hover:underline" target="_blank" rel="noopener">ppq.ai</a>,
            <a href="https://nano-gpt.com" class="text-primary hover:underline" target="_blank" rel="noopener">nano-gpt</a>,
            OpenAI, Ollama, and any OpenAI-compatible API.
          </p>
        </section>

        <!-- URL Reader -->
        <section>
          <h3 class="mb-3 text-sm font-semibold text-text">URL Reader</h3>
          <div>
            <label for="jina-key" class="mb-1 block text-xs font-medium text-text-secondary">Jina API Key</label>
            <input
              id="jina-key"
              type="password"
              bind:value={config.jinaApiKey}
              placeholder="jina_..."
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
            />
            <p class="mt-1 text-xs text-text-muted">
              Required for fetching URL content. Get a free key at <a href="https://jina.ai/reader" class="text-primary hover:underline" target="_blank" rel="noopener">jina.ai/reader</a>
            </p>
          </div>
        </section>

        <!-- Streaming -->
        <section>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-text">Streaming</h3>
              <p class="text-xs text-text-muted">Show results as they generate</p>
            </div>
            <button
              onclick={() => { config.streamingEnabled = !config.streamingEnabled; }}
              class="relative h-6 w-11 rounded-full transition-colors {config.streamingEnabled ? 'bg-primary' : 'bg-border'}"
              role="switch"
              aria-checked={config.streamingEnabled}
              aria-label="Toggle streaming"
            >
              <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {config.streamingEnabled ? 'translate-x-5' : 'translate-x-0'}"></span>
            </button>
          </div>
        </section>

        <!-- Share Configuration -->
        <section>
          <h3 class="mb-3 text-sm font-semibold text-text">Share Configuration</h3>
          <div class="space-y-3">
            <div>
              <label for="pj-endpoint" class="mb-1 block text-xs font-medium text-text-secondary">PocketJSON Endpoint</label>
              <input
                id="pj-endpoint"
                type="url"
                bind:value={config.pocketJsonEndpoint}
                placeholder="https://pocketjson.pluja.dev"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
              />
            </div>
            <div>
              <label for="pj-key" class="mb-1 block text-xs font-medium text-text-secondary">PocketJSON API Key</label>
              <input
                id="pj-key"
                type="password"
                bind:value={config.pocketJsonApiKey}
                placeholder="Optional - for permanent shares"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
              />
            </div>
          </div>
        </section>

        <!-- Language Management -->
        <section>
          <h3 class="mb-3 text-sm font-semibold text-text">Languages</h3>
          <div class="mb-3">
            <label for="default-lang" class="mb-1 block text-xs font-medium text-text-secondary">Default Language</label>
            <select
              id="default-lang"
              bind:value={config.defaultLanguage}
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
            >
              <option value="">None</option>
              {#each languages as lang}
                <option value={lang.toLowerCase()}>{lang}</option>
              {/each}
            </select>
            <p class="mt-1 text-xs text-text-muted">Used as translation target and summary language</p>
          </div>
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={newLangInput}
              placeholder="Add language"
              onkeydown={(e) => { if (e.key === 'Enter') handleAddLanguage(); }}
              class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
            />
            <button
              onclick={handleAddLanguage}
              class="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Add
            </button>
          </div>
          <div class="mt-2 max-h-36 space-y-1 overflow-y-auto">
            {#each languages as lang, i (lang)}
              <div class="flex items-center justify-between rounded-md px-3 py-1.5 hover:bg-surface-hover">
                <span class="text-sm text-text">{lang}</span>
                <button
                  onclick={() => removeLanguage(lang)}
                  class="text-xs text-text-muted transition-colors hover:text-danger"
                >
                  Remove
                </button>
              </div>
            {/each}
          </div>
        </section>

        <!-- Version -->
        <section class="border-t border-border pt-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-text-muted">Version {APP_VERSION}</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Footer -->
      <div class="space-y-2 border-t border-border px-6 py-4">
        <button
          onclick={handleSave}
          class="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Save
        </button>
        <button
          onclick={handleShareConfig}
          class="w-full rounded-lg border border-border py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
        >
          Share Settings
        </button>
      </div>
    </div>
  </div>
{/if}
