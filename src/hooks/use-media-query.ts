import { useEffect, useState } from "react";

type LegacyMediaQueryList = {
    // These signatures exist in older DOM typings; we keep them optional and call them only when the modern
    // addEventListener APIs are not present.
    addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

/*
 * Small React hook that tracks a CSS media query and returns whether it currently matches. Key
 * considerations:
 *
 * - SSR safe: during server-side rendering window is undefined, so the initial state returns `false` to avoid
 *   hydration mismatches.
 * - Modern API preferred: `MediaQueryList.addEventListener/removeEventListener` are used when available. Older
 *   browsers expose the deprecated `addListener/removeListener` API — we fall back to those methods when necessary.
 * - Cleanup: the effect removes the listener on unmount or when `query` changes.
 *
 * Edge cases and behavior:
 * - Calling this hook during SSR returns `false`. Consumers should account for this if they need deterministic
 *   server-side rendering of layout.
 * - The listener receives a `MediaQueryListEvent` and updates state with `event.matches`.
 */
export function useMediaQuery(query: string): boolean {
    // Initial state: false during SSR, otherwise the current match status.
    const [matches, setMatches] = useState(() => {
        if (!isClientSide()) return false;
        return createMediaQueryList(query).matches;
    });

    useEffect(() => {
        const mql = createMediaQueryList(query);
        const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

        addMediaQueryChangeListener(mql, listener);

        // Immediately synchronize the state with the current match value.
        setMatches(mql.matches);

        return () => removeMediaQueryChangeListener(mql, listener);
    }, [query]);

    return matches;
}

/* Helper utilities ---------------------------------------------------- */

/**
 * Small predicate to detect client-side execution (i.e. not SSR).
 */
function isClientSide(): boolean {
    return typeof window !== "undefined";
}

/**
 * Create a MediaQueryList for the provided query. Wrapping this in a helper keeps `useMediaQuery` focused on effect
 * logic and makes testing easier.
 */
function createMediaQueryList(query: string): MediaQueryList {
    return window.matchMedia(query);
}

/**
 * Install a change listener on a MediaQueryList. Prefers the modern addEventListener API and falls back to the legacy
 * addListener when not available. The casting to LegacyMediaQueryList is constrained to this helper so the rest of the
 * hook avoids deprecated signatures.
 */
function addMediaQueryChangeListener(
    mql: MediaQueryList,
    listener: (e: MediaQueryListEvent) => void,
) {
    const legacy = mql as LegacyMediaQueryList;
    if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", listener);
    } else {
        legacy.addListener?.(listener);
    }
}

/**
 * Remove a previously installed change listener using the matching modern/legacy removal API.
 */
function removeMediaQueryChangeListener(
    mql: MediaQueryList,
    listener: (e: MediaQueryListEvent) => void,
) {
    const legacy = mql as LegacyMediaQueryList;
    if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", listener);
    } else {
        legacy.removeListener?.(listener);
    }
}
