/**
 * URL content fetching.
 * Tries Jina AI Reader first, falls back to direct fetch with basic extraction.
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

/**
 * Fetch URL content. Tries Jina first, then falls back to direct fetch.
 */
export async function fetchUrlContent(url) {
  // Try Jina AI Reader first
  try {
    const result = await fetchWithJina(url);
    return result;
  } catch (jinaError) {
    console.warn('Jina fetch failed, trying direct fetch:', jinaError.message);

    // Try direct fetch as fallback
    try {
      const result = await fetchDirect(url);
      return result;
    } catch (directError) {
      // Both failed -- throw the more informative Jina error
      throw jinaError;
    }
  }
}

/**
 * Fetch via Jina AI Reader API.
 */
async function fetchWithJina(url) {
  const headers = {
    'Accept': 'text/plain',
  };

  if (config.jinaApiKey) {
    headers['Authorization'] = `Bearer ${config.jinaApiKey}`;
  }

  const response = await fetch(`https://r.jina.ai/${url}`, { headers });

  if (!response.ok) {
    // Try to extract Jina's error message from the JSON response
    let errorMsg = `Jina Reader error: ${response.status}`;
    try {
      const body = await response.json();
      if (body.readableMessage) {
        errorMsg = body.readableMessage;
      } else if (body.message) {
        errorMsg = body.message;
      }
    } catch {
      // Response wasn't JSON, use status text
      errorMsg = `Jina Reader error: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  return await response.text();
}

/**
 * Direct fetch fallback. Fetches the page HTML and extracts readable text.
 * This will only work for sites that don't block CORS.
 */
async function fetchDirect(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Direct fetch failed: ${response.status}`);
  }

  const html = await response.text();
  return extractReadableContent(html, url);
}

/**
 * Basic content extraction from HTML.
 * Strips scripts, styles, nav, footer, and extracts main text content.
 */
function extractReadableContent(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove non-content elements
  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe', 'svg',
    'nav', 'footer', 'header',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.nav', '.navbar', '.footer', '.sidebar', '.menu', '.ad', '.ads',
    '.advertisement', '.cookie', '.popup', '.modal', '.overlay',
    '#cookie', '#nav', '#footer', '#sidebar', '#menu',
  ];

  for (const selector of removeSelectors) {
    try {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    } catch {
      // Invalid selector, skip
    }
  }

  // Try to find the main content area
  const mainContent = doc.querySelector('main, article, [role="main"], .post-content, .article-content, .entry-content, #content')
    || doc.body;

  if (!mainContent) {
    throw new Error('Could not extract content from page');
  }

  // Extract text with basic structure
  const title = doc.querySelector('title')?.textContent?.trim() || '';
  const text = extractText(mainContent);

  if (!text || text.length < 50) {
    throw new Error('Extracted content too short or empty');
  }

  let result = '';
  if (title) result += `# ${title}\n\n`;
  result += `Source: ${url}\n\n`;
  result += `Markdown Content:\n${text}`;

  return result;
}

/**
 * Recursively extract text from DOM nodes, preserving basic structure.
 */
function extractText(node) {
  let text = '';

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const trimmed = child.textContent.trim();
      if (trimmed) text += trimmed + ' ';
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();

      // Skip hidden elements
      if (child.hidden || child.style?.display === 'none') continue;

      // Block-level elements get line breaks
      const blockTags = ['p', 'div', 'section', 'article', 'li', 'br', 'hr', 'tr'];
      const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

      if (headingTags.includes(tag)) {
        const level = '#'.repeat(parseInt(tag[1]));
        text += `\n\n${level} ${child.textContent.trim()}\n\n`;
      } else if (tag === 'li') {
        text += `\n- ${extractText(child).trim()}`;
      } else if (tag === 'br') {
        text += '\n';
      } else if (tag === 'hr') {
        text += '\n---\n';
      } else if (tag === 'a') {
        const href = child.getAttribute('href');
        const linkText = child.textContent.trim();
        if (href && linkText) {
          text += `[${linkText}](${href}) `;
        } else if (linkText) {
          text += linkText + ' ';
        }
      } else if (tag === 'img') {
        const alt = child.getAttribute('alt');
        if (alt) text += `[Image: ${alt}] `;
      } else if (tag === 'strong' || tag === 'b') {
        text += `**${child.textContent.trim()}** `;
      } else if (tag === 'em' || tag === 'i') {
        text += `*${child.textContent.trim()}* `;
      } else if (tag === 'code') {
        text += `\`${child.textContent.trim()}\` `;
      } else if (tag === 'pre') {
        text += `\n\`\`\`\n${child.textContent.trim()}\n\`\`\`\n`;
      } else if (tag === 'blockquote') {
        const lines = extractText(child).trim().split('\n');
        text += '\n' + lines.map(l => `> ${l}`).join('\n') + '\n';
      } else if (blockTags.includes(tag)) {
        text += '\n\n' + extractText(child);
      } else {
        text += extractText(child);
      }
    }
  }

  return text;
}
