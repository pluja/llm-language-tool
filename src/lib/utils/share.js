/**
 * Share utilities.
 * Supports two modes:
 *   1. Self-contained: content compressed and encoded directly in the URL hash
 *   2. PocketJSON: content stored externally (default for longer content)
 */

import { config } from '../stores/config.svelte.js';

// URLs longer than this look uncomfortable in chats/social media
// ~2000 chars is roughly 1500-1800 bytes of compressed content
const COMFORTABLE_URL_THRESHOLD = 2000;

// Hard browser limit - some systems truncate beyond this
const MAX_URL_LENGTH = 8000;

/**
 * Compress a string using the CompressionStream API (gzip),
 * then base64url-encode it for safe use in URLs.
 */
async function compressAndEncode(text) {
  const encoder = new TextEncoder();
  const stream = new Blob([encoder.encode(text)])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));

  const compressed = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(compressed);

  // base64url encode (URL-safe, no padding)
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode and decompress a base64url-gzip string back to text.
 */
async function decodeAndDecompress(encoded) {
  // Restore standard base64 from base64url
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));

  return await new Response(stream).text();
}

/**
 * Create a share. Uses PocketJSON by default for content exceeding comfortable URL length.
 * Falls back to self-contained URL if PocketJSON is disabled or fails.
 * Returns { url, method } where method is 'inline' or 'pocketjson'.
 */
export async function createShare(content, source = 'No source') {
  const payload = JSON.stringify({ text: content, source });

  // If PocketJSON is disabled, always use self-contained
  if (!config.pocketJsonEnabled) {
    try {
      const compressed = await compressAndEncode(payload);
      const url = `${window.location.origin}${window.location.pathname}#d=${compressed}?share`;
      return { url, method: 'inline' };
    } catch (err) {
      throw new Error(`Self-contained share failed: ${err.message}`);
    }
  }

  // Try self-contained for short content, PocketJSON for longer
  try {
    const compressed = await compressAndEncode(payload);
    const url = `${window.location.origin}${window.location.pathname}#d=${compressed}?share`;

    // Use self-contained only if URL is comfortably short
    if (url.length <= COMFORTABLE_URL_THRESHOLD) {
      return { url, method: 'inline' };
    }
  } catch {
    // CompressionStream not supported or failed, fall through to PocketJSON
  }

  // Use PocketJSON for longer content
  const pjEndpoint = config.pocketJsonEndpoint || 'https://pocketjson.pluja.dev';
  const pjApiKey = config.pocketJsonApiKey;

  const headers = { 'Content-Type': 'application/json' };
  if (pjApiKey) headers['X-API-Key'] = pjApiKey;

  const body = { content: { text: content, source } };

  const queryParams = pjApiKey ? '?expiry=never' : '';
  const response = await fetch(`${pjEndpoint}${queryParams}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`PocketJSON error: ${response.statusText}`);

  const data = await response.json();
  const encodedEndpoint = encodeURIComponent(pjEndpoint);
  const url = `${window.location.origin}${window.location.pathname}#share=${data.id}@${encodedEndpoint}?share`;

  return {
    url,
    method: 'pocketjson',
    expiresAt: data.expires_at,
  };
}

/**
 * Retrieve shared content from a URL hash.
 * Supports both inline (d=...) and PocketJSON (share=...) formats.
 */
export async function getShareContent(hash) {
  if (!hash) return null;

  const cleanHash = hash.split('?')[0];

  // Inline self-contained share
  if (cleanHash.startsWith('d=')) {
    try {
      const compressed = cleanHash.slice(2);
      const json = await decodeAndDecompress(compressed);
      return JSON.parse(json);
    } catch (err) {
      console.error('Failed to decode inline share:', err);
      return null;
    }
  }

  // PocketJSON share
  if (cleanHash.startsWith('share=')) {
    const [shareId, endpoint] = cleanHash.replace('share=', '').split('@');
    const pjEndpoint = endpoint
      ? decodeURIComponent(endpoint)
      : config.pocketJsonEndpoint || 'https://pocketjson.pluja.dev';

    try {
      const clean = pjEndpoint.replace(/\/+$/, '');
      const response = await fetch(`${clean}/${shareId}`);
      if (!response.ok) throw new Error(`Failed to fetch share: ${response.statusText}`);
      const data = await response.json();
      return data.content;
    } catch (err) {
      console.error('Failed to fetch PocketJSON share:', err);
      return null;
    }
  }

  return null;
}

/**
 * Check if a hash represents a share URL (either format).
 */
export function isShareHash(hash) {
  return hash.startsWith('share=') || hash.startsWith('d=');
}
