import { marked } from 'marked';
import DOMPurify from 'dompurify';
marked.setOptions({ gfm: true, breaks: true });
export function renderMd(md: string): string {
  return DOMPurify.sanitize(marked.parse(md || '', { async: false }) as string);
}
