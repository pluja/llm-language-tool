<script>
  import { fade } from 'svelte/transition';
  import { ui } from '../stores/ui.svelte.js';
</script>

{#if ui.isLoading}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
  >
    <div class="flex flex-col items-center gap-4 text-center">
      <div class="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
      <p class="text-sm font-medium text-white">{ui.loadingMessage}</p>
    </div>
  </div>
{/if}
