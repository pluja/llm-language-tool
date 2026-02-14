/**
 * Jina AI Reader API for fetching URL content as readable text.
 */

export function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function fetchUrlContent(url) {
  const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL content: ${response.statusText}`);
  }
  return await response.text();
}
