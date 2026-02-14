/**
 * Jina AI Reader API for fetching URL content as readable text.
 */

import { config } from '../stores/config.svelte.js';

export function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function fetchUrlContent(url) {
  const headers = {
    'Accept': 'text/plain',
  };

  if (config.jinaApiKey) {
    headers['Authorization'] = `Bearer ${config.jinaApiKey}`;
  }

  const response = await fetch(`https://r.jina.ai/${url}`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL content: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}
