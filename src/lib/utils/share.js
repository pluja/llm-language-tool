/**
 * PocketJSON share utilities.
 */

import { config } from '../stores/config.svelte.js';

export async function createShare(content, source = 'No source') {
  const pjEndpoint = config.pocketJsonEndpoint || 'https://pocketjson.pluja.dev';
  const pjApiKey = config.pocketJsonApiKey;

  const headers = { 'Content-Type': 'application/json' };
  if (pjApiKey) headers['X-API-Key'] = pjApiKey;

  const body = {
    content: { text: content, source },
  };

  const queryParams = pjApiKey ? '?expiry=never' : '';
  const response = await fetch(`${pjEndpoint}${queryParams}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`PocketJSON error: ${response.statusText}`);

  const data = await response.json();
  return {
    id: data.id,
    expiresAt: data.expires_at,
    endpoint: pjEndpoint,
  };
}

export async function getShareContent(id, endpoint) {
  const pjEndpoint = endpoint || config.pocketJsonEndpoint || 'https://pocketjson.pluja.dev';
  const clean = pjEndpoint.replace(/\/+$/, '');

  const response = await fetch(`${clean}/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch share: ${response.statusText}`);

  const data = await response.json();
  return data.content;
}

export function buildShareUrl(shareId, endpoint) {
  const encoded = encodeURIComponent(endpoint);
  return `${window.location.origin}${window.location.pathname}#share=${shareId}@${encoded}?share`;
}

export function parseShareHash(hash) {
  if (!hash || !hash.startsWith('share=')) return null;

  const parts = hash.split('?')[0];
  const [shareId, endpoint] = parts.replace('share=', '').split('@');
  return {
    shareId,
    endpoint: endpoint ? decodeURIComponent(endpoint) : null,
  };
}
