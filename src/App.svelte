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
  import { getFileCategory, readAsText, readAsArrayBuffer, arrayBufferToBase64 } from './lib/utils/files.js';
  import { parseMarkdown } from './lib/utils/markdown.js';

  // Input state
  let inputText = $state('');
  let attachedFile = $state(null);
  let filePreview = $state(null);

  // Task options
  let inputLang = $state('auto');
  let outputLang = $state(config.defaultLanguage || 'english');

  // Keep outputLang in sync when default language changes in settings
  $effect(() => {
    if (config.defaultLanguage) {
      outputLang = config.defaultLanguage;
    }
  });
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
      setTimeout(() => processText().catch(err => showToast(`Error: ${err.message}`, 'error')), 100);
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

    const hasFile = attachedFile !== null;
    const hasText = inputText.trim().length > 0;

    if (!hasText && !hasFile) {
      showToast('Enter some text or attach a file', 'warning');
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

      if (hasFile) {
        const fileCategory = getFileCategory(attachedFile);

        if (fileCategory === 'text') {
          // Text files: read as text and process normally
          setLoading(true, 'Reading file...');
          const fileText = await readAsText(attachedFile);
          const combined = hasText
            ? `${textContent}\n\n--- File: ${attachedFile.name} ---\n\n${fileText}`
            : fileText;

          const prompt = buildPrompt(task, combined, {
            inputLang, outputLang, level: correctionLevel, style: correctionStyle,
            defaultLanguage: config.defaultLanguage,
          });

          setLoading(true, `Processing ${task}...`);
          if (config.streamingEnabled) {
            resultText = await streamResult(async function* () {
              yield* callAPIStream(prompt);
            }, task, source);
          } else {
            resultText = await callAPI(prompt);
            addResult(resultText, task, source);
          }
        } else {
          // Images, PDFs, and other files: send as base64 to vision model
          setLoading(true, 'Reading file...');
          const buffer = await readAsArrayBuffer(attachedFile);
          const fileBase64 = arrayBufferToBase64(buffer);
          const mimeType = attachedFile.type || 'application/octet-stream';

          const visionPrompt = buildVisionPrompt(task, {
            outputLang, level: correctionLevel, style: correctionStyle
          });

          const fullPrompt = hasText
            ? `${visionPrompt}\n\nAdditional context: ${textContent}`
            : visionPrompt;

          setLoading(true, `Processing ${task}...`);
          if (config.streamingEnabled) {
            resultText = await streamResult(async function* () {
              yield* callVisionAPIStream(fullPrompt, fileBase64, mimeType);
            }, task, source);
          } else {
            resultText = await callVisionAPI(fullPrompt, fileBase64, mimeType);
            addResult(resultText, task, source);
          }
        }
      } else {
        // Text-only processing
        const prompt = buildPrompt(task, textContent, {
          inputLang, outputLang, level: correctionLevel, style: correctionStyle,
          defaultLanguage: config.defaultLanguage,
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
        try {
          await navigator.clipboard.writeText(result.content);
          showToast('Copied to clipboard', 'success');
        } catch {
          showToast('Failed to copy to clipboard', 'error');
        }
        break;

      case 'share':
        try {
          const share = await createShare(result.content, result.source || 'No source', result.task);
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

      case 'explain': {
        inputText = result.content;
        const prevTask = ui.currentTask;
        ui.currentTask = 'explain';
        await processText();
        ui.currentTask = prevTask;
        break;
      }

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
    </div>
    {#if shareContent}
      <div class="rounded-lg border border-border bg-surface p-6">
        {#if typeof shareContent === 'object' && shareContent.task}
          <div class="mb-4 flex items-center gap-2 border-b border-border pb-4">
            <span class="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {shareContent.task.charAt(0).toUpperCase() + shareContent.task.slice(1)}
            </span>
            {#if shareContent.source && shareContent.source !== 'No source'}
              <span class="text-xs text-text-muted">of</span>
              <a
                href={shareContent.source}
                target="_blank"
                rel="noopener noreferrer"
                class="truncate text-xs text-primary hover:underline"
                style="max-width: 300px;"
              >
                {shareContent.source}
              </a>
            {/if}
          </div>
        {/if}
        <div class="prose-result text-sm">
          {@html parseMarkdown(typeof shareContent === 'object' ? shareContent.text : shareContent)}
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
        bind:attachedFile
        bind:filePreview
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
