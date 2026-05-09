/**
 * Test controls for the highlighter cache.
 *
 * These are package-internal utilities not exported from the root API.
 */

import type { Store } from "../highlighter/types";
import type { Highlighter } from "shiki";

/**
 * Creates a test-friendly store that can be manipulated.
 */
export function createTestableStore<T>(create?: () => Promise<T>): Store<T> {
    return {
        get: async () => {
            if (!create) {
                throw new Error("No factory provided to testable store");
            }
            return create();
        },
        reset: () => {},
        setForTests: () => {},
    };
}
