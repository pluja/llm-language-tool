/**
 * OpenAI-compatible API client with streaming support.
 */

import { config, getApiEndpoint } from '../stores/config.svelte.js';

const SYSTEM_PROMPT = 'You are a helpful text assistant. Complete the task without any extra prose. You must comply the task provided by the user carefully.';

/**
 * Call the chat completions API (non-streaming).
 */
export async function callAPI(prompt) {
  const endpoint = getApiEndpoint('chat/completions');
  if (!endpoint) throw new Error('Invalid API endpoint');

  const body = {
    model: config.modelId,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.choices?.length) throw new Error('Invalid API response');

  return result.choices[0].message.content;
}

/**
 * Call the chat completions API with streaming.
 * Returns an async generator that yields content chunks.
 */
export async function* callAPIStream(prompt) {
  const endpoint = getApiEndpoint('chat/completions');
  if (!endpoint) throw new Error('Invalid API endpoint');

  const body = {
    model: config.modelId,
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Call the API with a vision message (image + text).
 */
export async function* callVisionAPIStream(textPrompt, imageBase64, mimeType = 'image/jpeg') {
  const modelId = config.visionModelId || config.modelId;
  const endpoint = getApiEndpoint('chat/completions');
  if (!endpoint) throw new Error('Invalid API endpoint');

  const body = {
    model: modelId,
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          {
            type: 'text',
            text: textPrompt,
          },
        ],
      },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Call the API without streaming (for vision, non-streaming fallback).
 */
export async function callVisionAPI(textPrompt, imageBase64, mimeType = 'image/jpeg') {
  const modelId = config.visionModelId || config.modelId;
  const endpoint = getApiEndpoint('chat/completions');
  if (!endpoint) throw new Error('Invalid API endpoint');

  const body = {
    model: modelId,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          {
            type: 'text',
            text: textPrompt,
          },
        ],
      },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.choices?.length) throw new Error('Invalid API response');

  return result.choices[0].message.content;
}
