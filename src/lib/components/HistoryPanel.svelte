<script>
  import { slide, fade } from 'svelte/transition';
  import { ui, closeHistory } from '../stores/ui.svelte.js';
  import { history, removeFromHistory, clearHistory } from '../stores/history.svelte.js';

  let { onrestore } = $props();

  function handleRestore(entry) {
    onrestore?.(entry);
    closeHistory();
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) closeHistory();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') closeHistory();
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  }

  const taskLabels = {
    translate: 'Translate',
    summarize: 'Summarize',
    correct: 'Correct',
    explain: 'Explain',
  };
</script>

<svelte:window onkeydown={ui.historyOpen ? handleKeydown : undefined} />

{#if ui.historyOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-40 flex justify-start bg-black/40 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div
      class="flex h-full w-full max-w-sm flex-col bg-surface shadow-xl"
      transition:slide={{ axis: 'x', duration: 250 }}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 class="text-lg font-semibold text-text">History</h2>
        <div class="flex items-center gap-2">
          {#if history.length > 0}
            <button
              onclick={clearHistory}
              class="text-xs text-text-muted transition-colors hover:text-danger"
            >
              Clear all
            </button>
          {/if}
          <button
            onclick={closeHistory}
            class="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            aria-label="Close history"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        {#if history.length === 0}
          <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
            <svg class="mb-3 h-10 w-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p class="text-sm text-text-muted">No history yet</p>
            <p class="text-xs text-text-muted">Processed results will appear here</p>
          </div>
        {:else}
          <div class="divide-y divide-border">
            {#each history as entry (entry.id)}
              <div class="group relative px-4 py-3 transition-colors hover:bg-surface-hover">
                <button
                  onclick={() => handleRestore(entry)}
                  class="w-full text-left"
                >
                  <div class="mb-1 flex items-center gap-2">
                    <span class="rounded-md bg-primary-light px-1.5 py-0.5 text-xs font-medium text-primary">
                      {taskLabels[entry.task] || entry.task}
                    </span>
                    <span class="text-xs text-text-muted">{formatTime(entry.timestamp)}</span>
                  </div>
                  <p class="line-clamp-2 text-sm text-text">{entry.resultPreview}</p>
                  {#if entry.source}
                    <p class="mt-1 truncate text-xs text-text-muted">{entry.source}</p>
                  {/if}
                </button>
                <button
                  onclick={() => removeFromHistory(entry.id)}
                  class="absolute right-3 top-3 rounded-md p-1 text-text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  aria-label="Remove from history"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
