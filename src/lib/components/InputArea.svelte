<script>
  import { isValidUrl } from '../utils/jina.js';
  import { getFileCategory, getFileTypeLabel, formatFileSize, readAsDataURL, ACCEPTED_FILE_TYPES } from '../utils/files.js';

  let { value = $bindable(''), attachedFile = $bindable(null), filePreview = $bindable(null), onsubmit = undefined, disabled = false } = $props();

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  let photoInput;
  let fileInput;
  let isUrl = $derived(isValidUrl(value.trim()));
  let fileCategory = $derived(attachedFile ? getFileCategory(attachedFile) : null);
  let fileLabel = $derived(attachedFile ? getFileTypeLabel(attachedFile) : '');

  function handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onsubmit?.();
    }
  }

  async function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large (${formatFileSize(file.size)}). Maximum is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }
    attachedFile = file;
    // Only generate preview for images
    if (getFileCategory(file) === 'image') {
      filePreview = await readAsDataURL(file);
    } else {
      filePreview = null;
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large (${formatFileSize(file.size)}). Maximum is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }
    attachedFile = file;
    if (getFileCategory(file) === 'image') {
      filePreview = await readAsDataURL(file);
    } else {
      filePreview = null;
    }
  }

  function removeFile() {
    attachedFile = null;
    filePreview = null;
    if (photoInput) photoInput.value = '';
    if (fileInput) fileInput.value = '';
  }
</script>

<div class="relative rounded-lg border border-border bg-surface transition-colors focus-within:border-border-focus focus-within:ring-1 focus-within:ring-border-focus">
  {#if attachedFile}
    <div class="flex items-center gap-3 border-b border-border px-3 py-2">
      {#if filePreview && fileCategory === 'image'}
        <img src={filePreview} alt="Preview" class="h-14 w-14 rounded-md object-cover" />
      {:else}
        <!-- File icon for non-image files -->
        <div class="flex h-14 w-14 items-center justify-center rounded-md bg-surface-hover">
          {#if fileCategory === 'pdf'}
            <svg class="h-6 w-6 text-danger" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          {:else}
            <svg class="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          {/if}
        </div>
      {/if}
      <div class="flex-1 min-w-0">
        <p class="truncate text-sm text-text">{attachedFile.name}</p>
        <p class="text-xs text-text-muted">{fileLabel} -- {formatFileSize(attachedFile.size)}</p>
      </div>
      <button
        onclick={removeFile}
        class="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-danger"
        aria-label="Remove file"
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
    placeholder="Paste text, a URL, or attach a file..."
  ></textarea>

  <div class="flex items-center justify-between border-t border-border px-3 py-2">
    <div class="flex items-center gap-2">
      {#if isUrl}
        <span class="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none">
            <path fill="currentColor" d="M10.232 10.231a5 5 0 0 1 6.89-.172l.181.172l2.828 2.829a5 5 0 0 1-6.89 7.243l-.18-.172l-2.122-2.122a1 1 0 0 1 1.32-1.497l.094.083l2.122 2.122a3 3 0 0 0 4.377-4.1l-.135-.143l-2.828-2.828a3 3 0 0 0-4.243 0a1 1 0 0 1-1.414-1.415M3.868 3.867a5 5 0 0 1 6.89-.172l.181.172L13.06 5.99a1 1 0 0 1-1.32 1.497l-.094-.083l-2.121-2.121A3 3 0 0 0 5.147 9.38l.135.144l2.829 2.829a3 3 0 0 0 4.242 0a1 1 0 1 1 1.415 1.414a5 5 0 0 1-6.89.172l-.182-.172l-2.828-2.829a5 5 0 0 1 0-7.07Z"/>
          </svg>
          URL detected
        </span>
      {/if}
      {#if attachedFile}
        <span class="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
          {#if fileCategory === 'image'}
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18V6a2.25 2.25 0 0 1 2.25-2.25h15A2.25 2.25 0 0 1 21.75 6v12A2.25 2.25 0 0 1 19.5 20.25H4.5A2.25 2.25 0 0 1 2.25 18Z" />
            </svg>
            Image attached
          {:else if fileCategory === 'pdf'}
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            PDF attached
          {:else}
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
            File attached
          {/if}
        </span>
      {/if}
    </div>

    <div class="flex items-center gap-1">
      <!-- Hidden file inputs -->
      <input
        bind:this={photoInput}
        type="file"
        accept="image/*"
        capture="environment"
        onchange={handlePhotoSelect}
        class="hidden"
      />
      <input
        bind:this={fileInput}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onchange={handleFileSelect}
        class="hidden"
      />

      <!-- Camera button (mobile photo capture) -->
      <button
        onclick={() => photoInput?.click()}
        class="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        aria-label="Take photo"
        title="Take photo"
        {disabled}
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.04l-.821 1.315Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
        </svg>
      </button>

      <!-- File attachment button -->
      <button
        onclick={() => fileInput?.click()}
        class="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        aria-label="Attach file"
        title="Attach file (image, PDF, text)"
        {disabled}
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
        </svg>
      </button>

      <!-- Submit button -->
      <button
        onclick={() => onsubmit?.()}
        disabled={disabled || (!value.trim() && !attachedFile)}
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
