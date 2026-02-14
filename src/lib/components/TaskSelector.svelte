<script>
  import { ui, TASKS, setTask } from '../stores/ui.svelte.js';
</script>

<div class="flex gap-1 rounded-lg bg-surface-hover p-1" role="tablist">
  {#each TASKS as task (task.id)}
    <button
      role="tab"
      aria-selected={ui.currentTask === task.id}
      class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all
        {ui.currentTask === task.id
          ? 'bg-surface text-text shadow-sm'
          : 'text-text-secondary hover:text-text'}"
      onclick={() => setTask(task.id)}
    >
      {task.label}
    </button>
  {/each}
</div>
