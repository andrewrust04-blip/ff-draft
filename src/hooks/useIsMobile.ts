import { useEffect, useState } from 'react';

/**
 * Tracks whether a CSS media query currently matches, updating live on
 * resize/orientation change (e.g. rotating a phone, or resizing a browser
 * window across the breakpoint).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Single shared breakpoint for the whole app: below this, we stack the
// layout, drop fixed panel heights in favor of scrollable ones, and grow
// tap targets / font sizes for touch use.
export const MOBILE_BREAKPOINT = '(max-width: 860px)';

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_BREAKPOINT);
}
