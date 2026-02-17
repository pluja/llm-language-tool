import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true,
  gfm: true,
});

const markdownConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote',
    'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
    'div', 'span',
    'img',
    'details', 'summary',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title',
    'class', 'id', 'name',
    'target', 'rel',
    'colspan', 'rowspan',
    'open',
  ],
};

export function parseMarkdown(text) {
  if (!text) return '';
  const html = marked.parse(text);
  return DOMPurify.sanitize(html, markdownConfig);
}

export { marked, DOMPurify };
