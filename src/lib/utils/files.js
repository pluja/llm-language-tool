/**
 * File handling utilities.
 * Reads files and converts them to formats suitable for API consumption.
 */

/**
 * Supported file categories and their MIME types.
 */
export const FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  pdf: ['application/pdf'],
  text: [
    'text/plain', 'text/markdown', 'text/html', 'text/csv',
    'application/json', 'application/xml', 'text/xml',
  ],
};

/**
 * Determine the category of a file.
 */
export function getFileCategory(file) {
  const type = file.type || '';
  if (FILE_TYPES.image.includes(type)) return 'image';
  if (FILE_TYPES.pdf.includes(type)) return 'pdf';
  if (FILE_TYPES.text.includes(type)) return 'text';

  // Fallback: check extension
  const ext = file.name?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['txt', 'md', 'html', 'csv', 'json', 'xml', 'log', 'yml', 'yaml'].includes(ext)) return 'text';

  return 'unknown';
}

/**
 * Read a file as a data URL (base64).
 */
export function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Read a file as plain text.
 */
export function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Read a file as an ArrayBuffer.
 */
export function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convert an ArrayBuffer to base64 string.
 * Uses chunked processing to avoid stack overflow and O(n^2) string concat.
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  const chunks = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, chunk));
  }
  return btoa(chunks.join(''));
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get a human-readable file type label.
 */
export function getFileTypeLabel(file) {
  const cat = getFileCategory(file);
  switch (cat) {
    case 'image': return 'Image';
    case 'pdf': return 'PDF';
    case 'text': return 'Text file';
    default: return 'File';
  }
}

/**
 * Accepted file types string for the file input.
 */
export const ACCEPTED_FILE_TYPES = [
  ...FILE_TYPES.image,
  ...FILE_TYPES.pdf,
  ...FILE_TYPES.text,
  '.txt', '.md', '.csv', '.json', '.xml', '.yml', '.yaml', '.log',
].join(',');
