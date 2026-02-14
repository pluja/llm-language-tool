<script>
  import { marked } from 'marked';
  import { fade, slide } from 'svelte/transition';

  let { result, isStreaming = false, onaction } = $props();

  let htmlContent = $derived(result?.content ? marked.parse(result.content) : '');

  function handleAction(action) {
    onaction?.(action, result);
  }
</script>

<div class="rounded-lg border border-border bg-surface" transition:slide={{ duration: 250 }}>
  {#if result?.source && result.source !== 'No source'}
    <div class="border-b border-border px-4 py-2">
      <span class="text-xs text-text-muted">Source: </span>
      <a
        href={result.source}
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-primary hover:underline"
      >
        {result.source}
      </a>
    </div>
  {/if}

  <div class="px-4 py-4">
    <div class="prose-result text-sm {isStreaming ? 'streaming-cursor' : ''}">
      {@html htmlContent}
    </div>
  </div>

  {#if !isStreaming}
    <div class="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2" transition:fade={{ duration: 150 }}>
      <button
        onclick={() => handleAction('copy')}
        class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
        </svg>
        Copy
      </button>

      <button
        onclick={() => handleAction('share')}
        class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
        </svg>
        Share
      </button>

      <div class="mx-1 h-4 w-px bg-border"></div>

      <button
        onclick={() => handleAction('summarize')}
        class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
      >
        Summarize
      </button>

      <button
        onclick={() => handleAction('explain')}
        class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
      >
        Explain
      </button>

      <button
        onclick={() => handleAction('edit')}
        class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
      >
        Edit
      </button>
    </div>
  {/if}
</div>
