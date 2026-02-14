/**
 * UI state store.
 * Manages current task, loading state, modal/panel visibility, and toasts.
 */

export const TASKS = [
  { id: 'translate', label: 'Translate', shortcut: '1' },
  { id: 'summarize', label: 'Summarize', shortcut: '2' },
  { id: 'correct', label: 'Correct', shortcut: '3' },
];

// Core UI state
export const ui = $state({
  currentTask: 'translate',
  isLoading: false,
  loadingMessage: '',
  settingsOpen: false,
  historyOpen: false,
});

// Toast system
export const toasts = $state([]);

let toastId = 0;

export function showToast(message, type = 'success', duration = 3000) {
  const id = ++toastId;
  toasts.push({ id, message, type });
  setTimeout(() => {
    const idx = toasts.findIndex(t => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
  }, duration);
}

export function setTask(task) {
  ui.currentTask = task;
}

export function setLoading(loading, message = 'Processing...') {
  ui.isLoading = loading;
  ui.loadingMessage = message;
}

export function toggleSettings() {
  ui.settingsOpen = !ui.settingsOpen;
  if (ui.settingsOpen) ui.historyOpen = false;
}

export function closeSettings() {
  ui.settingsOpen = false;
}

export function toggleHistory() {
  ui.historyOpen = !ui.historyOpen;
  if (ui.historyOpen) ui.settingsOpen = false;
}

export function closeHistory() {
  ui.historyOpen = false;
}
