/**
 * `#anchor` links don't work under HashRouter — the router intercepts the
 * hash change and tries to match the path, blanking the page. This helper
 * returns an onClick handler that does a manual smooth scroll and keeps
 * the URL unchanged (no history entry).
 *
 * Usage:
 *   <a href="#download" onClick={scrollToAnchor('download')}>...</a>
 *
 * Leaving the `href` in place keeps the middle-click / right-click →
 * "copy link address" behaviour and keeps the button semantic.
 */
import type { MouseEvent } from 'react';

export function scrollToAnchor(
  id: string,
): (e: MouseEvent<HTMLAnchorElement>) => void {
  return (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) {
      // Graceful fallback: if the section isn't mounted yet, let the
      // native anchor try (it won't do anything visible but at least the
      // URL won't be left in a broken state).
      console.warn(`[scrollToAnchor] no element with id="${id}"`);
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}
