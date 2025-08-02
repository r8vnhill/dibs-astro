import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener
      ? mql.addEventListener("change", listener)
      : mql.addListener(listener);
    setMatches(mql.matches);
    return () => {
      mql.removeEventListener
        ? mql.removeEventListener("change", listener)
        : mql.removeListener(listener);
    };
  }, [query]);

  return matches;
}
