/**
 * OpenAI-compatible API client with streaming support.
 */

import { config, getApiEndpoint } from '../stores/config.svelte.js';

const SYSTEM_PROMPT = 'You are a helpful text assistant. Complete the task without any extra prose. You must comply the task provided by the user carefully.';

/**
 * Parse an API error response to extract a readable message.
 */
async function parseApiError(response, label = 'API') {
  let errorMsg = `${label} error: ${response.status} ${response.statusText}`;
  try {
    // Read body as text first (can only consume once)
    const raw = await response.text();
    try {
      const body = JSON.parse(raw);
      // OpenAI-style error
      if (body.error?.message) {
        errorMsg = body.error.message;
      } else if (body.message) {
        errorMsg = body.message;
      } else if (body.detail) {
        errorMsg = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // Not JSON -- use raw text if short enough
      if (raw && raw.length < 300) errorMsg = raw;
    }
  } catch {
    // Failed to read body entirely
  }
  return errorMsg;
}

/**
 * Parse SSE stream chunks. Shared by all streaming functions.
 */
async function* parseSSEStream(response) {
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
          // Check for error in stream
          if (parsed.error) {
            throw new Error(parsed.error.message || JSON.stringify(parsed.error));
          }
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

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
    throw new Error(await parseApiError(response));
  }

  const result = await response.json();
  if (!result.choices?.length) throw new Error('Invalid API response: no choices returned');

  return result.choices[0].message.content;
}

/**
 * Call the chat completions API with streaming.
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
    throw new Error(await parseApiError(response));
  }

  yield* parseSSEStream(response);
}

/**
 * Call the API with a vision/file message (image or document + text).
 * Supports multimodal content arrays.
 */
export async function* callVisionAPIStream(textPrompt, fileBase64, mimeType = 'image/jpeg') {
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
            image_url: { url: `data:${mimeType};base64,${fileBase64}` },
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
    throw new Error(await parseApiError(response, 'Vision API'));
  }

  yield* parseSSEStream(response);
}

/**
 * Call the vision API without streaming.
 */
export async function callVisionAPI(textPrompt, fileBase64, mimeType = 'image/jpeg') {
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
            image_url: { url: `data:${mimeType};base64,${fileBase64}` },
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
    throw new Error(await parseApiError(response, 'Vision API'));
  }

  const result = await response.json();
  if (!result.choices?.length) throw new Error('Invalid API response: no choices returned');

  return result.choices[0].message.content;
}
