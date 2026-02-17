/**
 * @file LessonTree.test.tsx
 *
 * LessonTree navigation and persistence tests.
 *
 * This suite focuses on two user-facing behaviors of the LessonTree component:
 *
 * - **Route-driven expansion**: when the current URL points to a deep lesson, the tree should
 *   automatically expand all ancestor branches so the active lesson is visible.
 * - **Persisted UI state**: when a `persistKey` is provided, expand/collapse toggles should be
 *   stored in `localStorage` and restored on the next mount (simulating a page reload).
 *
 * ## Testing strategy
 *
 * - Uses a **memory-backed Storage** implementation to avoid relying on the environment's
 *   `localStorage` and to keep tests deterministic.
 * - Updates `window.history` via `pushState` to simulate navigation without a router.
 * - Interacts with the UI using user-level events (clicking the toggle button) and asserts
 *   accessibility state via `aria-expanded` on the relevant `role="treeitem"` element.
 *
 * ## Notes
 *
 * - The helpers below intentionally fail fast with clear error messages to make DOM structure
 *   regressions obvious (e.g., a missing tree item wrapper or toggle button).
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { courseStructure } from "../../../data/course-structure";
import { LessonTree } from "../LessonTree";

/**
 * Creates an in-memory implementation of the Web Storage API.
 *
 * This is used to replace `globalThis.localStorage` during tests so they:
 * - Don't share state with other test files.
 * - Remain deterministic across environments.
 * - Avoid any quirks of the test runner's `localStorage` polyfill (if present).
 *
 * The implementation supports:
 * - `getItem`, `setItem`, `removeItem`, `clear`
 * - `key(index)` iteration
 * - `length` getter
 */
function createMemoryStorage(): Storage {
    const memory = new Map<string, string>();

    return {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
            memory.set(key, value);
        },
        removeItem: (key: string) => {
            memory.delete(key);
        },
        clear: () => {
            memory.clear();
        },
        key: (index: number) => [...memory.keys()][index] ?? null,
        get length() {
            return memory.size;
        },
    } as Storage;
}

/**
 * Simulates navigation by changing the browser history.
 *
 * LessonTree is expected to infer the "active lesson" from the current URL and expand parent
 * branches accordingly. We use `pushState` to update the path without reloading the page.
 *
 * @param path New pathname for the test.
 */
function setPath(path: string) {
    window.history.pushState({}, "test", path);
}

/**
 * Walks up the DOM tree to find the closest element representing a tree item.
 *
 * The LessonTree is expected to follow ARIA tree semantics where expandable nodes expose
 * `role="treeitem"` and use `aria-expanded` to represent their open/closed state.
 *
 * @param element Any descendant element inside the tree item (e.g., the label span).
 * @throws Error if no matching ancestor tree item exists.
 */
function closestTreeItem(element: Element): HTMLElement {
    const treeItem = element.closest("[role=\"treeitem\"]");
    if (!treeItem) {
        throw new Error("Expected element inside a tree item.");
    }
    return treeItem as HTMLElement;
}

/**
 * Retrieves the toggle button for a given tree item.
 *
 * This helper encodes a structural assumption:
 * - a direct child `div` under the tree item contains the button.
 *
 * If the component structure changes, this function will fail with a targeted error message,
 * prompting an update to the test selector.
 *
 * @param treeItem Tree item root element (role="treeitem").
 * @throws Error if the toggle button cannot be found.
 */
function getToggleButton(treeItem: HTMLElement): HTMLButtonElement {
    const button = treeItem.querySelector(":scope > div button");
    if (!button) {
        throw new Error("Expected toggle button in tree item.");
    }
    return button as HTMLButtonElement;
}

describe("LessonTree navigation behaviors", () => {
    /**
     * Storage key used by LessonTree to persist expand/collapse state.
     *
     * Using a test-specific key prevents accidental interference with other suites and makes
     * it explicit which storage entry the component should be reading/writing.
     */
    const persistKey = "test-lesson-tree";

    /**
     * Original `localStorage` reference captured so the test can restore it after each run.
     */
    let originalLocalStorage: Storage;

    beforeEach(() => {
        // Replace localStorage with a deterministic in-memory implementation.
        originalLocalStorage = globalThis.localStorage;
        Object.defineProperty(globalThis, "localStorage", {
            value: createMemoryStorage(),
            configurable: true,
            writable: true,
        });

        // Ensure clean state at the start of each test.
        localStorage.removeItem(persistKey);
    });

    afterEach(() => {
        // Clean up the rendered DOM and restore global state for isolation.
        cleanup();
        localStorage.removeItem(persistKey);

        Object.defineProperty(globalThis, "localStorage", {
            value: originalLocalStorage,
            configurable: true,
            writable: true,
        });

        vi.restoreAllMocks();
    });

    it("auto-opens parents when current path is a deep child", async () => {
        // Navigate directly to a nested lesson.
        setPath("/notes/software-libraries/scripting/should-process/");

        // Render with persistence enabled (not required for this test, but matches real usage).
        render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

        // The active child should become visible once ancestors are expanded.
        expect(
            await screen.findByText("Ensayo seguro (-WhatIf/-Confirm)"),
        ).toBeInTheDocument();

        // A sibling should also be visible because the parent branch is expanded.
        expect(screen.getByText("Primer script")).toBeInTheDocument();

        // The ancestor section label should be visible (expanded container).
        expect(screen.getByText("Scripting")).toBeInTheDocument();
    });

    it("persists expand/collapse toggles via localStorage when persistKey is provided", async () => {
        const user = userEvent.setup();

        // Start from a known path to ensure a consistent initial expansion state.
        setPath("/notes/software-libraries/scripting/should-process/");

        const { unmount } = render(
            <LessonTree lessons={courseStructure} persistKey={persistKey} />,
        );

        // Locate the section label (span) so we can derive the owning tree item.
        const sectionLabel = await screen.findByText("Pipelines", {
            selector: "span",
        });

        const containerItem = closestTreeItem(sectionLabel);
        const toggleBtn = getToggleButton(containerItem);

        // Capture initial ARIA expansion state.
        const initialExpanded = containerItem.getAttribute("aria-expanded");

        // Toggle the section (expand/collapse).
        await user.click(toggleBtn);

        // The expansion state should change immediately after the interaction.
        expect(containerItem.getAttribute("aria-expanded")).not.toBe(initialExpanded);

        // Record the new state for later comparison.
        const toggledExpanded = containerItem.getAttribute("aria-expanded");

        // Verify that the component persisted state into localStorage.
        const persistedRaw = localStorage.getItem(persistKey);
        expect(persistedRaw).not.toBeNull();
        expect(() => JSON.parse(persistedRaw!)).not.toThrow();

        // Simulate a full reload by unmounting and mounting again.
        unmount();

        render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

        // Re-locate the same section after remount.
        const sectionLabel2 = await screen.findByText("Pipelines", {
            selector: "span",
        });
        const containerItem2 = closestTreeItem(sectionLabel2);

        // Restore may occur in effects, so wait until the persisted state is applied.
        await waitFor(() => {
            expect(containerItem2.getAttribute("aria-expanded")).toBe(toggledExpanded);
        });

        // Verify toggling still works after restore.
        const toggleBtn2 = getToggleButton(containerItem2);
        await user.click(toggleBtn2);

        // The state should switch away from the restored persisted value.
        expect(containerItem2.getAttribute("aria-expanded")).not.toBe(toggledExpanded);
    });
});
