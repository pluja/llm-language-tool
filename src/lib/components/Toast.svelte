<script>
  import { fly, fade } from 'svelte/transition';
  import { toasts } from '../stores/ui.svelte.js';

  const typeStyles = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    warning: 'bg-warning text-white',
    info: 'bg-primary text-white',
  };
</script>

<div class="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
  {#each toasts as toast (toast.id)}
    <div
      class="pointer-events-auto rounded-lg px-4 py-2 text-sm font-medium shadow-lg {typeStyles[toast.type] || typeStyles.info}"
      in:fly={{ x: 100, duration: 250 }}
      out:fade={{ duration: 150 }}
    >
      {toast.message}
    </div>
  {/each}
</div>
