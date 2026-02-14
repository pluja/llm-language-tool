<script>
  import { slide } from 'svelte/transition';
  import { ui } from '../stores/ui.svelte.js';
  import { languages } from '../stores/config.svelte.js';

  let { inputLang = $bindable('auto'), outputLang = $bindable('english'), correctionLevel = $bindable('medium'), correctionStyle = $bindable('formal') } = $props();
</script>

{#if ui.currentTask === 'translate'}
  <div class="flex gap-3" transition:slide={{ duration: 200 }}>
    <div class="flex-1">
      <label for="input-lang" class="mb-1 block text-xs font-medium text-text-secondary">From</label>
      <select
        id="input-lang"
        bind:value={inputLang}
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text transition-colors focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
      >
        <option value="auto">Auto Detect</option>
        {#each languages as lang}
          <option value={lang.toLowerCase()}>{lang}</option>
        {/each}
      </select>
    </div>

    <div class="flex items-end pb-2">
      <svg class="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    </div>

    <div class="flex-1">
      <label for="output-lang" class="mb-1 block text-xs font-medium text-text-secondary">To</label>
      <select
        id="output-lang"
        bind:value={outputLang}
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text transition-colors focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
      >
        {#each languages as lang}
          <option value={lang.toLowerCase()}>{lang}</option>
        {/each}
      </select>
    </div>
  </div>
{/if}

{#if ui.currentTask === 'correct'}
  <div class="flex gap-3" transition:slide={{ duration: 200 }}>
    <div class="flex-1">
      <label for="correction-level" class="mb-1 block text-xs font-medium text-text-secondary">Level</label>
      <select
        id="correction-level"
        bind:value={correctionLevel}
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text transition-colors focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
      >
        <option value="low">Light</option>
        <option value="medium">Medium</option>
        <option value="high">Heavy</option>
      </select>
    </div>
    <div class="flex-1">
      <label for="correction-style" class="mb-1 block text-xs font-medium text-text-secondary">Style</label>
      <select
        id="correction-style"
        bind:value={correctionStyle}
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text transition-colors focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
      >
        <option value="formal">Formal</option>
        <option value="informal">Informal</option>
        <option value="academic">Academic</option>
        <option value="business">Business</option>
      </select>
    </div>
  </div>
{/if}
