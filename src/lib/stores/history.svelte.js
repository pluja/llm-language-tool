/**
 * History store.
 * Persists processed results to localStorage for later retrieval.
 */

const HISTORY_KEY = 'resultHistory';
const MAX_ENTRIES = 50;

function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export const history = $state(loadHistory());

function persist() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify($state.snapshot(history)));
}

export function addToHistory(entry) {
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    task: entry.task,
    inputPreview: (entry.input || '').slice(0, 120),
    resultPreview: (entry.result || '').slice(0, 200),
    fullResult: entry.result,
    source: entry.source || null,
  };

  history.unshift(item);

  // Evict old entries
  while (history.length > MAX_ENTRIES) {
    history.pop();
  }

  persist();
  return item;
}

export function removeFromHistory(id) {
  const idx = history.findIndex(h => h.id === id);
  if (idx !== -1) {
    history.splice(idx, 1);
    persist();
  }
}

export function clearHistory() {
  history.length = 0;
  persist();
}

export function getHistoryEntry(id) {
  return history.find(h => h.id === id) || null;
}
