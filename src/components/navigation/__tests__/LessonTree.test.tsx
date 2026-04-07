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
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
    const treeItem = element.closest('[role="treeitem"]');
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

/**
 * LessonTree component behaviors contract.
 *
 * The suite protects two distinct user-facing behaviors:
 *
 * - **Route-driven expansion**: When navigating to a deep lesson, the tree automatically expands
 *   all ancestor branches to reveal the currently active page.
 * - **Persisted UI state**: When a `persistKey` is provided, expand/collapse toggles are stored in
 *   `localStorage` and restored on component remount (simulating a page reload).
 * - **Accessibility**: Active navigation targets are marked with `aria-current="page"` and styled
 *   accordingly, even during client-side navigation.
 * - **Styling scoping**: Hover effects on child links do not leak to parent tree items via
 *   shared group selectors.
 */
describe("LessonTree", () => {
    /**
     * Storage key used by LessonTree to persist expand/collapse state.
     *
     * Using a consistent test-specific key prevents interference with other suites and documents
     * which storage entry the component reads and writes.
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

    describe("given the current page is a deep child in the lesson tree", () => {
        describe("when the component is rendered", () => {
            test("then all ancestor sections are expanded to show the active page", async () => {
                    setPath("/notes/software-libraries/api-design/fundamentals/");

                    render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

                    // The active child should be visible after ancestors expand.
                    expect(
                        await screen.findByText("Diseñar la API desde el dominio"),
                    ).toBeInTheDocument();

                    // Ancestor section label is visible (expanded container).
                    expect(screen.getByText("Principios de diseño de APIs")).toBeInTheDocument();
            });
        });
    });

    describe("given expand/collapse toggles with persistence enabled", () => {
        describe("when a toggle button is clicked", () => {
            test("then the expansion state changes immediately", async () => {
                const user = userEvent.setup();

                setPath("/notes/software-libraries/api-design/fundamentals/");
                render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

                const sectionLabel = await screen.findByText("Principios de diseño de APIs");
                const containerItem = closestTreeItem(sectionLabel);
                const toggleBtn = getToggleButton(containerItem);

                const initialExpanded = containerItem.getAttribute("aria-expanded");
                await user.click(toggleBtn);

                expect(containerItem.getAttribute("aria-expanded")).not.toBe(initialExpanded);
            });

            test("then the new state is persisted to localStorage", async () => {
                const user = userEvent.setup();

                setPath("/notes/software-libraries/api-design/fundamentals/");
                render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

                const sectionLabel = await screen.findByText("Principios de dise\u00f1o de APIs");
                const containerItem = closestTreeItem(sectionLabel);
                const toggleBtn = getToggleButton(containerItem);

                await user.click(toggleBtn);

                const persistedRaw = localStorage.getItem(persistKey);
                expect(persistedRaw).not.toBeNull();
                expect(() => JSON.parse(persistedRaw!)).not.toThrow();
            });
        });

        describe("when the component remounts after the state was persisted", () => {
            test("then the persisted toggle state is restored", async () => {
                const user = userEvent.setup();

                setPath("/notes/software-libraries/api-design/fundamentals/");
                const { unmount } = render(
                    <LessonTree lessons={courseStructure} persistKey={persistKey} />,
                );

                const sectionLabel = await screen.findByText("Principios de dise\u00f1o de APIs");
                const containerItem = closestTreeItem(sectionLabel);
                const toggleBtn = getToggleButton(containerItem);

                await user.click(toggleBtn);
                const toggledExpanded = containerItem.getAttribute("aria-expanded");

                // Unmount and remount to simulate page reload.
                unmount();
                render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

                const sectionLabel2 = await screen.findByText("Principios de dise\u00f1o de APIs");
                const containerItem2 = closestTreeItem(sectionLabel2);

                await waitFor(() => {
                    expect(containerItem2.getAttribute("aria-expanded")).toBe(toggledExpanded);
                });
            });

            test("then toggling still works after restore", async () => {
                const user = userEvent.setup();

                setPath("/notes/software-libraries/api-design/fundamentals/");
                const { unmount } = render(
                    <LessonTree lessons={courseStructure} persistKey={persistKey} />,
                );

                const sectionLabel = await screen.findByText("Principios de dise\u00f1o de APIs");
                const containerItem = closestTreeItem(sectionLabel);
                const toggleBtn = getToggleButton(containerItem);

                await user.click(toggleBtn);
                const toggledExpanded = containerItem.getAttribute("aria-expanded");

                unmount();
                render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

                const sectionLabel2 = await screen.findByText("Principios de dise\u00f1o de APIs");
                const containerItem2 = closestTreeItem(sectionLabel2);

                await waitFor(() => {
                    expect(containerItem2.getAttribute("aria-expanded")).toBe(toggledExpanded);
                });

                const toggleBtn2 = getToggleButton(containerItem2);
                await user.click(toggleBtn2);

                expect(containerItem2.getAttribute("aria-expanded")).not.toBe(toggledExpanded);
            });
        });
    });

    describe("given a rendered lesson tree", () => {
        describe("when hover styling is applied to child links", () => {
            test("then hover classes are scoped to the link, not the parent tree item", async () => {
                setPath("/notes/installation/");
                render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

                const sectionLabel = await screen.findByText("Principios de diseño de APIs");
                const sectionTreeItem = closestTreeItem(sectionLabel);
                const childLink = await screen.findByRole("link", { name: "Dise\u00f1ar la API desde el dominio" });

                expect(sectionTreeItem.className).not.toContain("group");
                expect(childLink.className).toContain("hover:bg-base-border/10");
                expect(childLink.className).toContain("hover:text-primary");
                expect(childLink.className).not.toContain("group-hover");
                expect(sectionLabel.className).not.toContain("group-hover");
            });
        });
    });

    describe("given initial navigation to a lesson page", () => {
        describe("when the tree is rendered", () => {
            test("then the active lesson is marked with aria-current without waiting for effects", async () => {
                setPath("/notes/software-libraries/api-design/fundamentals/");
                render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

                const activeLink = await screen.findByRole("link", { name: "Diseñar la API desde el dominio" });

                expect(activeLink).toHaveAttribute("aria-current", "page");
                expect(activeLink.className).toContain("bg-primary/15");
            });
        });
    });

    describe("given the component is mounted and the user navigates internally", () => {
        describe("when the pathname changes and a popstate event fires", () => {
            test("then the active lesson indicator updates to the new path", async () => {
                setPath("/notes/software-libraries/api-design/fundamentals/");
                render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

                const initialActive = await screen.findByRole("link", { name: "Diseñar la API desde el dominio" });
                expect(initialActive).toHaveAttribute("aria-current", "page");

                setPath("/notes/installation/");
                window.dispatchEvent(new PopStateEvent("popstate"));

                await waitFor(() => {
                    expect(
                        screen.getByRole("link", { name: "Herramientas necesarias y recomendadas" }),
                    ).toHaveAttribute("aria-current", "page");
                });

                expect(initialActive).not.toHaveAttribute("aria-current", "page");
            });
        });
    });
});
