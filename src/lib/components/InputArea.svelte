<script>
  import { isValidUrl } from '../utils/jina.js';

  let { value = $bindable(''), imageFile = $bindable(null), imagePreview = $bindable(null), onsubmit, disabled = false } = $props();

  let fileInput;
  let isUrl = $derived(isValidUrl(value.trim()));

  function handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onsubmit?.();
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    imageFile = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
      imagePreview = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    imageFile = null;
    imagePreview = null;
    if (fileInput) fileInput.value = '';
  }
</script>

<div class="relative rounded-lg border border-border bg-surface transition-colors focus-within:border-border-focus focus-within:ring-1 focus-within:ring-border-focus">
  {#if imagePreview}
    <div class="flex items-center gap-2 border-b border-border px-3 py-2">
      <img src={imagePreview} alt="Uploaded" class="h-16 w-16 rounded-md object-cover" />
      <div class="flex-1 text-xs text-text-secondary">
        {imageFile?.name || 'Photo'}
        <span class="block text-text-muted">{imageFile ? (imageFile.size / 1024).toFixed(1) + ' KB' : ''}</span>
      </div>
      <button
        onclick={removeImage}
        class="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-danger"
        aria-label="Remove image"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/if}

  <textarea
    bind:value
    onkeydown={handleKeydown}
    rows="4"
    {disabled}
    class="w-full resize-none bg-transparent px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none disabled:opacity-50"
    placeholder="Paste text, a URL, or upload a photo..."
  ></textarea>

  <div class="flex items-center justify-between border-t border-border px-3 py-2">
    <div class="flex items-center gap-2">
      {#if isUrl}
        <span class="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.338a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.34 8.374" />
          </svg>
          URL detected
        </span>
      {/if}
      {#if imageFile}
        <span class="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18V6a2.25 2.25 0 0 1 2.25-2.25h15A2.25 2.25 0 0 1 21.75 6v12A2.25 2.25 0 0 1 19.5 20.25H4.5A2.25 2.25 0 0 1 2.25 18Z" />
          </svg>
          Photo attached
        </span>
      {/if}
    </div>

    <div class="flex items-center gap-1">
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        onchange={handleFileSelect}
        class="hidden"
      />
      <button
        onclick={() => fileInput?.click()}
        class="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        aria-label="Upload photo"
        title="Upload or take photo"
        {disabled}
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.04l-.821 1.315Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
        </svg>
      </button>

      <button
        onclick={() => onsubmit?.()}
        disabled={disabled || (!value.trim() && !imageFile)}
        class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Process (Ctrl+Enter)"
        title="Process (Ctrl+Enter)"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
        </svg>
      </button>
    </div>
  </div>
</div>
