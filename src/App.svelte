<script>
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import TaskSelector from './lib/components/TaskSelector.svelte';
  import TaskOptions from './lib/components/TaskOptions.svelte';
  import InputArea from './lib/components/InputArea.svelte';
  import ResultCard from './lib/components/ResultCard.svelte';
  import SettingsPanel from './lib/components/SettingsPanel.svelte';
  import HistoryPanel from './lib/components/HistoryPanel.svelte';
  import Toast from './lib/components/Toast.svelte';
  import LoadingOverlay from './lib/components/LoadingOverlay.svelte';

  import { config, applyTheme, getIsConfigValid, saveConfig, decodeConfig, importConfig } from './lib/stores/config.svelte.js';
  import { ui, setLoading, showToast, setTask, toggleSettings } from './lib/stores/ui.svelte.js';
  import { addToHistory } from './lib/stores/history.svelte.js';
  import { buildPrompt, buildVisionPrompt } from './lib/utils/prompts.js';
  import { callAPI, callAPIStream, callVisionAPIStream, callVisionAPI } from './lib/utils/api.js';
  import { isValidUrl, fetchUrlContent } from './lib/utils/jina.js';
  import { createShare, getShareContent, isShareHash } from './lib/utils/share.js';
  import { marked } from 'marked';

  // Input state
  let inputText = $state('');
  let imageFile = $state(null);
  let imagePreview = $state(null);

  // Task options
  let inputLang = $state('auto');
  let outputLang = $state('english');
  let correctionLevel = $state('medium');
  let correctionStyle = $state('formal');

  // Results
  let results = $state([]);
  let isStreaming = $state(false);

  // Share view
  let isShareView = $state(false);
  let shareContent = $state(null);

  // Apply theme on mount & check for URL params
  onMount(() => {
    applyTheme();

    // Watch system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (config.theme === 'system') applyTheme(); };
    mq.addEventListener('change', handler);

    // Check URL params
    handleUrlParams();

    return () => mq.removeEventListener('change', handler);
  });

  // Re-apply theme when config.theme changes
  $effect(() => {
    config.theme;
    applyTheme();
  });

  function handleUrlParams() {
    // Config import
    const urlParams = new URLSearchParams(window.location.search);
    const encodedConfig = urlParams.get('config');
    if (encodedConfig) {
      const decoded = decodeConfig(encodedConfig);
      if (decoded && importConfig(decoded)) {
        showToast('Settings imported successfully', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        showToast('Invalid configuration', 'error');
      }
      return;
    }

    // Content automation
    const content = urlParams.get('content');
    const task = urlParams.get('task') || 'translate';
    const output = urlParams.get('output');
    if (content) {
      inputText = content;
      setTask(task);
      if (output) outputLang = output;
      // Auto-process after a tick
      setTimeout(() => processText(), 100);
      return;
    }

    // Share view
    const hash = window.location.hash.slice(1);
    if (hash && isShareHash(hash)) {
      const isPublicShare = hash.includes('?share');
      if (isPublicShare) {
        isShareView = true;
      }
      loadShareContent(hash);
    }
  }

  async function loadShareContent(hash) {
    try {
      const content = await getShareContent(hash);
      if (content) {
        if (isShareView) {
          shareContent = content;
        } else {
          // Show as a result in full app mode
          const text = typeof content === 'object' ? content.text : content;
          const source = typeof content === 'object' ? content.source : null;
          results.unshift({
            id: Date.now().toString(36),
            content: text,
            source: source,
            task: 'shared',
          });
        }
      }
    } catch (err) {
      console.error('Error loading shared content:', err);
      showToast('Failed to load shared content', 'error');
    }
  }

  async function processText() {
    if (!getIsConfigValid()) {
      showToast('Please configure your API settings first', 'warning');
      return;
    }

    const hasImage = imageFile !== null;
    const hasText = inputText.trim().length > 0;

    if (!hasText && !hasImage) {
      showToast('Enter some text or upload a photo', 'warning');
      return;
    }

    const task = ui.currentTask;
    setLoading(true, `Processing ${task}...`);

    try {
      let textContent = inputText.trim();
      let source = null;

      // Fetch URL content if needed
      if (hasText && isValidUrl(textContent)) {
        source = textContent;
        setLoading(true, 'Fetching URL content...');
        textContent = await fetchUrlContent(textContent);
        setLoading(true, `Processing ${task}...`);
      }

      let resultText = '';

      if (hasImage) {
        // Vision processing
        const imageBase64 = imagePreview.split(',')[1];
        const mimeType = imageFile.type || 'image/jpeg';
        const visionPrompt = buildVisionPrompt(task, {
          outputLang, level: correctionLevel, style: correctionStyle
        });

        const fullPrompt = hasText
          ? `${visionPrompt}\n\nAdditional context: ${textContent}`
          : visionPrompt;

        if (config.streamingEnabled) {
          resultText = await streamResult(async function* () {
            yield* callVisionAPIStream(fullPrompt, imageBase64, mimeType);
          }, task, source);
        } else {
          resultText = await callVisionAPI(fullPrompt, imageBase64, mimeType);
          addResult(resultText, task, source);
        }
      } else {
        // Text processing
        const prompt = buildPrompt(task, textContent, {
          inputLang, outputLang, level: correctionLevel, style: correctionStyle
        });

        if (config.streamingEnabled) {
          resultText = await streamResult(async function* () {
            yield* callAPIStream(prompt);
          }, task, source);
        } else {
          resultText = await callAPI(prompt);
          addResult(resultText, task, source);
        }
      }

      // Save to history
      addToHistory({
        task,
        input: inputText.trim().slice(0, 200),
        result: resultText,
        source,
      });

    } catch (err) {
      console.error('Processing error:', err);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function streamResult(generatorFn, task, source) {
    // Create a placeholder result for streaming
    const resultId = Date.now().toString(36);
    const result = {
      id: resultId,
      content: '',
      source,
      task,
    };
    results.unshift(result);
    isStreaming = true;
    setLoading(false); // Hide overlay, show streaming result

    try {
      for await (const chunk of generatorFn()) {
        results[0].content += chunk;
      }
    } finally {
      isStreaming = false;
    }

    return results[0].content;
  }

  function addResult(text, task, source) {
    results.unshift({
      id: Date.now().toString(36),
      content: text,
      source,
      task,
    });
  }

  async function handleResultAction(action, result) {
    switch (action) {
      case 'copy':
        await navigator.clipboard.writeText(result.content);
        showToast('Copied to clipboard', 'success');
        break;

      case 'share':
        try {
          const share = await createShare(result.content, result.source || 'No source');
          await navigator.clipboard.writeText(share.url);
          const method = share.method === 'inline' ? 'Self-contained' : 'PocketJSON';
          showToast(`Share URL copied (${method})`, 'success');
        } catch (err) {
          showToast('Failed to create share', 'error');
        }
        break;

      case 'summarize':
        inputText = result.content;
        setTask('summarize');
        await processText();
        break;

      case 'explain':
        inputText = result.content;
        setTask('summarize'); // Explain uses the same flow
        // Override task for the explain prompt
        ui.currentTask = 'explain';
        const prompt = buildPrompt('explain', result.content);
        setLoading(true, 'Explaining...');
        try {
          if (config.streamingEnabled) {
            const text = await streamResult(async function* () {
              yield* callAPIStream(prompt);
            }, 'explain', null);
            addToHistory({ task: 'explain', input: result.content.slice(0, 200), result: text, source: null });
          } else {
            const text = await callAPI(prompt);
            addResult(text, 'explain', null);
            addToHistory({ task: 'explain', input: result.content.slice(0, 200), result: text, source: null });
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error');
        } finally {
          setLoading(false);
        }
        break;

      case 'edit':
        inputText = result.content;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
    }
  }

  function handleHistoryRestore(entry) {
    if (entry.fullResult) {
      results.unshift({
        id: Date.now().toString(36),
        content: entry.fullResult,
        source: entry.source,
        task: entry.task,
      });
    }
  }

  function handleGoToApp() {
    const newHash = window.location.hash.replace('?share', '');
    window.location.hash = newHash;
    isShareView = false;
    window.location.reload();
  }
</script>

<svelte:window onkeydown={(e) => {
  // Global keyboard shortcuts
  if ((e.metaKey || e.ctrlKey) && e.key === ',') {
    e.preventDefault();
    toggleSettings();
  }
}} />

{#if isShareView}
  <!-- Share View -->
  <div class="mx-auto max-w-3xl px-4 py-8">
    <div class="mb-4 flex items-center justify-between">
      <button
        onclick={handleGoToApp}
        class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Open Full App
      </button>
      <span class="text-sm text-text-muted">Shared Content</span>
    </div>
    {#if shareContent}
      <div class="rounded-lg border border-border bg-surface p-6">
        <div class="prose-result text-sm">
          {@html marked.parse(typeof shareContent === 'object' ? shareContent.text : shareContent)}
        </div>
      </div>
    {:else}
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"></div>
      </div>
    {/if}
  </div>
{:else}
  <!-- Full App -->
  <Header />

  <main class="mx-auto max-w-3xl px-4 py-6">
    <div class="space-y-4">
      <!-- Task Selection -->
      <TaskSelector />

      <!-- Task Options -->
      <TaskOptions
        bind:inputLang
        bind:outputLang
        bind:correctionLevel
        bind:correctionStyle
      />

      <!-- Input Area -->
      <InputArea
        bind:value={inputText}
        bind:imageFile
        bind:imagePreview
        onsubmit={processText}
        disabled={ui.isLoading}
      />

      <!-- Results -->
      {#if results.length > 0}
        <div class="space-y-4 pt-2">
          {#each results as result, i (result.id)}
            <ResultCard
              {result}
              isStreaming={isStreaming && i === 0}
              onaction={handleResultAction}
            />
          {/each}
        </div>
      {/if}
    </div>
  </main>

  <footer class="py-6 text-center">
    <p class="text-xs text-text-muted">
      <a href="https://github.com/pluja/llm-language-tool" class="transition-colors hover:text-text-secondary" target="_blank" rel="noopener">Open Source</a>
      project by
      <a href="https://pluja.dev" class="transition-colors hover:text-text-secondary" target="_blank" rel="noopener">pluja</a>
    </p>
  </footer>

  <!-- Panels -->
  <SettingsPanel />
  <HistoryPanel onrestore={handleHistoryRestore} />
{/if}

<!-- Global overlays -->
<Toast />
<LoadingOverlay />
